// Wellington EcoBuild Branded Email Templates

const BRAND = {
  name: "Wellington EcoBuild",
  tagline: "Wellington's Verified Directory for Qualified Builders & Construction Companies",
  website: "https://wellingtonecobuild.nz",
  email: "info@wellingtonecobuild.nz",
  // Logo hosted on Supabase storage for reliable access in emails
  logoUrl: "https://duumxykzcliujgyrmzvn.supabase.co/storage/v1/object/public/avatars/wellington-ecobuild-logo-PQDk3oCl.png",
  colors: {
    primary: "#2D5A3D", // Brand green
    secondary: "#C4A962", // Muted gold
    background: "#FFFFFF",
    text: "#1A1A1A",
    muted: "#6B7280",
  },
};

const baseStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: ${BRAND.colors.text};
    background-color: #F5F5F5;
    margin: 0;
    padding: 0;
  }
  .container {
    max-width: 700px;
    margin: 0 auto;
    background-color: ${BRAND.colors.background};
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  .header {
    background: linear-gradient(135deg, ${BRAND.colors.primary} 0%, #1E3D2A 100%);
    padding: 32px 24px;
    text-align: center;
  }
  .logo {
    max-width: 180px;
    height: auto;
  }
  .content {
    padding: 40px 32px;
  }
  .headline {
    font-size: 24px;
    font-weight: 700;
    color: ${BRAND.colors.text};
    margin: 0 0 16px 0;
    text-align: center;
  }
  .text {
    font-size: 16px;
    color: ${BRAND.colors.muted};
    margin: 0 0 24px 0;
    text-align: center;
  }
  .button {
    display: inline-block;
    background: linear-gradient(135deg, ${BRAND.colors.primary} 0%, #1E3D2A 100%);
    color: #FFFFFF !important;
    text-decoration: none;
    padding: 16px 32px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    text-align: center;
    margin: 8px 0;
  }
  .button:hover {
    opacity: 0.9;
  }
  .button-container {
    text-align: center;
    margin: 32px 0;
  }
  .fallback-link {
    font-size: 14px;
    color: ${BRAND.colors.muted};
    text-align: center;
    word-break: break-all;
    margin-top: 16px;
  }
  .fallback-link a {
    color: ${BRAND.colors.primary};
  }
  .security-note {
    background-color: #FEF3C7;
    border-left: 4px solid ${BRAND.colors.secondary};
    padding: 16px;
    margin: 24px 0;
    font-size: 14px;
    color: #92400E;
    border-radius: 0 8px 8px 0;
  }
  .divider {
    height: 1px;
    background-color: #E5E7EB;
    margin: 32px 0;
  }
  .footer {
    background-color: #F9FAFB;
    padding: 24px 32px;
    text-align: center;
    border-top: 1px solid #E5E7EB;
  }
  .footer-brand {
    font-size: 16px;
    font-weight: 600;
    color: ${BRAND.colors.primary};
    margin: 0 0 4px 0;
  }
  .footer-tagline {
    font-size: 14px;
    color: ${BRAND.colors.muted};
    margin: 0 0 12px 0;
  }
  .footer-link {
    font-size: 14px;
    color: ${BRAND.colors.primary};
    text-decoration: none;
  }
  .footer-legal {
    font-size: 12px;
    color: #9CA3AF;
    margin-top: 16px;
  }
  .section-box {
    background-color: #F9FAFB;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    padding: 24px;
    margin: 24px 0;
  }
  .section-title {
    font-size: 18px;
    font-weight: 700;
    color: ${BRAND.colors.primary};
    margin: 0 0 16px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-content {
    font-size: 15px;
    color: ${BRAND.colors.text};
    line-height: 1.8;
  }
  .highlight-box {
    background: linear-gradient(135deg, ${BRAND.colors.primary}10 0%, ${BRAND.colors.primary}05 100%);
    border: 2px solid ${BRAND.colors.primary};
    border-radius: 8px;
    padding: 24px;
    margin: 24px 0;
  }
  .value-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin: 12px 0;
    padding: 12px;
    background: white;
    border-radius: 6px;
    border-left: 3px solid ${BRAND.colors.primary};
  }
  .value-number {
    background: ${BRAND.colors.primary};
    color: white;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
    flex-shrink: 0;
  }
  .contact-table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
  }
  .contact-table td {
    padding: 12px 16px;
    border-bottom: 1px solid #E5E7EB;
    font-size: 15px;
  }
  .contact-table td:first-child {
    font-weight: 600;
    color: ${BRAND.colors.primary};
    width: 140px;
  }
  .script-box {
    background: #1E3D2A;
    color: white;
    border-radius: 8px;
    padding: 24px;
    margin: 16px 0;
    font-family: Georgia, serif;
    font-style: italic;
    font-size: 16px;
    line-height: 1.8;
  }
  .badge {
    display: inline-block;
    background: ${BRAND.colors.primary};
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const createEmailWrapper = (content: string, wideContainer: boolean = false): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND.name}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div style="padding: 24px;">
    <div class="container" style="${wideContainer ? 'max-width: 800px;' : ''}">
      <div class="header">
        <img src="${BRAND.logoUrl}" alt="${BRAND.name}" class="logo" />
      </div>
      ${content}
      <div class="footer">
        <p class="footer-brand">${BRAND.name}</p>
        <p class="footer-tagline">${BRAND.tagline}</p>
        <a href="${BRAND.website}" class="footer-link">${BRAND.website.replace('https://', '')}</a>
        <p style="margin: 8px 0; font-size: 14px; color: ${BRAND.colors.muted};">
          <a href="mailto:${BRAND.email}" style="color: ${BRAND.colors.primary}; text-decoration: none;">${BRAND.email}</a>
        </p>
        <p class="footer-legal">
          © ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.<br>
          This email was sent to you because you have an account with ${BRAND.name}.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

export interface PasswordResetEmailParams {
  recipientName?: string;
  resetLink: string;
}

export const createPasswordResetEmail = ({ recipientName, resetLink }: PasswordResetEmailParams): string => {
  const greeting = recipientName ? `Hi ${recipientName},` : "Hello,";
  
  const content = `
    <div class="content">
      <h1 class="headline">Password Reset Request</h1>
      <p class="text">
        ${greeting}<br><br>
        We received a request to reset your password for your ${BRAND.name} account. 
        Click the button below to create a new password.
      </p>
      
      <div class="button-container">
        <a href="${resetLink}" class="button">Reset Password</a>
      </div>
      
      <p class="fallback-link">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${resetLink}">${resetLink}</a>
      </p>
      
      <div class="security-note">
        <strong>Security Note:</strong> If you didn't request a password reset, you can safely ignore this email. 
        Your password will remain unchanged. This link will expire in 24 hours.
      </div>
    </div>
  `;
  
  return createEmailWrapper(content);
};

export interface VerificationEmailParams {
  recipientName?: string;
  verificationLink: string;
}

export const createVerificationEmail = ({ recipientName, verificationLink }: VerificationEmailParams): string => {
  const greeting = recipientName ? `Hi ${recipientName},` : "Hello,";
  
  const content = `
    <div class="content">
      <h1 class="headline">Verify Your Email Address</h1>
      <p class="text">
        ${greeting}<br><br>
        Welcome to ${BRAND.name}! Please verify your email address to complete your registration 
        and access Wellington's verified directory for qualified builders and construction professionals.
      </p>
      
      <div class="button-container">
        <a href="${verificationLink}" class="button">Verify Email</a>
      </div>
      
      <p class="fallback-link">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${verificationLink}">${verificationLink}</a>
      </p>
      
      <div class="security-note">
        <strong>Note:</strong> This verification link will expire in 24 hours. 
        If you didn't create an account, please ignore this email.
      </div>
    </div>
  `;
  
  return createEmailWrapper(content);
};

export interface WelcomeEmailParams {
  recipientName?: string;
  loginLink?: string;
}

export const createWelcomeEmail = ({ recipientName, loginLink = "https://wellingtonecobuild.nz/auth" }: WelcomeEmailParams): string => {
  const greeting = recipientName ? `Hi ${recipientName},` : "Hello,";
  
  const content = `
    <div class="content">
      <h1 class="headline">Welcome to Wellington EcoBuild!</h1>
      <p class="text">
        ${greeting}<br><br>
        Thank you for joining Wellington's verified directory for qualified builders and construction companies. 
        You now have access to verified builders, architects, and construction professionals 
        across the Wellington region.
      </p>
      
      <div class="button-container">
        <a href="${loginLink}" class="button">Get Started</a>
      </div>
      
      <div class="divider"></div>
      
      <p class="text" style="font-size: 14px;">
        <strong>What you can do:</strong><br>
        • Browse verified sustainable builders and suppliers<br>
        • Connect with eco-friendly construction professionals<br>
        • Stay updated with the latest industry news and insights<br>
        • Save and compare your favorite businesses
      </p>
    </div>
  `;
  
  return createEmailWrapper(content);
};

export interface NotificationEmailParams {
  recipientName?: string;
  subject: string;
  message: string;
  ctaText?: string;
  ctaLink?: string;
}

export const createNotificationEmail = ({ 
  recipientName, 
  subject, 
  message, 
  ctaText, 
  ctaLink 
}: NotificationEmailParams): string => {
  const greeting = recipientName ? `Hi ${recipientName},` : "Hello,";
  
  const ctaButton = ctaText && ctaLink ? `
    <div class="button-container">
      <a href="${ctaLink}" class="button">${ctaText}</a>
    </div>
  ` : '';
  
  const content = `
    <div class="content">
      <h1 class="headline">${subject}</h1>
      <p class="text">
        ${greeting}<br><br>
        ${message.replace(/\n/g, '<br>')}
      </p>
      ${ctaButton}
    </div>
  `;
  
  return createEmailWrapper(content);
};

export interface ArticleStatusEmailParams {
  recipientName?: string;
  articleTitle: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
  articleLink?: string;
}

export const createArticleStatusEmail = ({ 
  recipientName, 
  articleTitle, 
  status, 
  rejectionReason,
  articleLink 
}: ArticleStatusEmailParams): string => {
  const greeting = recipientName ? `Hi ${recipientName},` : "Hello,";
  const isApproved = status === 'approved';
  
  const statusMessage = isApproved 
    ? `Great news! Your article "<strong>${articleTitle}</strong>" has been approved and is now live on Wellington EcoBuild.`
    : `Thank you for your submission. Unfortunately, your article "<strong>${articleTitle}</strong>" was not approved at this time.`;
  
  const rejectionSection = !isApproved && rejectionReason ? `
    <div class="security-note" style="background-color: #FEE2E2; border-color: #EF4444;">
      <strong>Feedback from our editors:</strong><br>
      ${rejectionReason}
    </div>
  ` : '';
  
  const ctaButton = isApproved && articleLink ? `
    <div class="button-container">
      <a href="${articleLink}" class="button">View Your Article</a>
    </div>
  ` : !isApproved ? `
    <div class="button-container">
      <a href="https://wellingtonecobuild.nz/submit-article" class="button">Submit New Article</a>
    </div>
  ` : '';
  
  const content = `
    <div class="content">
      <h1 class="headline">Article ${isApproved ? 'Approved' : 'Review Complete'}</h1>
      <p class="text">
        ${greeting}<br><br>
        ${statusMessage}
      </p>
      ${rejectionSection}
      ${ctaButton}
    </div>
  `;
  
  return createEmailWrapper(content);
};

export interface ContractorOnboardingEmailParams {
  recipientName?: string;
}

export const createContractorOnboardingEmail = ({ recipientName }: ContractorOnboardingEmailParams): string => {
  const greeting = recipientName ? `Dear ${recipientName},` : "Dear Team Member,";
  
  const content = `
    <div class="content" style="padding: 32px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span class="badge">CONTRACTOR OUTREACH GUIDE</span>
        <h1 class="headline" style="margin-top: 16px; font-size: 26px;">Wellington EcoBuild</h1>
        <p style="color: ${BRAND.colors.muted}; font-size: 15px; margin: 0;">Outbound Business Development Guide</p>
      </div>

      <div class="divider"></div>

      <div class="section-box">
        <h2 class="section-title">About Wellington EcoBuild</h2>
        <div class="section-content">
          <p style="margin: 0 0 16px 0;"><strong>Wellington EcoBuild</strong> is New Zealand's trusted directory for verified builders and construction professionals in the Wellington region.</p>
          <table class="contact-table">
            <tr><td>Website</td><td><a href="${BRAND.website}" style="color: ${BRAND.colors.primary};">${BRAND.website}</a></td></tr>
            <tr><td>Email</td><td><a href="mailto:${BRAND.email}" style="color: ${BRAND.colors.primary};">${BRAND.email}</a></td></tr>
            <tr><td>Location</td><td>Wellington, New Zealand</td></tr>
          </table>
        </div>
      </div>

      <div class="highlight-box">
        <h2 class="section-title" style="margin: 0 0 16px 0;">Launch Offer</h2>
        <p style="margin: 0; font-size: 16px; line-height: 1.8;">We are listing the first <strong>20 qualified builders and construction professionals</strong> on our platform for <strong>FREE</strong>. They will receive our Premium Plan at no cost as part of our launch campaign.</p>
      </div>

      <div class="section-box">
        <h2 class="section-title">Your Role</h2>
        <div class="section-content">
          <p style="margin: 0 0 16px 0;">As a Wellington EcoBuild contractor, you will reach out to builders, construction companies, and tradespeople to invite them to be listed on our platform for free.</p>
          <ul style="margin: 0; padding-left: 20px; line-height: 2;">
            <li>Make outbound calls to potential businesses</li>
            <li>Send professional emails introducing our platform</li>
            <li>Explain the benefits of being listed</li>
            <li>Help them sign up for the free Premium listing</li>
          </ul>
        </div>
      </div>

      <div class="highlight-box">
        <h2 class="section-title" style="margin: 0 0 16px 0;">Phone Script</h2>
        <p style="margin: 0 0 12px 0; color: ${BRAND.colors.muted}; font-size: 14px;">Use this when calling builders:</p>
        <div class="script-box">
          "Good morning/afternoon, my name is [Your Name] calling from Wellington EcoBuild.<br><br>
          We are New Zealand's trusted directory for verified builders and construction professionals. As part of our launch, we are offering 20 free Premium listings to qualified businesses in the Wellington region.<br><br>
          I am calling to invite you to be listed on our platform at no cost. This includes a verified profile, premium visibility, and direct leads from clients looking for builders.<br><br>
          Would you be interested in a free listing?"
        </div>
      </div>

      <div class="section-box">
        <h2 class="section-title">Email Template</h2>
        <div class="section-content">
          <div style="background: #F3F4F6; border-radius: 6px; padding: 20px; font-family: Georgia, serif; line-height: 1.8;">
            <p style="margin: 0 0 12px 0;"><em>Subject: Free Premium Listing on Wellington EcoBuild</em></p>
            <p style="margin: 0 0 12px 0;"><em>Dear [Business Name],</em></p>
            <p style="margin: 0 0 12px 0;"><em>I am reaching out from Wellington EcoBuild, New Zealand's trusted directory for verified builders and construction professionals.</em></p>
            <p style="margin: 0 0 12px 0;"><em>As part of our launch, we are offering 20 free Premium listings to qualified businesses in the Wellington region. This includes a verified profile, premium visibility, and direct leads from clients.</em></p>
            <p style="margin: 0 0 12px 0;"><em>I would like to invite you to claim your free listing. There is no cost and no obligation.</em></p>
            <p style="margin: 0 0 12px 0;"><em>Please let me know if you are interested, or visit our website to learn more.</em></p>
            <p style="margin: 0;"><em>Kind regards,<br>[Your Name]<br>Wellington EcoBuild</em></p>
          </div>
        </div>
      </div>

      <div class="section-box">
        <h2 class="section-title">Key Talking Points</h2>
        <div class="section-content" style="display: grid; gap: 8px;">
          <div class="value-item"><span class="value-number">1</span><span>Free Premium listing - no cost, no obligation</span></div>
          <div class="value-item"><span class="value-number">2</span><span>Verified business profile on a trusted platform</span></div>
          <div class="value-item"><span class="value-number">3</span><span>Premium visibility to Wellington clients</span></div>
          <div class="value-item"><span class="value-number">4</span><span>Direct leads from people looking for builders</span></div>
          <div class="value-item"><span class="value-number">5</span><span>Limited to first 20 businesses - act now</span></div>
        </div>
      </div>

      <div class="section-box">
        <h2 class="section-title">Benefits to Explain</h2>
        <div class="section-content" style="display: grid; gap: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;"><span style="color: ${BRAND.colors.primary};">&#10003;</span> Verified business badge</div>
          <div style="display: flex; align-items: center; gap: 8px;"><span style="color: ${BRAND.colors.primary};">&#10003;</span> Premium placement in search results</div>
          <div style="display: flex; align-items: center; gap: 8px;"><span style="color: ${BRAND.colors.primary};">&#10003;</span> Direct enquiries from clients</div>
          <div style="display: flex; align-items: center; gap: 8px;"><span style="color: ${BRAND.colors.primary};">&#10003;</span> Professional business profile</div>
          <div style="display: flex; align-items: center; gap: 8px;"><span style="color: ${BRAND.colors.primary};">&#10003;</span> No ongoing fees during launch period</div>
        </div>
      </div>

      <div class="divider"></div>

      <div style="text-align: center;">
        <p style="color: ${BRAND.colors.muted}; font-size: 14px; margin: 0 0 24px 0;">Questions? Contact <a href="mailto:${BRAND.email}" style="color: ${BRAND.colors.primary};">${BRAND.email}</a></p>
      </div>

      <div class="button-container">
        <a href="${BRAND.website}/portal/login" class="button">Access Contractor Portal</a>
      </div>
    </div>
  `;
  
  return createEmailWrapper(content, true);
};

export const EMAIL_SUBJECTS = {
  passwordReset: "Reset Your Wellington EcoBuild Password",
  verification: "Verify Your Wellington EcoBuild Account",
  welcome: "Welcome to Wellington EcoBuild",
  articleApproved: "Your Article Has Been Published!",
  articleRejected: "Article Submission Update",
  contractorOnboarding: "Wellington EcoBuild - Contractor Outreach Guide",
};
