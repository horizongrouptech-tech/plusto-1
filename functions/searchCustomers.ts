import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchTerm } = await req.json();
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      return Response.json({ 
        error: 'חובה להזין לפחות 2 תווים לחיפוש' 
      }, { status: 400 });
    }

    // נרמול טקסט לחיפוש גמיש
    const normalize = (text) => {
      if (!text) return '';
      // המר לאותיות קטנות, הסר רווחים מיותרים וסימני פיסוק
      return text.toString()
        .toLowerCase()
        .replace(/[^\u0590-\u05FFa-z0-9\s]/gi, '') // שמור רק אותיות עברית/אנגלית ומספרים
        .replace(/\s+/g, ' ')
        .trim();
    };

    const searchNormalized = normalize(searchTerm);
    const searchWords = searchNormalized.split(' ').filter(w => w.length > 0);

    // טען את כל הלקוחות מ-OnboardingRequest עם סינון ידני למנהלי כספים
    let allOnboarding = [];
    
    if (user.role === 'admin') {
      // אדמין - גישה לכל הלקוחות
      allOnboarding = await base44.asServiceRole.entities.OnboardingRequest.list();
    } else if (user.user_type === 'financial_manager') {
      // מנהל כספים - רק לקוחות משויכים (סינון ידני)
      const allRequests = await base44.asServiceRole.entities.OnboardingRequest.list();
      
      // סינון ידני - רק לקוחות שמשויכים למנהל הכספים הזה
      allOnboarding = allRequests.filter(req => {
        const isDirectlyAssigned = req.assigned_financial_manager_email === user.email;
        const isAdditionallyAssigned = (req.additional_assigned_financial_manager_emails || []).includes(user.email);
        return isDirectlyAssigned || isAdditionallyAssigned;
      });
      
      // אם מנהל כספים ואין לו לקוחות
      if (allOnboarding.length === 0) {
        return Response.json({
          searchTerm,
          results: { exact: [], partial: [], fuzzy: [] },
          totalFound: 0,
          message: 'לא נמצאו לקוחות משויכים אליך'
        });
      }
    } else {
      // משתמש רגיל - אין גישה לחיפוש לקוחות
      return Response.json({ 
        error: 'אין הרשאה לחפש לקוחות' 
      }, { status: 403 });
    }

    // כל הלקוחות
    const allCustomers = allOnboarding.map(c => ({ 
      ...c, 
      source: 'onboarding', 
      id: `onboarding_${c.id}` 
    }));

    // חיפוש גמיש
    const exactMatches = [];
    const partialMatches = [];
    const fuzzyMatches = [];

    for (const customer of allCustomers) {
      const businessName = normalize(customer.business_name || '');
      const fullName = normalize(customer.full_name || '');
      const email = normalize(customer.email || customer.customer_email || '');

      // התאמה מדויקת (100%)
      if (searchNormalized === businessName || searchNormalized === fullName) {
        exactMatches.push({
          ...customer,
          matchType: 'exact',
          matchField: searchNormalized === businessName ? 'business_name' : 'full_name'
        });
        continue;
      }

      // התאמה חלקית (contains)
      if (searchNormalized.length >= 3) {
        if (businessName.includes(searchNormalized) || 
            searchNormalized.includes(businessName) ||
            fullName.includes(searchNormalized) || 
            searchNormalized.includes(fullName)) {
          partialMatches.push({
            ...customer,
            matchType: 'partial',
            matchField: businessName.includes(searchNormalized) || searchNormalized.includes(businessName) 
              ? 'business_name' : 'full_name'
          });
          continue;
        }
      }

      // התאמה פאזי (מילים משותפות)
      const businessWords = new Set(businessName.split(' '));
      const fullNameWords = new Set(fullName.split(' '));
      
      const commonWithBusiness = searchWords.filter(w => businessWords.has(w)).length;
      const commonWithName = searchWords.filter(w => fullNameWords.has(w)).length;
      
      if (commonWithBusiness > 0 || commonWithName > 0) {
        fuzzyMatches.push({
          ...customer,
          matchType: 'fuzzy',
          matchField: commonWithBusiness > commonWithName ? 'business_name' : 'full_name',
          score: commonWithBusiness + commonWithName
        });
      }
    }

    // מיין fuzzy matches לפי ציון
    fuzzyMatches.sort((a, b) => b.score - a.score);

    // החזר תוצאות
    return Response.json({
      searchTerm,
      results: {
        exact: exactMatches,
        partial: partialMatches,
        fuzzy: fuzzyMatches.slice(0, 10) // עד 10 תוצאות פאזי
      },
      totalFound: exactMatches.length + partialMatches.length + fuzzyMatches.length
    });

  } catch (error) {
    console.error('Search error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});