import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email identity mapping for routing
const EMAIL_ROUTING: Record<string, { category: string; priority: string }> = {
  "info@wellingtonecobuild.nz": { category: "info", priority: "normal" },
  "support@wellingtonecobuild.nz": { category: "support", priority: "normal" },
  "listings@wellingtonecobuild.nz": { category: "listings", priority: "normal" },
  "verification@wellingtonecobuild.nz": { category: "verification", priority: "high" },
  "billing@wellingtonecobuild.nz": { category: "billing", priority: "high" },
  "partnerships@wellingtonecobuild.nz": { category: "partnerships", priority: "normal" },
  "press@wellingtonecobuild.nz": { category: "press", priority: "low" },
  "careers@wellingtonecobuild.nz": { category: "careers", priority: "normal" },
};

/**
 * Extracts email address from various formats:
 * - "John Doe <john@example.com>" => { name: "John Doe", email: "john@example.com" }
 * - "john@example.com" => { name: "john", email: "john@example.com" }
 * - "<john@example.com>" => { name: "john", email: "john@example.com" }
 */
function parseEmailAddress(raw: string | null | undefined): { name: string; email: string } {
  if (!raw || typeof raw !== 'string') {
    return { name: "Unknown Sender", email: "unknown@unknown.com" };
  }
  
  const trimmed = raw.trim();
  
  // Skip obvious placeholder values
  const placeholders = ["from email", "from_email", "fromemail", "from", "email", "sender", "unknown"];
  if (placeholders.includes(trimmed.toLowerCase().replace(/[^a-z]/g, ''))) {
    return { name: "Unknown Sender", email: "unknown@unknown.com" };
  }
  
  // Format: "Name <email@domain.com>" or Name <email@domain.com>
  const fullMatch = trimmed.match(/(?:"?([^"<>]*)"?\s*)?<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/);
  if (fullMatch) {
    const name = fullMatch[1]?.trim() || fullMatch[2].split('@')[0];
    const email = fullMatch[2].toLowerCase();
    return { name: name || email.split('@')[0], email };
  }
  
  // Just email
  if (trimmed.includes('@')) {
    const email = trimmed.toLowerCase();
    return { name: email.split('@')[0], email };
  }
  
  return { name: trimmed || "Unknown Sender", email: "unknown@unknown.com" };
}

/**
 * Extracts plain text from HTML by removing tags
 */
function htmlToPlainText(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return "";
  
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if a string looks like a placeholder rather than actual content
 */
function isPlaceholder(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return true;
  
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed.length < 3) return true;
  
  const placeholders = [
    "body plain", "body_plain", "bodyplain", "plain body", "plain_body",
    "body html", "body_html", "bodyhtml", "html body", "html_body",
    "from email", "from_email", "fromemail", "email from",
    "subject", "no subject", "(no subject)", "nosubject",
    "text", "html", "body", "content", "message",
    "undefined", "null", "none", "empty", "n/a"
  ];
  
  return placeholders.some(p => trimmed === p || trimmed.replace(/[^a-z]/g, '') === p.replace(/[^a-z]/g, ''));
}

/**
 * Normalizes subject line
 */
function normalizeSubject(subject: string | null | undefined): string {
  if (!subject || typeof subject !== 'string' || isPlaceholder(subject)) {
    return "(No Subject)";
  }
  return subject.trim() || "(No Subject)";
}

/**
 * Extracts message content from various possible fields
 */
function extractMessageContent(data: any): { text: string; html: string } {
  // Try different field names used by various email providers
  const textFields = ['text', 'plain', 'body', 'body-plain', 'stripped-text', 'text/plain', 'TextBody'];
  const htmlFields = ['html', 'body-html', 'stripped-html', 'text/html', 'HtmlBody', 'htmlbody'];
  
  let text = "";
  let html = "";
  
  // Extract text content
  for (const field of textFields) {
    const value = data[field];
    if (value && typeof value === 'string' && !isPlaceholder(value)) {
      text = value.trim();
      break;
    }
  }
  
  // Extract HTML content
  for (const field of htmlFields) {
    const value = data[field];
    if (value && typeof value === 'string' && !isPlaceholder(value)) {
      html = value.trim();
      break;
    }
  }
  
  // If no text but has HTML, extract text from HTML
  if (!text && html) {
    text = htmlToPlainText(html);
  }
  
  // If still no content, check for nested structures
  if (!text && !html) {
    // Some providers nest content
    if (data.content) {
      if (typeof data.content === 'string') {
        text = data.content;
      } else if (typeof data.content === 'object') {
        text = data.content.text || data.content.plain || "";
        html = data.content.html || "";
      }
    }
    if (data.payload && typeof data.payload === 'object') {
      text = data.payload.text || data.payload.body || "";
      html = data.payload.html || "";
    }
  }
  
  return { text, html };
}

