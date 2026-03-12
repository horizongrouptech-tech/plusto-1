import { supabase } from './supabaseClient';

/**
 * listConversations({ agent_name })
 * Returns conversations filtered by agent_name, sorted newest-first.
 */
export const listConversations = async ({ agent_name } = {}) => {
  let q = supabase
    .from('manager_conversation')
    .select('*')
    .order('created_date', { ascending: false });
  if (agent_name) q = q.eq('agent_name', agent_name);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
};

/**
 * createConversation({ agent_name, metadata })
 * Creates a new conversation record and returns it.
 */
export const createConversation = async ({ agent_name, metadata = {} }) => {
  const { data, error } = await supabase
    .from('manager_conversation')
    .insert({ agent_name, metadata, messages: [] })
    .select()
    .single();
  if (error) throw error;
  return data;
};

/**
 * addMessage(conversation, { role, content })
 * Sends to /api/agentChat which appends the user message, calls the LLM,
 * and saves the assistant reply — updating the row to trigger Realtime.
 */
export const addMessage = async (conversation, { role, content, file_attachments }) => {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch('/api/agentChat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({
      conversation_id: conversation.id,
      role,
      content,
      metadata: conversation.metadata,
      ...(file_attachments?.length ? { file_attachments } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'agentChat failed');
  }
  return res.json();
};

/**
 * subscribeToConversation(conversationId, callback)
 * Subscribes to UPDATE events on the conversation row.
 * Calls callback(updatedRow) on every change.
 * Returns an unsubscribe function.
 */
export const subscribeToConversation = (conversationId, callback) => {
  const channel = supabase
    .channel(`conv:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'manager_conversation',
        filter: `id=eq.${conversationId}`,
      },
      (payload) => callback(payload.new),
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};
