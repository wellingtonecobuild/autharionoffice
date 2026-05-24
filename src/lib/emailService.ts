import { supabase } from "@/integrations/supabase/client";

// Wellington EcoBuild Branded Email Service
// Uses edge function for sending professionally branded emails

interface SendBrandedEmailParams {
  to: string;
  type: 'password_reset' | 'verification' | 'welcome' | 'notification' | 'article_status';
  data: {
    recipientName?: string;
    resetLink?: string;
    verificationLink?: string;
    loginLink?: string;
    subject?: string;
    message?: string;
    ctaText?: string;
    ctaLink?: string;
    articleTitle?: string;
    status?: 'approved' | 'rejected';
    rejectionReason?: string;
    articleLink?: string;
  };
}

export const sendBrandedEmail = async (params: SendBrandedEmailParams): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-branded-email', {
      body: params,
    });

    if (error) {
      console.error("Error sending branded email:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error invoking send-branded-email function:", error);
    return { success: false, error: error.message };
  }
};

// Send password reset email with Wellington EcoBuild branding
export const sendPasswordResetEmail = async (
  email: string,
  resetLink: string,
  recipientName?: string
): Promise<{ success: boolean; error?: string }> => {
  return sendBrandedEmail({
    to: email,
    type: 'password_reset',
    data: { recipientName, resetLink },
  });
};

// Send verification email with Wellington EcoBuild branding
export const sendVerificationEmail = async (
  email: string,
  verificationLink: string,
  recipientName?: string
): Promise<{ success: boolean; error?: string }> => {
  return sendBrandedEmail({
    to: email,
    type: 'verification',
    data: { recipientName, verificationLink },
  });
};

// Send welcome email with Wellington EcoBuild branding
export const sendWelcomeEmail = async (
  email: string,
  recipientName?: string
): Promise<{ success: boolean; error?: string }> => {
  return sendBrandedEmail({
    to: email,
    type: 'welcome',
    data: { recipientName },
  });
};

// Send article status notification with Wellington EcoBuild branding
export const sendArticleStatusEmail = async (
  email: string,
  articleTitle: string,
  status: 'approved' | 'rejected',
  recipientName?: string,
  rejectionReason?: string,
  articleLink?: string
): Promise<{ success: boolean; error?: string }> => {
  return sendBrandedEmail({
    to: email,
    type: 'article_status',
    data: { recipientName, articleTitle, status, rejectionReason, articleLink },
  });
};

// Send custom notification with Wellington EcoBuild branding
export const sendNotificationEmail = async (
  email: string,
  subject: string,
  message: string,
  recipientName?: string,
  ctaText?: string,
  ctaLink?: string
): Promise<{ success: boolean; error?: string }> => {
  return sendBrandedEmail({
    to: email,
    type: 'notification',
    data: { recipientName, subject, message, ctaText, ctaLink },
  });
};

// Legacy functions - kept for backward compatibility
interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface NotifyAdminParams {
  type: "contact" | "newsletter" | "referral" | "lead";
  data: Record<string, unknown>;
}

// Legacy function - notifications are now handled automatically via database triggers
export const sendEmail = async (_params: SendEmailParams): Promise<{ success: boolean; error?: string }> => {
  console.log("Email notifications are now handled via database triggers");
  return { success: true };
};

// Legacy function - notifications are now handled automatically via database triggers
export const notifyAdmin = async (_params: NotifyAdminParams): Promise<{ success: boolean; error?: string }> => {
  console.log("Admin notifications are now handled automatically via database triggers");
  return { success: true };
};

// Newsletter confirmation - notification stored via database trigger
export const sendNewsletterConfirmation = async (_email: string): Promise<{ success: boolean; error?: string }> => {
  console.log("Newsletter subscription recorded - admin notified via database trigger");
  return { success: true };
};

// Referral confirmation - notification stored via database trigger
export const sendReferralConfirmation = async (
  _referrerEmail: string,
  _referrerName: string,
  _referredCompanyName: string,
  _referralPlan: string,
  _referralCode: string
): Promise<{ success: boolean; error?: string }> => {
  console.log("Referral recorded - admin notified via database trigger");
  return { success: true };
};
