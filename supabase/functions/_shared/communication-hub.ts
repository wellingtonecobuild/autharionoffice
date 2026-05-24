import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// SINGLE EMAIL SYSTEM - All communications use info@wellingtonecobuild.nz
const PRIMARY_EMAIL = 'info@wellingtonecobuild.nz';
const COMPANY_NAME = 'Wellington EcoBuild';
const FOUNDER_NAME = 'Beveck';

// Email voice modes - all use same email address, different display names
export type EmailVoice = 'company' | 'personal';

const getEmailIdentity = (voice: EmailVoice = 'company') => ({
  address: PRIMARY_EMAIL,
  displayName: voice === 'personal' ? FOUNDER_NAME : COMPANY_NAME
});

// All categories route to the same email for simplicity
const EMAIL_CATEGORIES: Record<string, { address: string; displayName: string }> = {
  info: { address: PRIMARY_EMAIL, displayName: COMPANY_NAME },
  support: { address: PRIMARY_EMAIL, displayName: COMPANY_NAME },
  verification: { address: PRIMARY_EMAIL, displayName: COMPANY_NAME },
  partnerships: { address: PRIMARY_EMAIL, displayName: COMPANY_NAME },
  advertising: { address: PRIMARY_EMAIL, displayName: COMPANY_NAME },
  legal: { address: PRIMARY_EMAIL, displayName: COMPANY_NAME },
  admin: { address: PRIMARY_EMAIL, displayName: COMPANY_NAME },
  leadership: { address: PRIMARY_EMAIL, displayName: FOUNDER_NAME },
  business_status: { address: PRIMARY_EMAIL, displayName: COMPANY_NAME },
  document_status: { address: PRIMARY_EMAIL, displayName: COMPANY_NAME },
  default: { address: PRIMARY_EMAIL, displayName: COMPANY_NAME }
};

export interface SystemNotification {
  subject: string;
  content: string;
  channel_type: 'system_notification' | 'internal' | 'document_exchange';
  category: string;
  priority?: 'normal' | 'high' | 'urgent';
  recipient_email?: string;
  recipient_id?: string;
  recipient_name?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  is_broadcast?: boolean;
  email_category?: string;
}

export async function createSystemThread(notification: SystemNotification): Promise<{ success: boolean; thread_id?: string; error?: string }> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine the appropriate email identity based on category
    const emailCategory = notification.email_category || notification.category;
    const emailIdentity = EMAIL_CATEGORIES[emailCategory] || EMAIL_CATEGORIES.default;

    // Create thread
    const { data: thread, error: threadError } = await supabase
      .from('communication_threads')
      .insert({
        subject: notification.subject,
        channel_type: notification.channel_type,
        status: 'unread',
        priority: notification.priority || 'normal',
        category: notification.category,
        email_category: emailCategory,
        initiator_email: emailIdentity.address,
        initiator_name: emailIdentity.displayName,
        initiator_role: 'system',
        is_broadcast: notification.is_broadcast || false,
        related_entity_type: notification.related_entity_type,
        related_entity_id: notification.related_entity_id
      })
      .select()
      .single();

    if (threadError) {
      console.error('Error creating thread:', threadError);
      return { success: false, error: threadError.message };
    }

    // Create initial message
    const { error: msgError } = await supabase
      .from('communication_messages')
      .insert({
        thread_id: thread.id,
        sender_email: emailIdentity.address,
        sender_name: emailIdentity.displayName,
        sender_role: 'system',
        content: notification.content,
        is_system_message: true
      });

    if (msgError) {
      console.error('Error creating message:', msgError);
      return { success: false, error: msgError.message };
    }

    // Add recipient as participant if specified
    if (notification.recipient_email || notification.recipient_id) {
      await supabase
        .from('communication_participants')
        .insert({
          thread_id: thread.id,
          user_id: notification.recipient_id,
          user_email: notification.recipient_email,
          user_role: 'user'
        });
    }

    // Log to audit
    await supabase
      .from('communication_audit_log')
      .insert({
        thread_id: thread.id,
        action: 'thread_created',
        actor_email: emailIdentity.address,
        actor_role: 'system',
        details: {
          category: notification.category,
          email_category: emailCategory,
          channel_type: notification.channel_type,
          related_entity_type: notification.related_entity_type,
          related_entity_id: notification.related_entity_id,
          from_identity: emailIdentity.address
        }
      });

    console.log('System notification thread created:', thread.id);
    return { success: true, thread_id: thread.id };
  } catch (error: any) {
    console.error('Error in createSystemThread:', error);
    return { success: false, error: error.message };
  }
}

export async function addMessageToThread(
  threadId: string, 
  content: string, 
  senderInfo: { email: string; name: string; role: string; id?: string }
): Promise<{ success: boolean; message_id?: string; error?: string }> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: message, error } = await supabase
      .from('communication_messages')
      .insert({
        thread_id: threadId,
        sender_id: senderInfo.id,
        sender_email: senderInfo.email,
        sender_name: senderInfo.name,
        sender_role: senderInfo.role,
        content: content,
        is_system_message: senderInfo.role === 'system'
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Update thread last_message_at
    await supabase
      .from('communication_threads')
      .update({ 
        last_message_at: new Date().toISOString(),
        status: senderInfo.role === 'admin' ? 'replied' : 'unread'
      })
      .eq('id', threadId);

    return { success: true, message_id: message.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
