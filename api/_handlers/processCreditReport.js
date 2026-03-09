import { requireAuth, supabaseAdmin, extractDataFromFile } from '../_helpers.js';

const creditReportSchema = {
  type: 'object',
  properties: {
    reportMeta: {
      type: 'object',
      properties: {
        subjectFullName: { type: 'string' },
        nationalId: { type: 'string' },
        customerType: { type: 'string' },
        dataCollectionStartDate: { type: 'string' },
        reportIssueDate: { type: 'string' },
        sourceSystem: { type: 'string', default: 'BankOfIsraelCreditData' },
      },
    },
    summary: {
      type: 'object',
      properties: {
        totalDebtILS: { type: 'number' },
        totalDebtExMortgageILS: { type: 'number' },
        totalLoansCount: { type: 'integer' },
        totalActiveDealsCount: { type: 'integer' },
        totalGuaranteeDealsCount: { type: 'integer' },
        totalGuaranteeExposureILS: { type: 'number' },
        lenders: { type: 'array', items: { type: 'string' } },
      },
    },
    currentAccounts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          bankName: { type: 'string' },
          dealId: { type: 'string' },
          branchNumber: { type: 'string' },
          accountType: { type: 'string' },
          isGuarantor: { type: 'boolean' },
          creditLimit: { type: 'number' },
          currentBalance: { type: 'number' },
          notPaidOnTime: { type: 'number' },
          status: { type: 'string' },
          currency: { type: 'string' },
          lastUpdateDate: { type: 'string' },
          interestRates: { type: 'array' },
          checksReturned: { type: 'object' },
          directDebitReturned: { type: 'object' },
        },
      },
    },
    loans: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          bankName: { type: 'string' },
          dealId: { type: 'string' },
          branchNumber: { type: 'string' },
          loanType: { type: 'string' },
          isGuarantor: { type: 'boolean' },
          guarantorLevel: { type: 'string' },
          originalPrincipal: { type: 'number' },
          currentBalance: { type: 'number' },
          monthlyPayment: { type: 'number' },
          paymentType: { type: 'string' },
          status: { type: 'string' },
          purpose: { type: 'string' },
          currency: { type: 'string' },
          startDate: { type: 'string' },
          plannedEndDate: { type: 'string' },
          lastPaymentDate: { type: 'string' },
          lastUpdateDate: { type: 'string' },
          interestTracks: { type: 'array' },
          collateral: { type: 'array' },
        },
      },
    },
    mortgages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          bankName: { type: 'string' },
          dealId: { type: 'string' },
          branchNumber: { type: 'string' },
          originalPrincipal: { type: 'number' },
          currentBalance: { type: 'number' },
          monthlyPayment: { type: 'number' },
          paymentType: { type: 'string' },
          status: { type: 'string' },
          purpose: { type: 'string' },
          startDate: { type: 'string' },
          plannedEndDate: { type: 'string' },
          lastUpdateDate: { type: 'string' },
          interestTracks: { type: 'array' },
          collateral: { type: 'array' },
        },
      },
    },
    guarantees: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          bankName: { type: 'string' },
          dealId: { type: 'string' },
          guaranteeAmount: { type: 'number' },
          status: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          relatedCorporation: { type: 'string' },
        },
      },
    },
    creditInquiries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          inquiryDate: { type: 'string' },
          inquirer: { type: 'string' },
          purpose: { type: 'string' },
        },
      },
    },
    analysis: {
      type: 'object',
      properties: {
        riskScore: { type: 'integer', minimum: 1, maximum: 10 },
        creditUtilization: { type: 'number' },
        totalChecksReturned: { type: 'integer' },
        totalDirectDebitReturned: { type: 'integer' },
        guarantorExposure: { type: 'number' },
        strengths: { type: 'array', items: { type: 'string' } },
        weaknesses: { type: 'array', items: { type: 'string' } },
        recommendations: { type: 'array', items: { type: 'string' } },
        redFlags: { type: 'array', items: { type: 'string' } },
      },
    },
  },
};

const CREDIT_REPORT_PROMPT = `אתה מומחה בניתוח דוחות ריכוז נתונים מבנק ישראל. משימתך: חילוץ מלא ומקיף של כל הנתונים מהדוח.

חשוב:
- חלץ את כל הסעיפים: מטא-דטה, סיכום, חשבונות עו"ש, הלוואות, משכנתאות, ערבויות, פניות לשכות אשראי
- ספור החזרות שיקים והוראות קבע
- חשב ציון סיכון 1-10, אחוז ניצול מסגרות, חשיפה כערב
- כל הטקסט בעברית
- אם שדה לא קיים בדוח — החזר null או מערך ריק

החזר JSON תקני בלבד.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { file_url, file_id, customer_email } = req.body ?? {};
    if (!file_url) {
      return res.status(400).json({ success: false, error: 'file_url is required' });
    }

    const extractionResult = await extractDataFromFile({
      file_url,
      json_schema: creditReportSchema,
      prompt: CREDIT_REPORT_PROMPT,
    });

    if (extractionResult.status !== 'success' || !extractionResult.output) {
      const msg = extractionResult.error || 'Failed to extract data from credit report';
      if (file_id) {
        await supabaseAdmin
          .from('file_upload')
          .update({ status: 'failed', analysis_notes: msg })
          .eq('id', file_id);
      }
      return res.status(500).json({ success: false, error: msg });
    }

    const extracted = extractionResult.output;
    const companyName = extracted?.reportMeta?.subjectFullName || 'לא זוהה';

    if (file_id) {
      await supabaseAdmin
        .from('file_upload')
        .update({
          status: 'analyzed',
          data_category: 'credit_report',
          parsed_data: {
            summary: extracted.summary || {},
            reportMeta: extracted.reportMeta || {},
            currentAccounts: extracted.currentAccounts || [],
            loans: extracted.loans || [],
            mortgages: extracted.mortgages || [],
            guarantees: extracted.guarantees || [],
            creditInquiries: extracted.creditInquiries || [],
          },
          ai_insights: extracted,
          analysis_notes: `דוח ריכוז נתונים נותח בהצלחה עבור ${companyName}`,
        })
        .eq('id', file_id);
    }

    return res.status(200).json({
      success: true,
      data: extracted,
      message: 'דוח ריכוז נתונים נותח בהצלחה',
    });
  } catch (e) {
    console.error('[processCreditReport]', e);
    const msg = e.message || 'שגיאה בעיבוד דוח אשראי';
    if (req.body?.file_id) {
      await supabaseAdmin
        .from('file_upload')
        .update({ status: 'failed', analysis_notes: msg })
        .eq('id', req.body.file_id)
        .catch(() => {});
    }
    return res.status(500).json({ success: false, error: msg });
  }
}
