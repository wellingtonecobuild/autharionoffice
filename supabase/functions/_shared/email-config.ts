// Wellington EcoBuild Shared Email Configuration
// SINGLE EMAIL SYSTEM - All communications use info@wellingtonecobuild.nz

// ============================================
// CORE RULE: ONLY ONE EMAIL ADDRESS
// ============================================
export const PRIMARY_EMAIL = "info@wellingtonecobuild.nz";

export const BRAND = {
  name: "Wellington EcoBuild",
  tagline: "Wellington's Verified Directory for Qualified Builders & Construction Companies",
  website: "https://wellingtonecobuild.nz",
  email: PRIMARY_EMAIL,
  logoUrl: "https://duumxykzcliujgyrmzvn.supabase.co/storage/v1/object/public/avatars/wellington-ecobuild-logo-PQDk3oCl.png",
  colors: {
    primary: "#2D5A3D",
    secondary: "#C4A962",
    background: "#FFFFFF",
    text: "#1A1A1A",
    muted: "#6B7280",
  },
};

// Standard email wrapper with proper encoding
export const createEmailWrapper = (content: string, title: string = BRAND.name): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F5F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: ${BRAND.colors.text};">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F5F5; padding: 24px;">
<tr>
<td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: ${BRAND.colors.background}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
<tr>
<td style="background: linear-gradient(135deg, ${BRAND.colors.primary} 0%, #1E3D2A 100%); padding: 32px; text-align: center;">
<img src="${BRAND.logoUrl}" alt="${BRAND.name}" style="max-width: 180px; height: auto; display: block; margin: 0 auto;">
</td>
</tr>
<tr>
<td style="padding: 40px 32px;">
${content}
</td>
</tr>
<tr>
<td style="background-color: #F9FAFB; padding: 24px 32px; text-align: center; border-top: 1px solid #E5E7EB;">
<p style="font-size: 16px; font-weight: 600; color: ${BRAND.colors.primary}; margin: 0 0 4px 0;">${BRAND.name}</p>
<p style="font-size: 14px; color: ${BRAND.colors.muted}; margin: 0 0 12px 0;">${BRAND.tagline}</p>
<a href="mailto:${BRAND.email}" style="font-size: 14px; color: ${BRAND.colors.primary}; text-decoration: none;">${BRAND.email}</a>
<p style="font-size: 12px; color: #9CA3AF; margin-top: 16px;">
&copy; ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.
</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
};

// Standard button style
export const createButton = (text: string, url: string, style: 'primary' | 'secondary' = 'primary'): string => {
  const bgColor = style === 'primary' 
    ? `linear-gradient(135deg, ${BRAND.colors.primary} 0%, #1E3D2A 100%)` 
    : 'transparent';
  const textColor = style === 'primary' ? '#FFFFFF' : BRAND.colors.primary;
  const border = style === 'secondary' ? `2px solid ${BRAND.colors.primary}` : 'none';
  
  return `<a href="${url}" style="display: inline-block; background: ${bgColor}; color: ${textColor}; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; border: ${border};">${text}</a>`;
};

// Highlight box
export const createHighlightBox = (content: string, color: string = BRAND.colors.primary): string => {
  return `<div style="background-color: ${color}10; border-left: 4px solid ${color}; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">${content}</div>`;
};
