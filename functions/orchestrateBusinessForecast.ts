
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// פונקציית עזר לחישוב סכום חודשי
const getMonthlyAmount = (item, monthIndex) => {
    if (item.is_annual_total) return (item.amount || 0) / 12;
    if (item.monthly_amounts && item.monthly_amounts[monthIndex] !== undefined) return item.monthly_amounts[monthIndex];
    return item.amount || 0;
};

// פונקציית עזר לבניית מבנה התחזית המלא
function buildFullForecastStructure(salesData, employeesData, expensesData, servicesData, forecast_name, forecast_year, strategicInput) {
    console.log('Building forecast structure with:', {
        hasSalesData: !!salesData,
        hasEmployeesData: !!employeesData,
        hasExpensesData: !!expensesData,
        servicesCount: servicesData?.length || 0
    });

    const services_data = servicesData.map(p => ({
        service_name: p.service_name || p.product_name,
        cost_price: p.cost_price || 0,
        selling_price: p.selling_price || 0,
        category: p.category || 'כללי',
        supplier: p.supplier || 'לא ידוע',
        gross_margin_percentage: p.selling_price && p.cost_price ? Math.round(((p.selling_price - p.cost_price) / p.selling_price) * 100) : 0
    }));

    // בניית תחזית מכירות חודשית
    let monthly_forecasts = [];
    if (salesData && salesData.sales_forecast) {
        const aiSalesMap = new Map(salesData.sales_forecast.map(item => [item.product_name, item.monthly_quantities]));
        
        monthly_forecasts = servicesData.map(product => {
            const productName = product.service_name || product.product_name;
            const quantities = aiSalesMap.get(productName) || Array(12).fill(0);
            const totalYearly = quantities.reduce((sum, q) => sum + q, 0);
            return {
                service_name: productName,
                jan: quantities[0], feb: quantities[1], mar: quantities[2],
                apr: quantities[3], may: quantities[4], jun: quantities[5],
                jul: quantities[6], aug: quantities[7], sep: quantities[8],
                oct: quantities[9], nov: quantities[10], dec: quantities[11],
                total_yearly: totalYearly
            };
        });
    } else {
        // אם אין נתוני מכירות מ-AI, ניצור תחזית בסיסית
        monthly_forecasts = servicesData.map(product => ({
            service_name: product.service_name || product.product_name,
            jan: 10, feb: 10, mar: 10, apr: 10, may: 10, jun: 10,
            jul: 10, aug: 10, sep: 10, oct: 10, nov: 10, dec: 10,
            total_yearly: 120
        }));
    }

    // בניית נתוני עובדים
    const global_employees_data = (employeesData?.employees || []).map(emp => ({
        employee_role: emp.role,
        job_type: 'full_time',
        base_salary: emp.salary,
        salary_addition_percentage: 25,
        monthly_total_cost: emp.salary * 1.25,
        start_month: 1
    }));

    const planned_employee_hires = (employeesData?.new_hires || []).map(hire => ({
        role: hire.role,
        count: hire.count,
        month_of_hire: hire.hire_month,
        estimated_monthly_salary: hire.monthly_salary
    }));

    // בניית נתוני הוצאות
    const detailed_expenses = {
        marketing_sales: (expensesData?.monthly_expenses?.marketing_sales || []).map(exp => ({
            name: exp.name,
            amount: exp.monthly_amount,
            monthly_amounts: Array(12).fill(exp.monthly_amount),
            is_annual_total: false
        })),
        admin_general: (expensesData?.monthly_expenses?.admin_general || []).map(exp => ({
            name: exp.name,
            amount: exp.monthly_amount,
            monthly_amounts: Array(12).fill(exp.monthly_amount),
            is_annual_total: false
        }))
    };

    const other_costs = {
        tax_rate: expensesData?.tax_rate || 23
    };

    // חישובי רווח והפסד
    let total_revenue = 0;
    let total_cogs = 0;
    monthly_forecasts.forEach(forecast => {
        const product = servicesData.find(p => (p.service_name || p.product_name) === forecast.service_name);
        if (product) {
            total_revenue += forecast.total_yearly * (product.selling_price || 0);
            total_cogs += forecast.total_yearly * (product.cost_price || 0);
        }
    });

    const gross_profit = total_revenue - total_cogs;

    let totalEmployeeCosts = global_employees_data.reduce((sum, emp) => sum + emp.monthly_total_cost * 12, 0);
    planned_employee_hires.forEach(hire => {
        const months_active = 12 - hire.month_of_hire + 1;
        totalEmployeeCosts += hire.count * hire.estimated_monthly_salary * 1.25 * months_active;
    });

    const totalMarketingExpenses = detailed_expenses.marketing_sales.reduce((sum, exp) => sum + (exp.amount * 12), 0);
    const totalAdminExpenses = detailed_expenses.admin_general.reduce((sum, exp) => sum + (exp.amount * 12), 0);
    const total_expenses = totalEmployeeCosts + totalMarketingExpenses + totalAdminExpenses;

    const operational_profit = gross_profit - total_expenses;
    const tax_amount = Math.max(0, operational_profit * (other_costs.tax_rate / 100));
    const net_profit = operational_profit - tax_amount;
    
    const profit_loss_summary = {
        total_revenue: Math.round(total_revenue),
        total_cogs: Math.round(total_cogs),
        gross_profit: Math.round(gross_profit),
        total_expenses: Math.round(total_expenses),
        operational_profit: Math.round(operational_profit),
        tax_amount: Math.round(tax_amount),
        net_profit: Math.round(net_profit)
    };

    // הוספת נתונים אסטרטגיים לתחזית
    const user_strategic_input_text = strategicInput ? `
חזון: ${strategicInput.vision_for_next_year || 'לא סופק'}
יעד הכנסות חודשי: ₪${strategicInput.desired_monthly_revenue?.toLocaleString() || 'לא הוגדר'}
יעד רווח חודשי: ₪${strategicInput.desired_monthly_net_profit?.toLocaleString() || 'לא הוגדר'}
יעד אישי לקיחה הביתה: ₪${strategicInput.personal_take_home_pay_goal?.toLocaleString() || 'לא הוגדר'}
    ` : null;

    return {
        services_data,
        global_employees_data,
        other_costs,
        detailed_expenses,
        sales_forecast_data: {
            working_days_per_month: 22,
            monthly_forecasts
        },
        profit_loss_summary,
        planned_employee_hires,
        user_strategic_input_text
    };
}

