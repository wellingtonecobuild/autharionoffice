import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

// Validate URL accessibility via edge function
export const validateUrlAccessibility = async (url: string): Promise<{ valid: boolean; error?: string; normalizedUrl?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('validate-url', {
      body: { url },
    });

    if (error) {
      console.error('URL validation error:', error);
      return { valid: false, error: 'Could not validate URL' };
    }

    return data;
  } catch (err) {
    console.error('URL validation failed:', err);
    return { valid: false, error: 'Validation service unavailable' };
  }
};

// Website URL normalization - accepts domains without protocol
export const normalizeWebsiteUrl = (url: string | undefined | null): string | null => {
  if (!url || url.trim() === '') return null;
  
  let cleaned = url.trim();
  
  // If it already has a protocol, return as-is
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    return cleaned;
  }
  
  // Remove any accidental leading slashes
  cleaned = cleaned.replace(/^\/+/, '');
  
  // Prepend https:// by default
  return `https://${cleaned}`;
};

// Display website without protocol (for clean frontend display)
export const displayWebsiteUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '');
};

// Website validation - accepts domains with or without protocol
// Only blocks clearly invalid entries
export const websiteSchema = z.string()
  .optional()
  .refine((val) => {
    if (!val || val.trim() === '') return true;
    
    const cleaned = val.trim();
    
    // Block if contains spaces
    if (cleaned.includes(' ')) return false;
    
    // Block if it's clearly not a domain (just numbers, single word without dots for short entries)
    // Allow short entries like "test.com" or even "t.co"
    if (!/[a-zA-Z]/.test(cleaned)) return false; // Must contain at least one letter
    
    // If it has a protocol, validate the full URL loosely
    if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
      // Basic check that something follows the protocol
      return cleaned.length > 8;
    }
    
    // For domains without protocol, just check basic validity
    // Must have at least one dot or be a reasonable domain format
    // Allow: example.com, www.example.com, sub.domain.co.nz
    // Block: abc, 123, hello (no TLD)
    return cleaned.includes('.') || cleaned.length <= 3; // Allow short entries for flexibility
  }, {
    message: "Please enter a valid website address",
  });

// Lead form validation schema
export const leadFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long").trim(),
  email: z.string().email("Invalid email address").max(255, "Email too long").toLowerCase().trim(),
  phone: z.string().max(20, "Phone number too long").optional().or(z.literal("")),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000, "Message too long").trim(),
});

// Contact form validation schema
export const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long").trim(),
  email: z.string().email("Invalid email address").max(255, "Email too long").toLowerCase().trim(),
  subject: z.string().max(200, "Subject too long").optional().or(z.literal("")),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000, "Message too long").trim(),
});

// Newsletter email validation schema
export const newsletterSchema = z.object({
  email: z.string().email("Invalid email address").max(255, "Email too long").toLowerCase().trim(),
});

export type LeadFormData = z.infer<typeof leadFormSchema>;
export type ContactFormData = z.infer<typeof contactFormSchema>;
export type NewsletterData = z.infer<typeof newsletterSchema>;
