import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { BRAND, createEmailWrapper, createButton } from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  htmlBody: string;
  labels: string[];
  hasAttachments: boolean;
  isRead: boolean;
  source: 'thread' | 'contact' | 'external';
}

// Send email via Gmail SMTP
const sendEmailViaGmail = async (
  gmailUser: string,
  gmailPassword: string,
  to: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<void> => {
  console.log(`[FETCH-GMAIL] Sending email to ${to} via Gmail SMTP`);
  
  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: {
        username: gmailUser,
        password: gmailPassword,
      },
    },
  });

  try {
    await client.send({
      from: `${BRAND.name} <${gmailUser}>`,
      to: to,
      replyTo: BRAND.email,
      subject: subject,
      mimeContent: [
        {
          mimeType: 'text/html; charset="utf-8"',
          content: htmlContent,
          transferEncoding: "8bit",
        },
      ],
    });
    console.log(`[FETCH-GMAIL] Email sent successfully to ${to}`);
  } finally {
    await client.close();
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("[FETCH-GMAIL] Request received");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      throw new Error("Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD secrets.");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { action, messageId, maxResults = 50, query = "", to, toName, subject, html, text, replyToId, attachments = [] } = body;
    console.log(`[FETCH-GMAIL] Action: ${action}, Query: ${query}`);

    if (action === "list") {
      // Fetch from communication_threads and contact_submissions
      const emails: EmailMessage[] = [];

      // Get communication threads with messages
      const { data: threads, error: threadsError } = await supabase
        .from('communication_threads')
        .select(`
          id,
          subject,
          status,
          created_at,
          last_message_at,
          initiator_email,
          initiator_name,
          channel_type,
          communication_messages (
            id,
            content,
            html_content,
            sender_email,
            sender_name,
            sender_role,
            created_at,
            read_at
          )
        `)
        .order('last_message_at', { ascending: false })
        .limit(maxResults);

      if (threadsError) {
        console.error("[FETCH-GMAIL] Error fetching threads:", threadsError);
      } else if (threads) {
        for (const thread of threads) {
          const messages = thread.communication_messages || [];
          const latestMessage = messages[0];
          const hasUnread = messages.some((m: any) => !m.read_at && m.sender_role !== 'admin');
          
          emails.push({
            id: `thread-${thread.id}`,
            threadId: thread.id,
            from: thread.initiator_email || 'Unknown',
            fromName: thread.initiator_name || 'Unknown',
            to: GMAIL_USER,
            subject: thread.subject,
            date: thread.last_message_at || thread.created_at,
            snippet: latestMessage?.content?.substring(0, 150) || '',
            body: latestMessage?.content || '',
            htmlBody: latestMessage?.html_content || '',
            labels: hasUnread ? [] : ['\\Seen'],
            hasAttachments: false,
            isRead: !hasUnread,
            source: 'thread'
          });
        }
      }

      // Get contact submissions
      const { data: contacts, error: contactsError } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(maxResults);

      if (contactsError) {
        console.error("[FETCH-GMAIL] Error fetching contacts:", contactsError);
      } else if (contacts) {
        for (const contact of contacts) {
          emails.push({
            id: `contact-${contact.id}`,
            threadId: contact.id,
            from: contact.email,
            fromName: contact.name,
            to: GMAIL_USER,
            subject: contact.subject || `Contact from ${contact.name}`,
            date: contact.created_at,
            snippet: contact.message.substring(0, 150),
            body: contact.message,
            htmlBody: `<p>${contact.message.replace(/\n/g, '<br>')}</p>`,
            labels: contact.is_read ? ['\\Seen'] : [],
            hasAttachments: false,
            isRead: contact.is_read,
            source: 'contact'
          });
        }
      }

      // Sort all emails by date
      emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Apply search filter
      let filteredEmails = emails;
      if (query) {
        const q = query.toLowerCase();
        filteredEmails = emails.filter(e => 
          e.subject.toLowerCase().includes(q) ||
          e.from.toLowerCase().includes(q) ||
          e.fromName.toLowerCase().includes(q) ||
          e.body.toLowerCase().includes(q)
        );
      }

      console.log(`[FETCH-GMAIL] Returning ${filteredEmails.length} emails`);

      return new Response(JSON.stringify({ 
        emails: filteredEmails.slice(0, maxResults), 
        total: filteredEmails.length,
        nextPageToken: null
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "get" && messageId) {
      // Parse the message ID to determine source
      if (messageId.startsWith('thread-')) {
        const threadId = messageId.replace('thread-', '');
        const { data: thread, error } = await supabase
          .from('communication_threads')
          .select(`
            *,
            communication_messages (
              id,
              content,
              html_content,
              sender_email,
              sender_name,
              sender_role,
              created_at,
              read_at
            )
          `)
          .eq('id', threadId)
          .single();

        if (error) throw error;
        
        const messages = thread.communication_messages || [];
        const allContent = messages.map((m: any) => m.content).join('\n\n---\n\n');
        const allHtml = messages.map((m: any) => m.html_content || `<p>${m.content?.replace(/\n/g, '<br>')}</p>`).join('<hr>');

        return new Response(JSON.stringify({ 
          email: {
            id: messageId,
            threadId: thread.id,
            from: thread.initiator_email || 'Unknown',
            fromName: thread.initiator_name || 'Unknown',
            to: GMAIL_USER,
            subject: thread.subject,
            date: thread.last_message_at || thread.created_at,
            snippet: allContent.substring(0, 150),
            body: allContent,
            htmlBody: allHtml,
            labels: ['\\Seen'],
            hasAttachments: false,
            isRead: true,
            source: 'thread'
          }
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (messageId.startsWith('contact-')) {
        const contactId = messageId.replace('contact-', '');
        const { data: contact, error } = await supabase
          .from('contact_submissions')
          .select('*')
          .eq('id', contactId)
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ 
          email: {
            id: messageId,
            threadId: contact.id,
            from: contact.email,
            fromName: contact.name,
            to: GMAIL_USER,
            subject: contact.subject || `Contact from ${contact.name}`,
            date: contact.created_at,
            snippet: contact.message.substring(0, 150),
            body: contact.message,
            htmlBody: `<p>${contact.message.replace(/\n/g, '<br>')}</p>`,
            labels: ['\\Seen'],
            hasAttachments: false,
            isRead: true,
            source: 'contact'
          }
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      throw new Error("Invalid message ID format");
    }

    if (action === "markRead" && messageId) {
      if (messageId.startsWith('thread-')) {
        const threadId = messageId.replace('thread-', '');
        await supabase
          .from('communication_messages')
          .update({ read_at: new Date().toISOString() })
          .eq('thread_id', threadId)
          .is('read_at', null);
      }

      if (messageId.startsWith('contact-')) {
        const contactId = messageId.replace('contact-', '');
        await supabase
          .from('contact_submissions')
          .update({ is_read: true })
          .eq('id', contactId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "archive" && messageId) {
      if (messageId.startsWith('thread-')) {
        const threadId = messageId.replace('thread-', '');
        await supabase
          .from('communication_threads')
          .update({ status: 'archived' })
          .eq('id', threadId);
      }
      // For contact submissions, we just mark as read
      if (messageId.startsWith('contact-')) {
        const contactId = messageId.replace('contact-', '');
        await supabase
          .from('contact_submissions')
          .update({ is_read: true })
          .eq('id', contactId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "delete" && messageId) {
      if (messageId.startsWith('thread-')) {
        const threadId = messageId.replace('thread-', '');
        
        // Get all message IDs for this thread to clean up attachments and audit logs
        const { data: messages } = await supabase
          .from('communication_messages')
          .select('id')
          .eq('thread_id', threadId);
        
        const messageIds = messages?.map(m => m.id) || [];
        
        // Delete in proper order to respect foreign key constraints:
        // 1. Delete attachments for all messages
        if (messageIds.length > 0) {
          await supabase.from('communication_attachments').delete().in('message_id', messageIds);
          // 2. Delete audit logs referencing messages
          await supabase.from('communication_audit_log').delete().in('message_id', messageIds);
        }
        
        // 3. Delete audit logs referencing the thread
        await supabase.from('communication_audit_log').delete().eq('thread_id', threadId);
        
        // 4. Delete participants
        await supabase.from('communication_participants').delete().eq('thread_id', threadId);
        
        // 5. Delete messages
        await supabase.from('communication_messages').delete().eq('thread_id', threadId);
        
        // 6. Finally delete the thread
        const { error: deleteError } = await supabase.from('communication_threads').delete().eq('id', threadId);
        
        if (deleteError) {
          console.error('[FETCH-GMAIL] Error deleting thread:', deleteError);
          throw new Error(`Failed to delete thread: ${deleteError.message}`);
        }
        
        console.log(`[FETCH-GMAIL] Successfully deleted thread ${threadId}`);
      }
      
      if (messageId.startsWith('contact-')) {
        const contactId = messageId.replace('contact-', '');
        const { error: deleteError } = await supabase.from('contact_submissions').delete().eq('id', contactId);
        
        if (deleteError) {
          console.error('[FETCH-GMAIL] Error deleting contact:', deleteError);
          throw new Error(`Failed to delete contact: ${deleteError.message}`);
        }
        
        console.log(`[FETCH-GMAIL] Successfully deleted contact ${contactId}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "send") {
      if (!to || !subject) {
        throw new Error("Missing required fields: to, subject");
      }

      // Create branded email content
      const emailContent = createEmailWrapper(`
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${html || `<p style="font-size: 16px; line-height: 1.6;">${(text || '').replace(/\n/g, '<br>')}</p>`}
        </div>
      `, subject);

      // Send email via Gmail SMTP
      await sendEmailViaGmail(GMAIL_USER, GMAIL_APP_PASSWORD, to, subject, emailContent, text);

      // Log the sent email with body content and full metadata
      await supabase.from('email_logs').insert({
        email_type: 'outbound',
        to_email: to,
        to_name: toName || to.split('@')[0],
        subject: subject,
        status: 'sent',
        body_html: html || null,
        body_text: text || null,
        metadata: { 
          reply_to_id: replyToId || null, 
          sent_via: 'gmail_smtp',
          sent_at: new Date().toISOString(),
          attachments: attachments.length > 0 ? attachments : null,
          attachment_count: attachments.length
        }
      });

      console.log(`[FETCH-GMAIL] Email sent successfully to ${to}`);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Email sent via Gmail SMTP'
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "reply") {
      if (!to || !subject || !messageId) {
        throw new Error("Missing required fields for reply");
      }

      const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

      // Create branded email content
      const emailContent = createEmailWrapper(`
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${html || `<p style="font-size: 16px; line-height: 1.6;">${(text || '').replace(/\n/g, '<br>')}</p>`}
        </div>
      `, replySubject);

      // Send email via Gmail SMTP
      await sendEmailViaGmail(GMAIL_USER, GMAIL_APP_PASSWORD, to, replySubject, emailContent, text);

      console.log(`[FETCH-GMAIL] Reply sent to ${to}`);

      // If this is a reply to a thread, add the message
      if (messageId.startsWith('thread-')) {
        const threadId = messageId.replace('thread-', '');
        await supabase.from('communication_messages').insert({
          thread_id: threadId,
          content: text || '',
          html_content: html || '',
          sender_email: GMAIL_USER,
          sender_name: BRAND.name,
          sender_role: 'admin',
          read_at: new Date().toISOString()
        });

        await supabase.from('communication_threads')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', threadId);
      }

      // Log the sent email with body content and full metadata
      await supabase.from('email_logs').insert({
        email_type: 'reply',
        to_email: to,
        to_name: toName || to.split('@')[0],
        subject: replySubject,
        status: 'sent',
        body_html: html || null,
        body_text: text || null,
        metadata: { 
          original_message_id: messageId, 
          sent_via: 'gmail_smtp',
          sent_at: new Date().toISOString(),
          attachments: attachments.length > 0 ? attachments : null,
          attachment_count: attachments.length
        }
      });

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Reply sent via Gmail SMTP'
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error: any) {
    console.error("[FETCH-GMAIL] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
