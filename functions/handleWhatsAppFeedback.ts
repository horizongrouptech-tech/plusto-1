
import { createClient } from 'npm:@base44/sdk@0.1.0';

Deno.serve(async (req) => {
  // Debug: Check if API key is available
  const apiKey = Deno.env.get('BASE44_API_KEY');
  const appId = Deno.env.get('BASE44_APP_ID');
  
  console.log('=== DEBUG: Environment Variables Check ===');
  console.log('BASE44_APP_ID:', appId ? `${appId.substring(0, 8)}...` : 'UNDEFINED');
  console.log('BASE44_API_KEY exists:', apiKey ? 'YES' : 'NO');
  console.log('BASE44_API_KEY length:', apiKey ? apiKey.length : 0);
  console.log('BASE44_API_KEY first 10 chars:', apiKey ? `${apiKey.substring(0, 10)}...` : 'N/A');

  // Initialize the Base44 client with the API key for server-side access
  const base44 = createClient({
    appId: appId,
    apiKey: apiKey,
  });

  console.log('Base44 client created with config:', {
    appId: appId ? `${appId.substring(0, 8)}...` : 'UNDEFINED',
    hasApiKey: !!apiKey
  });

  // Add CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('=== WhatsApp Feedback Webhook Called ===');
    console.log('Method:', req.method);

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.text();
    const payload = JSON.parse(body);
    console.log('Parsed payload:', JSON.stringify(payload, null, 2));

    const from = payload.from || payload.phone || payload.sender;
    const message = payload.message || payload.text || payload.content;
    
    // Updated Logic: Directly check for Woztell's specific feedback keys
    const woztellRecommendationId = payload.recommendation_id;
    const woztellFeedbackType = payload.feedback_type;

    console.log('Extracted data:', { from, message, woztellRecommendationId, woztellFeedbackType });
    
    if (!from) {
      return new Response(JSON.stringify({ error: 'No phone number provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const cleanPhone = from.replace(/[^\d]/g, '');

    // Check if it's a Woztell feedback button click
    if (woztellRecommendationId && woztellFeedbackType) {
        console.log('Processing Woztell button feedback:', { woztellRecommendationId, woztellFeedbackType });

        const feedbackRatingMap = {
          'implemented': 1,
          'details': 2,
          'not_relevant': 3
        };

        const rating = feedbackRatingMap[woztellFeedbackType];
        if (!rating) {
            console.log('Unknown feedback type from Woztell:', woztellFeedbackType);
            return new Response(JSON.stringify({ error: 'Unknown feedback type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        console.log('=== DEBUG: About to call Base44 API ===');
        console.log('Attempting to filter recommendations with delivery_status: sent');
        
        try {
          const recommendations = await base44.entities.Recommendation.filter({ delivery_status: 'sent' });
          console.log('Successfully retrieved recommendations count:', recommendations.length);
          
          let targetRecommendation = recommendations.find(rec => rec.related_data?.unique_recommendation_id === woztellRecommendationId);
          
          // Fallback: אם לא נמצא לפי unique ID, נסה לפי הטלפון וההמלצה האחרונה
          if (!targetRecommendation) {
            console.log('No recommendation found by unique ID, trying fallback method');
            
            // מצא לקוח לפי טלפון
            try {
                const users = await base44.entities.User.filter({ phone: cleanPhone });
                if (users.length > 0) {
                    const customer = users[0];
                    console.log('Found customer via phone:', customer.email);
                    const customerRecommendations = recommendations.filter(rec => rec.customer_email === customer.email);
                    
                    if (customerRecommendations.length > 0) {
                        // קח את ההמלצה האחרונה שנשלחה
                        targetRecommendation = customerRecommendations.sort((a, b) => new Date(b.updated_date).getTime() - new Date(a.updated_date).getTime())[0];
                        console.log('Found recommendation using fallback method:', targetRecommendation.id);
                    } else {
                        console.log('No recommendations found for this customer email:', customer.email);
                    }
                } else {
                    console.log('No user found for cleanPhone:', cleanPhone);
                }
            } catch (fallbackError) {
                console.error('Error in fallback recommendation search:', fallbackError);
            }
          }
          
          if (!targetRecommendation) {
            console.log('Recommendation not found for unique ID:', woztellRecommendationId);
            console.log('Available recommendation IDs:', recommendations.map(r => r.related_data?.unique_recommendation_id).filter(Boolean));
            return new Response(JSON.stringify({ error: 'Recommendation not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          
          console.log('Found recommendation:', targetRecommendation.id, targetRecommendation.title);

          const feedbackData = {
            recommendation_id: targetRecommendation.id,
            customer_email: targetRecommendation.customer_email,
            rating: rating,
            feedback_text: `Feedback received via WhatsApp: ${woztellFeedbackType}`,
            implementation_status: woztellFeedbackType === 'implemented' ? 'implemented' : 'not_implemented',
            feedback_source: 'whatsapp',
            whatsapp_phone: cleanPhone,
            unique_recommendation_id: woztellRecommendationId,
            feedback_payload: JSON.stringify(payload),
            received_at: new Date().toISOString()
          };

          console.log('=== DEBUG: About to create RecommendationFeedback ===');
          const newFeedback = await base44.entities.RecommendationFeedback.create(feedbackData);
          console.log('Created new feedback record:', newFeedback.id);

          // הפעל מעקב פעילות לאחר קבלת פידבק (inlined logic)
          try {
              const userEmailToUpdate = targetRecommendation.customer_email;
              if (userEmailToUpdate) {
                  const usersToUpdate = await base44.entities.User.filter({ email: userEmailToUpdate });
                  if (usersToUpdate.length > 0) {
                      const userToUpdate = usersToUpdate[0];
                      await base44.entities.User.update(userToUpdate.id, { last_activity: new Date().toISOString() });
                      console.log(`Activity tracked for ${userEmailToUpdate}`);
                  }
              }
          } catch (activityError) {
              console.error('Failed to track activity after feedback:', activityError);
          }

          return new Response(JSON.stringify({ 
              success: true, 
              message: `Feedback received and processed for recommendation ${targetRecommendation.id}` 
          }), { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
          
        } catch (apiError) {
          console.error('=== DEBUG: Base44 API Error Details ===');
          console.error('Error message:', apiError.message);
          console.error('Error status:', apiError.status);
          console.error('Full error:', apiError);
          
          return new Response(JSON.stringify({ 
            error: 'Failed to process feedback',
            details: apiError.message 
          }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
    }
    
    console.log('Processing as a regular message, no action taken.');
    return new Response(JSON.stringify({ success: true, message: 'Webhook received but no specific button feedback action taken.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in handleWhatsAppFeedback:', error.message, error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