serve(async (req: Request) => {
  console.log("=== INBOUND EMAIL WEBHOOK RECEIVED ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the inbound email payload based on content type
    const contentType = req.headers.get("content-type") || "";
    let rawData: any = {};
    
    console.log("Content-Type:", contentType);

    if (contentType.includes("application/json")) {
      rawData = await req.json();
    } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      // Convert FormData to object
      for (const [key, value] of formData.entries()) {
        rawData[key] = value;
      }
    } else {
      // Try JSON as fallback
      try {
        rawData = await req.json();
      } catch {
        const text = await req.text();
        console.log("Raw text body:", text.substring(0, 500));
        return new Response(
          JSON.stringify({ error: "Unable to parse request body" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Log the raw data for debugging (sanitized)
    console.log("Raw data keys:", Object.keys(rawData));
    console.log("From field:", rawData.from || rawData.From || rawData.sender || "MISSING");
    console.log("To field:", rawData.to || rawData.To || rawData.recipient || "MISSING");
    console.log("Subject field:", rawData.subject || rawData.Subject || "MISSING");

    // Extract sender info from various possible field names
    const fromRaw = rawData.from || rawData.From || rawData.sender || rawData.Sender || 
                    rawData.from_email || rawData.FromFull?.Email || rawData.envelope?.from || "";
    const senderInfo = parseEmailAddress(fromRaw);
    
    // Also check for separate name field
    if (senderInfo.name === senderInfo.email.split('@')[0]) {
      const nameField = rawData.from_name || rawData.FromName || rawData.sender_name || 
                        rawData.FromFull?.Name || "";
      if (nameField && typeof nameField === 'string' && !isPlaceholder(nameField)) {
        senderInfo.name = nameField.trim();
      }
    }

    console.log("Parsed sender:", senderInfo);

    // Extract recipient info
    const toRaw = rawData.to || rawData.To || rawData.recipient || rawData.Recipient ||
                  rawData.to_email || rawData.ToFull?.[0]?.Email || rawData.envelope?.to?.[0] || "";
    const toAddresses = Array.isArray(toRaw) ? toRaw : [toRaw];
    const primaryTo = String(toAddresses[0] || "").toLowerCase().trim();
    const recipientInfo = parseEmailAddress(primaryTo);
    
    console.log("Parsed recipient:", recipientInfo);

    // Get routing based on recipient email
    const routing = EMAIL_ROUTING[recipientInfo.email] || { category: "info", priority: "normal" };
    console.log("Routing to category:", routing.category);

    // Extract subject
    const subjectRaw = rawData.subject || rawData.Subject || rawData.headers?.subject || 
                       rawData.headers?.Subject || "";
    const subject = normalizeSubject(subjectRaw);
    console.log("Normalized subject:", subject);

    // Extract message content
    const { text: messageText, html: messageHtml } = extractMessageContent(rawData);
    console.log("Message text length:", messageText.length);
    console.log("Message HTML length:", messageHtml.length);
    console.log("Message preview:", messageText.substring(0, 200));

    // Validate we have meaningful data
    if (senderInfo.email === "unknown@unknown.com" && subject === "(No Subject)" && !messageText) {
      console.error("Received email with no meaningful data");
      console.log("Full raw data:", JSON.stringify(rawData).substring(0, 2000));
      return new Response(
        JSON.stringify({ 
          error: "Unable to parse email content",
          received_keys: Object.keys(rawData)
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the email identity for this address
    const { data: emailIdentity } = await supabase
      .from("email_identities")
      .select("id")
      .eq("email_address", recipientInfo.email)
      .single();

    // Check for threading - look for existing conversation with this sender
    let existingThreadId: string | null = null;

    // Check by in-reply-to or references headers
    const inReplyTo = rawData.in_reply_to || rawData["In-Reply-To"] || rawData.headers?.["In-Reply-To"];
    const references = rawData.references || rawData.References || rawData.headers?.References;
    
    if (inReplyTo) {
      // First check if it matches an email_message_id (for replies to contractor emails)
      const { data: existingByMessageId } = await supabase
        .from("communication_messages")
        .select("thread_id")
        .eq("email_message_id", inReplyTo)
        .limit(1)
        .single();

      if (existingByMessageId) {
        existingThreadId = existingByMessageId.thread_id;
        console.log("Found thread by email_message_id (contractor reply):", existingThreadId);
      } else {
        // Fallback to checking by message id
        const { data: existingMessage } = await supabase
          .from("communication_messages")
          .select("thread_id")
          .eq("id", inReplyTo)
          .limit(1)
          .single();

        if (existingMessage) {
          existingThreadId = existingMessage.thread_id;
          console.log("Found thread by in-reply-to:", existingThreadId);
        }
      }
    }

    // Check if this sender matches an external_recipient_email (reply from a client to a contractor)
    if (!existingThreadId && senderInfo.email !== "unknown@unknown.com") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Look for threads where the sender was the external recipient (client replying)
      const { data: clientReplyThread } = await supabase
        .from("communication_threads")
        .select("id, initiator_id")
        .eq("external_recipient_email", senderInfo.email.toLowerCase().trim())
        .neq("status", "resolved")
        .neq("status", "archived")
        .gte("last_message_at", thirtyDaysAgo.toISOString())
        .order("last_message_at", { ascending: false })
        .limit(1)
        .single();

      if (clientReplyThread) {
        existingThreadId = clientReplyThread.id;
        console.log("Found thread by external_recipient_email (client reply to contractor):", existingThreadId);
      }
    }

    // Also check by sender email for recent open threads (within 7 days)
    if (!existingThreadId && senderInfo.email !== "unknown@unknown.com") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: recentThread } = await supabase
        .from("communication_threads")
        .select("id")
        .eq("initiator_email", senderInfo.email)
        .neq("status", "resolved")
        .neq("status", "archived")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (recentThread) {
        existingThreadId = recentThread.id;
        console.log("Found recent thread by sender email:", existingThreadId);
      }
    }

    let threadId: string;

    if (existingThreadId) {
      threadId = existingThreadId;
      console.log("Adding message to existing thread:", threadId);

      // Update thread status and last message time
      await supabase
        .from("communication_threads")
        .update({
          status: "unread",
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", threadId);
    } else {
      console.log("Creating new thread for inbound email");

      const { data: newThread, error: threadError } = await supabase
        .from("communication_threads")
        .insert({
          channel_type: "email",
          subject: subject,
          initiator_email: senderInfo.email,
          initiator_name: senderInfo.name,
          initiator_role: "visitor",
          email_category: routing.category,
          email_identity_id: emailIdentity?.id || null,
          status: "unread",
          priority: routing.priority,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (threadError) {
        console.error("Error creating thread:", threadError);
        throw threadError;
      }

      threadId = newThread.id;
      console.log("Created new thread:", threadId);
    }

    // Create the message
    const { data: message, error: messageError } = await supabase
      .from("communication_messages")
      .insert({
        thread_id: threadId,
        sender_role: "visitor",
        sender_name: senderInfo.name,
        sender_email: senderInfo.email,
        content: messageText || messageHtml || "(No content)",
        html_content: messageHtml || null,
      })
      .select("id")
      .single();

    if (messageError) {
      console.error("Error creating message:", messageError);
      throw messageError;
    }

    console.log("Created message:", message.id);

    // Handle attachments if present
    const attachments = rawData.attachments || rawData.Attachments || [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      console.log("Processing", attachments.length, "attachments");
      
      for (const attachment of attachments) {
        try {
          const filename = attachment.filename || attachment.name || attachment.Name || "attachment";
          const contentType = attachment.content_type || attachment.ContentType || attachment.type || "application/octet-stream";
          const content = attachment.content || attachment.Content || attachment.data;
          
          if (!content) continue;
          
          // Decode base64 content
          const binaryContent = Uint8Array.from(atob(content), c => c.charCodeAt(0));
          
          // Upload to storage
          const filePath = `${threadId}/${message.id}/${filename}`;
          const { error: uploadError } = await supabase.storage
            .from("communication-attachments")
            .upload(filePath, binaryContent, { contentType });

          if (uploadError) {
            console.error("Error uploading attachment:", uploadError);
            continue;
          }

          // Create attachment record
          await supabase
            .from("communication_attachments")
            .insert({
              message_id: message.id,
              file_name: filename,
              file_path: filePath,
              file_type: contentType,
              file_size: binaryContent.length,
              status: "approved",
            });
            
          console.log("Attachment saved:", filename);
        } catch (attachError) {
          console.error("Error processing attachment:", attachError);
        }
      }
    }

    // Create admin notification
    await supabase
      .from("admin_notifications")
      .insert({
        type: "email",
        title: `New Email: ${subject}`,
        message: `From: ${senderInfo.name} <${senderInfo.email}>`,
        metadata: {
          thread_id: threadId,
          message_id: message.id,
          from_email: senderInfo.email,
          from_name: senderInfo.name,
          to_email: recipientInfo.email,
          category: routing.category,
          subject: subject,
        },
      });

    // If this is a reply to a contractor's email (client replying), FORWARD the email to contractor
    // Look up the thread to get the initiator (contractor) info
    const { data: threadInfo } = await supabase
      .from("communication_threads")
      .select("initiator_id, initiator_email, initiator_name, external_recipient_email")
      .eq("id", threadId)
      .single();

    // If there's an initiator_id and the sender matches the external_recipient_email, it's a client reply
    if (threadInfo?.initiator_id && 
        threadInfo?.external_recipient_email && 
        senderInfo.email.toLowerCase().trim() === threadInfo.external_recipient_email.toLowerCase().trim()) {
      
      // Get contractor's portal user info
      const { data: portalUser } = await supabase
        .from("portal_users")
        .select("email, legal_full_name, user_id")
        .eq("user_id", threadInfo.initiator_id)
        .single();

      if (portalUser?.email) {
        console.log("Forwarding client reply to contractor's personal email:", portalUser.email);
        
        // Get the last message from the thread for threading purposes
        const { data: lastMessage } = await supabase
          .from("communication_messages")
          .select("email_message_id")
          .eq("thread_id", threadId)
          .not("email_message_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        try {
          // Forward the email to contractor's personal email (branded, client email hidden)
          const forwardResponse = await fetch(`${supabaseUrl}/functions/v1/forward-to-contractor`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              contractorEmail: portalUser.email,
              contractorName: portalUser.legal_full_name || portalUser.email,
              contractorId: portalUser.user_id,
              clientEmail: senderInfo.email,
              clientName: senderInfo.name,
              subject: subject,
              messageText: messageText || messageHtml || '',
              messageHtml: messageHtml,
              threadId: threadId,
              messageId: message.id,
              inReplyToMessageId: lastMessage?.email_message_id || null
            })
          });
          
          if (!forwardResponse.ok) {
            console.error("Failed to forward email to contractor:", await forwardResponse.text());
          } else {
            console.log("Email forwarded to contractor successfully");
          }
        } catch (forwardError) {
          console.error("Error forwarding email to contractor:", forwardError);
        }
        
        // Also send in-app notification
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              type: 'client_reply',
              recipient_email: portalUser.email,
              recipient_name: portalUser.legal_full_name || portalUser.email,
              recipient_type: 'contractor',
              sender_name: senderInfo.name,
              sender_email: senderInfo.email,
              subject: `Client Reply: ${subject}`,
              message_preview: (messageText || messageHtml || '').substring(0, 200),
              thread_id: threadId,
              metadata: {
                message_id: message.id,
                client_email: senderInfo.email
              }
            })
          });
        } catch (notifyError) {
          console.error("Error sending in-app notification:", notifyError);
        }
      }
    }

    // Log to audit
    await supabase
      .from("communication_audit_log")
      .insert({
        thread_id: threadId,
        message_id: message.id,
        action: "inbound_email_received",
        actor_email: senderInfo.email,
        actor_role: "visitor",
        details: {
          from_name: senderInfo.name,
          from_email: senderInfo.email,
          to_email: recipientInfo.email,
          subject: subject,
          message_length: messageText.length,
          has_attachments: attachments.length > 0,
        },
      });

    console.log("=== INBOUND EMAIL PROCESSED SUCCESSFULLY ===");

    return new Response(
      JSON.stringify({
        success: true,
        thread_id: threadId,
        message_id: message.id,
        parsed: {
          from: senderInfo,
          to: recipientInfo,
          subject: subject,
          content_length: messageText.length,
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("=== INBOUND EMAIL ERROR ===");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
