import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Webhook endpoint to receive leads from Make.com
 * Replaces Fireberry lead intake functionality
 * 
 * Expected payload from Make.com:
 * {
 *   customer_name: string (required),
 *   customer_email: string,
 *   customer_phone: string,
 *   business_name: string,
 *   request_details: string,
 *   lead_source: 'facebook' | 'instagram' | 'google_form' | 'website' | 'referral' | 'other',
 *   lead_category: 'working_meeting' | 'club_membership' | 'general',
 *   utm_source: string,
 *   utm_medium: string,
 *   utm_campaign: string,
 *   ... any additional fields
 * }
 */

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Secret'
      }
    });
  }

  try {
    // Verify webhook secret (optional security layer)
    const webhookSecret = req.headers.get('X-Webhook-Secret');
    const expectedSecret = Deno.env.get('LEAD_WEBHOOK_SECRET');
    
    if (expectedSecret && webhookSecret !== expectedSecret) {
      console.warn('Invalid webhook secret received');
      // Don't block - just log warning for now
    }

    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    console.log('=== LEAD WEBHOOK RECEIVED ===');
    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Validate required fields
    if (!payload.customer_name) {
      return Response.json({
        success: false,
        error: 'Missing required field: customer_name'
      }, { status: 400 });
    }

    // Map lead source from various formats
    const normalizeLeadSource = (source) => {
      if (!source) return 'other';
      const sourceLower = source.toLowerCase();
      
      if (sourceLower.includes('facebook') || sourceLower.includes('fb')) return 'facebook';
      if (sourceLower.includes('instagram') || sourceLower.includes('ig')) return 'instagram';
      if (sourceLower.includes('google')) return 'google_form';
      if (sourceLower.includes('linkedin')) return 'linkedin';
      if (sourceLower.includes('whatsapp') || sourceLower.includes('wa')) return 'whatsapp';
      if (sourceLower.includes('website') || sourceLower.includes('site')) return 'website';
      if (sourceLower.includes('referral') || sourceLower.includes('refer')) return 'referral';
      
      return 'other';
    };

    // Determine lead category based on request type or explicit category
    const determineLeadCategory = (payload) => {
      if (payload.lead_category) return payload.lead_category;
      
      const details = (payload.request_details || '').toLowerCase();
      const type = (payload.request_type || '').toLowerCase();
      
      if (details.includes('פגישת עבודה') || type.includes('working_meeting')) {
        return 'working_meeting';
      }
      if (details.includes('מועדון') || type.includes('club')) {
        return 'club_membership';
      }
      
      return 'general';
    };

    // Auto-assign manager based on lead category
    const autoAssignManager = async (leadCategory) => {
      // Get all financial managers
      const managers = await base44.asServiceRole.entities.User.filter({
        user_type: 'financial_manager',
        is_active: true
      });

      if (managers.length === 0) {
        console.log('No active financial managers found for auto-assignment');
        return null;
      }

      // For now, simple round-robin or first available
      // In the future, can be enhanced with workload balancing
      
      // Count leads per manager
      const managerLeadCounts = {};
      for (const manager of managers) {
        const leadsCount = await base44.asServiceRole.entities.Lead.filter({
          assigned_manager_email: manager.email,
          stage: { $nin: ['closed_won', 'closed_lost'] }
        });
        managerLeadCounts[manager.email] = leadsCount.length;
      }

      // Find manager with least open leads
      let minLeads = Infinity;
      let selectedManager = managers[0].email;
      
      for (const [email, count] of Object.entries(managerLeadCounts)) {
        if (count < minLeads) {
          minLeads = count;
          selectedManager = email;
        }
      }

      console.log(`Auto-assigned to manager: ${selectedManager} (${minLeads} open leads)`);
      return selectedManager;
    };

    const leadCategory = determineLeadCategory(payload);
    const assignedManager = await autoAssignManager(leadCategory);

    // Create the lead record
    const leadData = {
      customer_name: payload.customer_name,
      customer_email: payload.customer_email || '',
      customer_phone: payload.customer_phone || '',
      business_name: payload.business_name || '',
      request_details: payload.request_details || payload.message || 'פנייה חדשה',
      request_type: payload.request_type || 'other',
      lead_source: normalizeLeadSource(payload.lead_source || payload.source),
      lead_source_details: payload.lead_source_details || payload.campaign_name || '',
      lead_category: leadCategory,
      stage: 'new',
      status: 'new',
      priority: payload.priority || 'medium',
      assigned_manager_email: assignedManager,
      utm_source: payload.utm_source || '',
      utm_medium: payload.utm_medium || '',
      utm_campaign: payload.utm_campaign || '',
      webhook_payload: payload,
      notes: payload.notes || ''
    };

    const newLead = await base44.asServiceRole.entities.Lead.create(leadData);
    console.log(`Lead created with ID: ${newLead.id}`);

    // Create notification for assigned manager
    if (assignedManager) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: assignedManager,
        type: 'system',
        title: 'ליד חדש התקבל',
        message: `ליד חדש מ-${leadData.customer_name} (${leadData.lead_source}). קטגוריה: ${leadCategory}`,
        link: `/LeadIntakeManagement?leadId=${newLead.id}`,
        priority: leadData.priority === 'urgent' ? 'high' : 'medium',
        related_entity_id: newLead.id,
        related_entity_type: 'Lead'
      });
      console.log(`Notification sent to ${assignedManager}`);
    }

    console.log('=== LEAD WEBHOOK COMPLETE ===');

    return Response.json({
      success: true,
      lead_id: newLead.id,
      assigned_to: assignedManager,
      category: leadCategory
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Lead webhook error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});