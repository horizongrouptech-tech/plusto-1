import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * נרמול וטעינת נתוני תחזית לישויות
 * כולל מיפוי אוטומטי או ידני של עמודות
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { forecast_id, parsed_sheets, mapping_profile_id } = await req.json();

        if (!forecast_id || !parsed_sheets) {
            return Response.json({ 
                error: 'Missing required fields' 
            }, { status: 400 });
        }

        // קבלת פרופיל המיפוי אם קיים
        let mappingProfile = null;
        if (mapping_profile_id) {
            mappingProfile = await base44.asServiceRole.entities.ManualForecastMappingProfile.get(mapping_profile_id);
        }

        const allRowsToInsert = [];
        const createdSheets = [];

        for (const sheetData of parsed_sheets) {
            // יצירת רשומת גיליון
            const sheetRecord = await base44.asServiceRole.entities.ManualForecastSheet.create({
                forecast_id,
                sheet_name: sheetData.sheet_name,
                sheet_index: sheetData.sheet_index,
                header_row_index: sheetData.header_row_index,
                original_columns: sheetData.original_columns,
                row_count: sheetData.row_count
            });

            createdSheets.push(sheetRecord);

            // מיפוי עמודות (אוטומטי או מפרופיל)
            const columnMapping = mappingProfile 
                ? mappingProfile.mappings 
                : autoMapColumns(sheetData.original_columns, sheetData.column_types);

            // נרמול כל שורה
            for (let rowIdx = 0; rowIdx < sheetData.data_rows.length; rowIdx++) {
                const rawRow = sheetData.data_rows[rowIdx];
                const normalizedRow = normalizeRow(
                    rawRow, 
                    sheetData.original_columns,
                    sheetData.column_types,
                    columnMapping,
                    forecast_id,
                    sheetRecord.id,
                    rowIdx
                );

                if (normalizedRow) {
                    allRowsToInsert.push(normalizedRow);
                }
            }
        }

        // טעינה מסיבית של כל השורות
        if (allRowsToInsert.length > 0) {
            await base44.asServiceRole.entities.ManualForecastRow.bulkCreate(allRowsToInsert);
        }

        // עדכון סטטוס התחזית
        await base44.asServiceRole.entities.ManualForecast.update(forecast_id, {
            status: 'ready',
            sheet_count: parsed_sheets.length
        });

        return Response.json({
            success: true,
            forecast_id,
            sheets_created: createdSheets.length,
            rows_inserted: allRowsToInsert.length
        });

    } catch (error) {
        console.error('Error normalizing forecast:', error);
        
        // עדכון סטטוס לשגיאה
        try {
            const base44 = createClientFromRequest(req);
            const { forecast_id } = await req.json();
            await base44.asServiceRole.entities.ManualForecast.update(forecast_id, {
                status: 'error',
                error_message: error.message
            });
        } catch (updateError) {
            console.error('Failed to update error status:', updateError);
        }

        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});

/**
 * מיפוי אוטומטי של עמודות לפי כינויים בעברית ואנגלית
 */
function autoMapColumns(headers, columnTypes) {
    const aliases = {
        period_month: ['date', 'month', 'תאריך', 'חודש', 'תקופה', 'period'],
        category: ['category', 'dept', 'department', 'segment', 'קטגוריה', 'מחלקה', 'סוג'],
        subcategory: ['subcategory', 'sub category', 'תת קטגוריה', 'תת-קטגוריה'],
        revenue: ['revenue', 'income', 'sales', 'הכנסות', 'מחזור', 'הכנסה'],
        expenses: ['expenses', 'expense', 'cost', 'costs', 'הוצאות', 'עלות', 'הוצאה'],
        profit: ['profit', 'net profit', 'רווח', 'רווח נקי', 'רווח גולמי'],
        notes: ['notes', 'note', 'comment', 'remarks', 'הערות', 'הערה']
    };

    const mapping = {};

    headers.forEach((header, idx) => {
        if (!header) return;
        
        const headerLower = header.toString().toLowerCase().trim();

        for (const [targetField, aliasList] of Object.entries(aliases)) {
            for (const alias of aliasList) {
                if (headerLower.includes(alias.toLowerCase())) {
                    if (!mapping[targetField]) {
                        mapping[targetField] = [];
                    }
                    mapping[targetField].push(idx);
                    break;
                }
            }
        }
    });

    return mapping;
}

/**
 * נרמול שורה בודדת
 */
function normalizeRow(rawRow, headers, columnTypes, columnMapping, forecastId, sheetId, rowIdx) {
    const normalized = {
        forecast_id: forecastId,
        sheet_id: sheetId,
        row_index: rowIdx,
        source_columns: {},
        extra: {}
    };

    // שמירת ערכים מקוריים
    headers.forEach((header, idx) => {
        if (rawRow[idx] !== null && rawRow[idx] !== undefined) {
            normalized.source_columns[header] = rawRow[idx];
        }
    });

    // מיפוי לשדות יעד
    for (const [targetField, sourceIndices] of Object.entries(columnMapping)) {
        if (!sourceIndices || sourceIndices.length === 0) continue;

        // אם יש כמה עמודות ממופות לאותו שדה, נסכם אותן (עבור revenue/expenses)
        if (sourceIndices.length > 1 && ['revenue', 'expenses'].includes(targetField)) {
            let sum = 0;
            for (const idx of sourceIndices) {
                const value = parseNumeric(rawRow[idx]);
                if (!isNaN(value)) sum += value;
            }
            normalized[targetField] = sum;
        } else {
            // שדה בודד
            const sourceIdx = sourceIndices[0];
            const rawValue = rawRow[sourceIdx];

            if (targetField === 'period_month') {
                normalized[targetField] = normalizeDate(rawValue);
            } else if (['revenue', 'expenses', 'profit'].includes(targetField)) {
                normalized[targetField] = parseNumeric(rawValue);
            } else {
                normalized[targetField] = rawValue?.toString() || null;
            }
        }
    }

    // חישוב רווח אם חסר
    if (!normalized.profit && normalized.revenue !== undefined && normalized.expenses !== undefined) {
        normalized.profit = (normalized.revenue || 0) - (normalized.expenses || 0);
    }

    // העתקת עמודות שלא מופו ל-extra
    headers.forEach((header, idx) => {
        const isMapped = Object.values(columnMapping).some(indices => indices.includes(idx));
        if (!isMapped && rawRow[idx] !== null && rawRow[idx] !== undefined) {
            normalized.extra[header] = rawRow[idx];
        }
    });

    return normalized;
}

/**
 * נרמול תאריך ליום ראשון של החודש
 */
function normalizeDate(value) {
    if (!value) return null;

    try {
        let date;
        
        if (value instanceof Date) {
            date = value;
        } else if (typeof value === 'string') {
            date = new Date(value);
        } else if (typeof value === 'number') {
            // Excel serial date
            date = new Date((value - 25569) * 86400 * 1000);
        }

        if (date && !isNaN(date.getTime())) {
            // החזרת היום הראשון של החודש
            return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
        }
    } catch (error) {
        console.error('Date normalization error:', error);
    }

    return null;
}

/**
 * המרת ערך למספר (ניקוי סימנים מיוחדים)
 */
function parseNumeric(value) {
    if (typeof value === 'number') return value;
    if (!value) return null;

    const cleaned = value.toString()
        .replace(/[₪$€£¥,\s]/g, '')
        .replace(/%/g, '')
        .trim();

    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}