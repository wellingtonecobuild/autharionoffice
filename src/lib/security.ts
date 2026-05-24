/**
 * Security Utilities for Wellington EcoBuild
 * Handles email obfuscation, rate limiting, input sanitization, and security checks
 */

// Rate limiting storage (in-memory for client-side, backed by localStorage for persistence)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Obfuscate email to prevent scraping
 * Converts email to a format that's hard for bots to parse
 */
export const obfuscateEmail = (email: string): string => {
  if (!email) return '';
  // Replace @ and . with encoded entities
  return email
    .replace('@', '&#64;')
    .replace(/\./g, '&#46;');
};

/**
 * Create a protected email link that requires user interaction
 * Returns an encoded mailto link
 */
export const createProtectedEmailLink = (email: string): string => {
  if (!email) return '';
  // Base64 encode the email
  const encoded = btoa(email);
  return `data:email,${encoded}`;
};

/**
 * Decode a protected email link
 */
export const decodeProtectedEmail = (encoded: string): string => {
  if (!encoded) return '';
  try {
    const base64 = encoded.replace('data:email,', '');
    return atob(base64);
  } catch {
    return '';
  }
};

/**
 * Generate a random token for CSRF protection
 */
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Get or create a CSRF token for the session
 */
export const getCSRFToken = (): string => {
  let token = sessionStorage.getItem('csrf_token');
  if (!token) {
    token = generateCSRFToken();
    sessionStorage.setItem('csrf_token', token);
  }
  return token;
};

/**
 * Validate CSRF token
 */
export const validateCSRFToken = (token: string): boolean => {
  const storedToken = sessionStorage.getItem('csrf_token');
  return storedToken === token && token.length === 64;
};

/**
 * Client-side rate limiting
 * Returns true if the action is allowed, false if rate limited
 */
export const checkRateLimit = (
  action: string,
  maxAttempts: number = 5,
  windowMs: number = 60000
): { allowed: boolean; remainingAttempts: number; resetIn: number } => {
  const now = Date.now();
  const key = `rate_${action}`;
  
  // Try to load from localStorage for persistence
  const stored = localStorage.getItem(key);
  let entry = stored ? JSON.parse(stored) : rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs };
  }
  
  entry.count++;
  
  // Store both in memory and localStorage
  rateLimitStore.set(key, entry);
  localStorage.setItem(key, JSON.stringify(entry));
  
  const allowed = entry.count <= maxAttempts;
  const remainingAttempts = Math.max(0, maxAttempts - entry.count);
  const resetIn = Math.max(0, entry.resetTime - now);
  
  return { allowed, remainingAttempts, resetIn };
};

/**
 * Reset rate limit for an action
 */
export const resetRateLimit = (action: string): void => {
  const key = `rate_${action}`;
  rateLimitStore.delete(key);
  localStorage.removeItem(key);
};

/**
 * Sanitize HTML input to prevent XSS
 */
export const sanitizeHTML = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitize input for use in SQL-like queries (defense in depth)
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/['"`;\\]/g, '')
    .trim()
    .slice(0, 1000); // Limit length
};

/**
 * Validate file upload
 */
export const validateFileUpload = (
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } => {
  const { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] } = options;
  
  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit` };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not allowed` };
  }
  
  // Check for double extensions (potential attack vector)
  const nameParts = file.name.split('.');
  if (nameParts.length > 2) {
    const suspiciousExtensions = ['exe', 'bat', 'cmd', 'sh', 'php', 'js', 'html'];
    if (suspiciousExtensions.some(ext => nameParts.slice(0, -1).some(part => part.toLowerCase() === ext))) {
      return { valid: false, error: 'Suspicious file name detected' };
    }
  }
  
  return { valid: true };
};

/**
 * Detect potential bot activity based on behavior patterns
 */
export const detectBotBehavior = (): { isBot: boolean; score: number; reasons: string[] } => {
  const reasons: string[] = [];
  let score = 0;
  
  // Check for headless browser indicators
  if (navigator.webdriver) {
    score += 50;
    reasons.push('Automated browser detected');
  }
  
  // Check for unusual screen dimensions
  if (window.screen.width === 0 || window.screen.height === 0) {
    score += 30;
    reasons.push('No screen dimensions');
  }
  
  // Check for missing plugins (common in headless browsers)
  if (navigator.plugins.length === 0) {
    score += 20;
    reasons.push('No browser plugins');
  }
  
  // Check for unusual language settings
  if (!navigator.language) {
    score += 20;
    reasons.push('No language setting');
  }
  
  // Check for missing touch support on mobile devices (might indicate emulation)
  const isMobileUA = /mobile/i.test(navigator.userAgent);
  const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isMobileUA && !hasTouchSupport) {
    score += 25;
    reasons.push('Mobile UA without touch support');
  }
  
  return {
    isBot: score >= 50,
    score,
    reasons
  };
};

/**
 * Generate honeypot field name
 * Returns a field name that looks legitimate but should never be filled by real users
 */
export const getHoneypotFieldName = (): string => {
  const names = ['website_url', 'company_phone', 'fax_number', 'secondary_email'];
  return names[Math.floor(Math.random() * names.length)];
};

/**
 * Track form submission timing for bot detection
 */
let formLoadTime: number | null = null;

export const markFormLoaded = (): void => {
  formLoadTime = Date.now();
};

export const getFormFillDuration = (): number => {
  if (!formLoadTime) return 0;
  return Date.now() - formLoadTime;
};

/**
 * Check if form was filled too quickly (likely a bot)
 * Most humans take at least 3 seconds to fill a form
 */
export const isFormFilledTooQuickly = (minDurationMs: number = 3000): boolean => {
  return getFormFillDuration() < minDurationMs;
};

/**
 * Generate a fingerprint for abuse tracking (privacy-respecting)
 */
export const generateSessionFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Wellington EcoBuild', 2, 2);
  }
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    canvas.toDataURL().slice(-50)
  ];
  
  // Simple hash function
  const hash = components.join('|');
  let hashCode = 0;
  for (let i = 0; i < hash.length; i++) {
    const char = hash.charCodeAt(i);
    hashCode = ((hashCode << 5) - hashCode) + char;
    hashCode = hashCode & hashCode;
  }
  
  return Math.abs(hashCode).toString(36);
};

/**
 * Security headers that should be set by the server
 * This is a reference for what's expected
 */
export const RECOMMENDED_SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mapbox.com;",
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)'
} as const;
