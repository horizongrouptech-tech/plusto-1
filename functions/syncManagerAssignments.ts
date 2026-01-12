import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { customer_email } = await req.json();

    if (!customer_email) {
      return Response.json({ error: 'customer_email is required' }, { status: 400 });
    }

    // שליפת OnboardingRequest לקבלת רשימת המנהלים
    const onboardingRequests = await base44.asServiceRole.entities.OnboardingRequest.filter({
      email: customer_email
    });

    if (!onboardingRequests || onboardingRequests.length === 0) {
      return Response.json({ error: 'OnboardingRequest not found' }, { status: 404 });
    }

    const onboarding = onboardingRequests[0];
    const managerEmails = [];

    if (onboarding.assigned_financial_manager_email) {
      managerEmails.push(onboarding.assigned_financial_manager_email);
    }

    if (onboarding.additional_assigned_financial_manager_emails) {
      managerEmails.push(...onboarding.additional_assigned_financial_manager_emails);
    }

    // רשימת הישויות לעדכון
    const entitiesToUpdate = [
      'ProductCatalog',
      'Catalog',
      'FileUpload',
      'Recommendation',
      'BusinessForecast',
      'ManualForecast',
      'CashFlow',
      'FinancialReport',
      'StrategicMove',
      'CustomerAction',
      'CustomerNotification',
      'ZReportDetails',
      'PurchaseRecord',
      'RecurringExpense',
      'WebsiteScanResult',
      'ProjectForecast',
      'UserActivity',
      'UserEngagement',
      'BusinessMove',
      'CatalogMappingProfile',
      'ManualForecastMappingProfile',
      'OrganizationChart',
      'Ofek360Model',
      'ServiceContact',
      'CustomerContact',
      'StrategicPlanInput',
      'ProcessStatus',
      'RecommendationRating',
      'RecommendationFeedback',
      'Supplier',
      'Lead',
      'LeadCommission'
    ];

    const results = {};

    for (const entityName of entitiesToUpdate) {
      try {
        // קביעת שדה החיפוש הנכון לפי הישות
        let filterQuery = {};
        
        if (entityName === 'UserActivity') {
          filterQuery = { user_email: customer_email };
        } else if (entityName === 'Supplier') {
          filterQuery = { customer_emails: { $contains: customer_email } };
        } else if (entityName === 'Lead' || entityName === 'LeadCommission') {
          filterQuery = { customer_email: customer_email };
        } else {
          filterQuery = { customer_email: customer_email };
        }

        // שליפת כל הרשומות של הלקוח
        const records = await base44.asServiceRole.entities[entityName].filter(filterQuery);

        if (records && records.length > 0) {
          // עדכון כל רשומה
          for (const record of records) {
            await base44.asServiceRole.entities[entityName].update(record.id, {
              assigned_manager_emails: managerEmails
            });
          }
          
          results[entityName] = {
            success: true,
            recordsUpdated: records.length
          };
        } else {
          results[entityName] = {
            success: true,
            recordsUpdated: 0
          };
        }
      } catch (error) {
        results[entityName] = {
          success: false,
          error: error.message
        };
      }
    }

    return Response.json({
      success: true,
      customer_email,
      managerEmails,
      results
    });

  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});