Deno.serve(async (req) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    const base44 = createClientFromRequest(req);
    
    if (!(await base44.auth.isAuthenticated())) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
    
    let processRecord = null;
    console.log('=== Starting Business Forecast Orchestration (Goal-Oriented) ===');

    try {
        if (req.method !== 'POST') throw new Error('Method not allowed');

        const requestData = await req.json();
        console.log('Received request data:', {
            customer_email: requestData.customer_email,
            forecast_name: requestData.forecast_name,
            forecast_year: requestData.forecast_year,
            forecastType: requestData.forecastType,
            services_data_count: requestData.services_data?.length || 0,
            has_strategic_input: !!requestData.strategicInput
        });

        const { forecast_id, forecast_name, forecast_year, forecastType, strategicInput, services_data, customer_email } = requestData;

        // ולידציה מקיפה של שדות חובה
        if (!customer_email) {
            throw new Error('חסר אימייל לקוח (customer_email)');
        }
        if (!forecast_year || isNaN(parseInt(forecast_year))) {
            throw new Error('שנת תחזית חסרה או לא תקינה (forecast_year)');
        }
        if (!forecast_name || forecast_name.trim() === '') {
            throw new Error('שם תחזית חסר (forecast_name)');
        }
        if (!services_data || !Array.isArray(services_data) || services_data.length === 0) {
            throw new Error('לא התקבלו נתוני מוצרים/שירותים. יש להוסיף לפחות מוצר אחד לפני יצירת תחזית.');
        }
        if (!forecastType) {
            throw new Error('חסר סוג תחזית (forecastType: conservative/optimistic)');
        }

        // בדיקת תקינות נתוני מוצרים
        const invalidProducts = services_data.filter(p => !p.service_name || (!p.cost_price && !p.selling_price));
        if (invalidProducts.length > 0) {
            throw new Error(`נמצאו ${invalidProducts.length} מוצרים עם נתונים חסרים. כל מוצר חייב שם ולפחות מחיר אחד.`);
        }

        // יצירת רשומת תהליך
        processRecord = await base44.asServiceRole.entities.ProcessStatus.create({
            customer_email,
            process_type: 'forecast_generation',
            related_entity_id: forecast_id || 'new',
            status: 'running',
            progress: 5,
            current_step: 'מתחיל יצירת תחזית מבוססת AI...',
            started_at: new Date().toISOString()
        });

        // ===== תיקון קריטי: חיפוש גם ב-OnboardingRequest =====
        let users = await base44.asServiceRole.entities.User.filter({ email: customer_email });
        let user = users[0];
        
        // אם לא נמצא ב-User, נחפש ב-OnboardingRequest
           // אם לא נמצא ב-User, נחפש ב-OnboardingRequest
        if (!user) {
            console.log(`User not found in User table, searching in OnboardingRequest...`);
            // נטען רשימה של בקשות אונבורדינג ונסנן ידנית
            // ניתן להגביל את כמות הרשומות אם צפוי מספר גדול מאוד של בקשות אונבורדינג
            const allOnboardingRequests = await base44.asServiceRole.entities.OnboardingRequest.list();
            const onboardingRequest = allOnboardingRequests.find(req => req.email === customer_email);
            
            if (!onboardingRequest) {
                throw new Error(`Customer with email ${customer_email} not found in User or OnboardingRequest tables.`);
            }
            
            console.log('Found customer in OnboardingRequest, creating user object from onboarding data');
            // נבנה אובייקט user מנתוני ה-OnboardingRequest
            user = {
                email: onboardingRequest.email,
                full_name: onboardingRequest.full_name,
                business_name: onboardingRequest.business_name,
                business_type: onboardingRequest.business_type,
                company_size: onboardingRequest.company_size,
                monthly_revenue: onboardingRequest.monthly_revenue,
                is_onboarding_customer: true // דגל שזה לקוח בתהליך אונבורדינג
            };
        }
        
        console.log('User data loaded:', { 
            business_name: user.business_name, 
            business_type: user.business_type,
            is_onboarding: user.is_onboarding_customer || false
        });

        let salesData = null;
        let employeesData = null;
        let expensesData = null;
        const results = {
            sales: { success: false, error: null, data: null },
            employees: { success: false, error: null, data: null },
            expenses: { success: false, error: null, data: null }
        };

        // --- 1. תחזית מכירות ---
        console.log('Starting sales forecast generation...');
        await base44.asServiceRole.entities.ProcessStatus.update(processRecord.id, { 
            progress: 25, 
            current_step: 'שלב 1/3: יוצר תחזית מכירות מבוססת יעדים עם AI...' 
        });
        
        try {
            const salesResponse = await base44.asServiceRole.functions.invoke('generateSalesForecastAI', { 
                customer_email, 
                user, 
                forecastType, 
                strategicInput,
                services_data 
            });
            
            console.log('Sales forecast response:', {
                hasData: !!salesResponse?.data,
                isSuccess: salesResponse?.data?.success
            });
            
            if (salesResponse && salesResponse.data && salesResponse.data.success === true) {
                salesData = salesResponse.data;
                results.sales.success = true;
                results.sales.data = salesData;
                console.log('Sales forecast: SUCCESS');
            } else {
                results.sales.success = false;
                results.sales.error = salesResponse?.data?.error || "Sales forecast returned success: false";
                console.log('Sales forecast: FAILED -', results.sales.error);
            }
        } catch (e) {
            console.error('Sales Forecast AI function call EXCEPTION:', e.message);
            results.sales.success = false;
            results.sales.error = e.message;
        }

        // --- 2. תחזית עובדים ---
        console.log('Starting employee forecast generation...');
        await base44.asServiceRole.entities.ProcessStatus.update(processRecord.id, { 
            progress: 50, 
            current_step: 'שלב 2/3: יוצר תחזית כוח אדם מבוססת יעדים עם AI...' 
        });
        
        try {
            const employeeResponse = await base44.asServiceRole.functions.invoke('generateEmployeeForecastAI', { 
                customer_email, 
                user, 
                forecastType, 
                strategicInput 
            });
            
            console.log('Employee forecast response:', {
                hasData: !!employeeResponse?.data,
                isSuccess: employeeResponse?.data?.success
            });

            if (employeeResponse && employeeResponse.data && employeeResponse.data.success === true) {
                employeesData = employeeResponse.data;
                results.employees.success = true;
                results.employees.data = employeesData;
                console.log('Employee forecast: SUCCESS');
            } else {
                results.employees.success = false;
                results.employees.error = employeeResponse?.data?.error || "Employee forecast returned success: false";
                console.log('Employee forecast: FAILED -', results.employees.error);
            }
        } catch (e) {
            console.error('Employee Forecast AI function call EXCEPTION:', e.message);
            results.employees.success = false;
            results.employees.error = e.message;
        }
        
        // --- 3. תחזית הוצאות ---
        console.log('Starting expense forecast generation...');
        await base44.asServiceRole.entities.ProcessStatus.update(processRecord.id, { 
            progress: 75, 
            current_step: 'שלב 3/3: יוצר תחזית הוצאות מבוססת יעדים עם AI...' 
        });
        
        try {
            const expenseResponse = await base44.asServiceRole.functions.invoke('generateExpenseForecastAI', { 
                customer_email, 
                user, 
                forecastType, 
                strategicInput 
            });
            
            console.log('Expense forecast response:', {
                hasData: !!expenseResponse?.data,
                isSuccess: expenseResponse?.data?.success
            });

            if (expenseResponse && expenseResponse.data && expenseResponse.data.success === true) {
                expensesData = expenseResponse.data;
                results.expenses.success = true;
                results.expenses.data = expensesData;
                console.log('Expense forecast: SUCCESS');
            } else {
                results.expenses.success = false;
                results.expenses.error = expenseResponse?.data?.error || "Expense forecast returned success: false";
                console.log('Expense forecast: FAILED -', results.expenses.error);
            }
        } catch (e) {
            console.error('Expense Forecast AI function call EXCEPTION:', e.message);
            results.expenses.success = false;
            results.expenses.error = e.message;
        }

        // בדיקת תוצאות - חייבים לפחות 2 מתוך 3 שלבים מוצלחים
        console.log('Final results check:', results);
        const successCount = Object.values(results).filter(r => r.success).length;
        console.log('Success count:', successCount);

        if (successCount < 2) {
            const errorDetails = Object.entries(results)
                .filter(([_, result]) => !result.success)
                .map(([key, result]) => `${key}: ${result.error}`)
                .join('; ');
            console.log('Insufficient successful forecasts. Error details:', errorDetails);
            throw new Error(`נכשלו יותר מדי חלקים ביצירת התחזית (${3 - successCount}/3 נכשלו). פרטי שגיאות: ${errorDetails}`);
        }

        console.log('Minimum required forecasts succeeded. Building full forecast structure...');
        await base44.asServiceRole.entities.ProcessStatus.update(processRecord.id, { 
            progress: 90, 
            current_step: 'מחבר את כל חלקי התחזית...' 
        });
        
        const fullForecastData = buildFullForecastStructure(
            salesData, 
            employeesData, 
            expensesData, 
            services_data, 
            forecast_name, 
            forecast_year,
            strategicInput
        );

        console.log('Saving forecast to database...');
        console.log('Forecast summary:', {
            total_revenue: fullForecastData.profit_loss_summary.total_revenue,
            net_profit: fullForecastData.profit_loss_summary.net_profit,
            products_count: fullForecastData.services_data.length
        });

        let result;
        if (forecast_id) {
            result = await base44.asServiceRole.entities.BusinessForecast.update(forecast_id, { 
                ...fullForecastData, 
                customer_email, 
                forecast_name, 
                forecast_year, 
                version_name: `v1.0 - AI ${forecastType}`, 
                is_system_generated: true, 
                is_editable: true, 
                products_included_count: services_data.length, 
                includes_full_catalog: true 
            });
            console.log('Forecast updated successfully, ID:', result.id);
        } else {
            result = await base44.asServiceRole.entities.BusinessForecast.create({ 
                ...fullForecastData, 
                customer_email, 
                forecast_name: `${forecast_name} - ${forecastType}`, 
                forecast_year, 
                version_name: `v1.0 - AI ${forecastType}`, 
                is_system_generated: true, 
                is_editable: true, 
                products_included_count: services_data.length, 
                includes_full_catalog: true 
            });
            console.log('Forecast created successfully, ID:', result.id);
        }

        console.log(`Forecast process completed successfully. ${successCount}/3 parts succeeded.`);

        await base44.asServiceRole.entities.ProcessStatus.update(processRecord.id, { 
            status: 'completed', 
            progress: 100, 
            current_step: `תחזית הושלמה בהצלחה! ${successCount}/3 חלקים נוצרו.`, 
            completed_at: new Date().toISOString(), 
            result_data: { 
                forecast_id: result.id, 
                results,
                summary: fullForecastData.profit_loss_summary
            } 
        });

        return new Response(JSON.stringify({ 
            success: true, 
            forecast: result, 
            results, 
            message: `Forecast created successfully with ${successCount}/3 parts completed.`,
            forecast_id: result.id
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });

    } catch (error) {
        console.error('Error in forecast orchestration:', error);
        if (processRecord) {
            await base44.asServiceRole.entities.ProcessStatus.update(processRecord.id, { 
                status: 'failed', 
                progress: 100, 
                error_message: error.message, 
                current_step: `נכשל: ${error.message}`,
                completed_at: new Date().toISOString() 
            });
        }
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message || 'Failed to orchestrate forecast generation' 
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
    }
});
