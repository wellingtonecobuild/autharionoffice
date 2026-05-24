// Wellington EcoBuild Email Identities
// SINGLE EMAIL SYSTEM - All communications use info@wellingtonecobuild.nz

// ============================================
// CORE RULE: ONLY ONE EMAIL ADDRESS
// ============================================
// The ONLY working and permitted email is: info@wellingtonecobuild.nz
// All system emails, replies, notifications, support, verification, 
// billing, password resets, and admin communications use this single address.

export const PRIMARY_EMAIL = "info@wellingtonecobuild.nz";

// Sender Mode Types
export type SenderMode = 'company' | 'admin';

export interface SenderModeConfig {
  mode: SenderMode;
  displayName: string;
  signatureStyle: 'corporate' | 'personal';
  showAdminLabel: boolean;
  legalFooter: boolean;
}

// Sender Mode Configurations
export const SENDER_MODES: Record<SenderMode, SenderModeConfig> = {
  company: {
    mode: 'company',
    displayName: 'Wellington EcoBuild',
    signatureStyle: 'corporate',
    showAdminLabel: false,
    legalFooter: true
  },
  admin: {
    mode: 'admin',
    displayName: 'Wellington EcoBuild Admin',
    signatureStyle: 'personal',
    showAdminLabel: true,
    legalFooter: false
  }
};

// Smart routing - maps action types to sender modes
// NOTE: All routes use PRIMARY_EMAIL (info@wellingtonecobuild.nz)
export const SMART_EMAIL_ROUTING: Record<string, { category: string; mode: SenderMode }> = {
  // Verification actions -> Company mode
  verification_approved: { category: 'verification', mode: 'company' },
  verification_declined: { category: 'verification', mode: 'company' },
  listing_approved: { category: 'verification', mode: 'company' },
  listing_declined: { category: 'verification', mode: 'company' },
  document_request: { category: 'verification', mode: 'company' },
  
  // Billing actions -> Company mode
  subscription_started: { category: 'billing', mode: 'company' },
  subscription_renewed: { category: 'billing', mode: 'company' },
  payment_success: { category: 'billing', mode: 'company' },
  payment_failed: { category: 'billing', mode: 'company' },
  subscription_created: { category: 'billing', mode: 'company' },
  subscription_cancelled: { category: 'billing', mode: 'company' },
  invoice_sent: { category: 'billing', mode: 'company' },
  
  // System notifications -> Company mode
  welcome: { category: 'info', mode: 'company' },
  password_reset: { category: 'security', mode: 'company' },
  password_changed: { category: 'security', mode: 'company' },
  email_verification: { category: 'security', mode: 'company' },
  
  // Manual replies -> Admin mode
  admin_reply: { category: 'support', mode: 'admin' },
  manual_reply: { category: 'support', mode: 'admin' },
  chat_follow_up: { category: 'support', mode: 'admin' },
  
  // Default
  general: { category: 'info', mode: 'company' }
};

// Unified email identity - ALL categories use the same email
export const EMAIL_IDENTITY = {
  address: PRIMARY_EMAIL,
  displayName: "Wellington EcoBuild",
  adminDisplayName: "Wellington EcoBuild Admin",
  replyTo: PRIMARY_EMAIL,
};

// Legacy support: EMAIL_IDENTITIES object (all point to same email)
export const EMAIL_IDENTITIES = {
  info: {
    address: PRIMARY_EMAIL,
    displayName: "Wellington EcoBuild",
    adminDisplayName: "Wellington EcoBuild Admin",
    description: "All communications",
    category: "info",
    icon: "Mail",
    isPublic: true,
    defaultMode: 'company' as SenderMode
  },
  support: {
    address: PRIMARY_EMAIL,
    displayName: "Wellington EcoBuild",
    adminDisplayName: "Wellington EcoBuild Admin",
    description: "Support communications",
    category: "support",
    icon: "HelpCircle",
    isPublic: true,
    defaultMode: 'admin' as SenderMode
  },
  billing: {
    address: PRIMARY_EMAIL,
    displayName: "Wellington EcoBuild",
    adminDisplayName: "Wellington EcoBuild Admin",
    description: "Billing communications",
    category: "billing",
    icon: "CreditCard",
    isPublic: true,
    defaultMode: 'company' as SenderMode
  },
  verification: {
    address: PRIMARY_EMAIL,
    displayName: "Wellington EcoBuild",
    adminDisplayName: "Wellington EcoBuild Admin",
    description: "Verification communications",
    category: "verification",
    icon: "Shield",
    isPublic: true,
    defaultMode: 'company' as SenderMode
  },
  admin: {
    address: PRIMARY_EMAIL,
    displayName: "Wellington EcoBuild Admin",
    adminDisplayName: "Wellington EcoBuild Administrator",
    description: "Admin communications",
    category: "admin",
    icon: "Lock",
    isPublic: false,
    defaultMode: 'admin' as SenderMode
  }
} as const;

export type EmailCategory = keyof typeof EMAIL_IDENTITIES;

// Get email address - ALWAYS returns PRIMARY_EMAIL
export const getEmailByCategory = (category?: EmailCategory): string => {
  return PRIMARY_EMAIL;
};

// Get display name by mode
export const getDisplayName = (category?: EmailCategory, mode: SenderMode = 'company'): string => {
  return mode === 'admin' ? EMAIL_IDENTITY.adminDisplayName : EMAIL_IDENTITY.displayName;
};

// Legacy support
export const getDisplayNameByCategory = (category?: EmailCategory): string => {
  return EMAIL_IDENTITY.displayName;
};

// Get sender configuration based on action type
export const getSenderConfig = (actionType: string): { category: string; mode: SenderMode; displayName: string; address: string } => {
  const routing = SMART_EMAIL_ROUTING[actionType] || SMART_EMAIL_ROUTING.general;
  
  return {
    category: routing.category,
    mode: routing.mode,
    displayName: getDisplayName(undefined, routing.mode),
    address: PRIMARY_EMAIL
  };
};

// Page to email mapping (all use same email)
export const PAGE_EMAIL_MAPPING = {
  footer: "info",
  contact: "info",
  homepage: "info",
  about: "info",
  auth: "info",
  login: "info",
  dashboard: "info",
  faq: "info",
  billing: "info",
  payments: "info",
  invoices: "info",
  subscription: "info",
  verification: "info",
  listingApproval: "info",
  documentUpload: "info",
  partnerships: "info",
  industry: "info",
  pricing: "info",
  premium: "info",
  elite: "info",
  featured: "info",
  terms: "info",
  privacy: "info",
  legal: "info",
  complaints: "info",
  strategic: "info",
  media: "info"
} as const;

// Default company info
export const COMPANY_INFO = {
  name: "Wellington EcoBuild",
  tagline: "Wellington's Trusted Network for Sustainable Construction",
  website: "https://wellingtonecobuild.nz",
  location: "Wellington, New Zealand",
  founder: "Beveck Chiwawa",
  primaryEmail: PRIMARY_EMAIL,
  logoUrl: "https://duumxykzcliujgyrmzvn.supabase.co/storage/v1/object/public/avatars/wellington-ecobuild-logo-PQDk3oCl.png"
};

// Public emails for display (single email)
export const PUBLIC_EMAILS = [
  {
    address: PRIMARY_EMAIL,
    displayName: "Wellington EcoBuild",
    description: "All enquiries and communications",
    category: "info"
  }
];

// Get sender mode config
export const getSenderModeConfig = (mode: SenderMode): SenderModeConfig => {
  return SENDER_MODES[mode];
};
