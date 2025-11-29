// List of allowed email domains (trusted providers)
const ALLOWED_DOMAINS = [
  // Google
  'gmail.com',
  'googlemail.com',
  // Microsoft
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  // Yahoo
  'yahoo.com',
  'yahoo.co.in',
  'yahoo.in',
  // Apple
  'icloud.com',
  'me.com',
  'mac.com',
  // Other major providers
  'protonmail.com',
  'proton.me',
  'aol.com',
  'zoho.com',
  'rediffmail.com',
  // Indian providers
  'rediff.com',
  // Educational domains (common patterns)
  'edu',
  'ac.in',
  // Professional domains
  'company.com',
];

// Common temporary/disposable email domains to block
const BLOCKED_DOMAINS = [
  'tempmail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'guerrillamail.org',
  'mailinator.com',
  '10minutemail.com',
  'throwaway.email',
  'fakeinbox.com',
  'trashmail.com',
  'yopmail.com',
  'sharklasers.com',
  'getairmail.com',
  'dispostable.com',
  'mailnesia.com',
  'tempail.com',
  'tempr.email',
  'discard.email',
  'discardmail.com',
  'spamgourmet.com',
  'mytrashmail.com',
  'getnada.com',
  'mohmal.com',
  'maildrop.cc',
  'mailcatch.com',
  'mintemail.com',
  'emailondeck.com',
];

export const isValidEmailProvider = (email: string): { valid: boolean; message: string } => {
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) {
    return { valid: false, message: "Invalid email format" };
  }

  // Check if it's a blocked disposable email domain
  if (BLOCKED_DOMAINS.some(blocked => domain.includes(blocked))) {
    return { valid: false, message: "Temporary/disposable email addresses are not allowed. Please use Gmail, Outlook, Yahoo, or other professional email." };
  }

  // Check if it's an allowed domain
  const isAllowed = ALLOWED_DOMAINS.some(allowed => {
    if (allowed.startsWith('.')) {
      return domain.endsWith(allowed);
    }
    return domain === allowed || domain.endsWith('.' + allowed);
  });

  if (isAllowed) {
    return { valid: true, message: "" };
  }

  // For other domains, check if they look professional (not random strings)
  // Allow any domain that's not in the blocked list but warn about preference
  return { 
    valid: false, 
    message: "Please use a trusted email provider like Gmail, Outlook, Yahoo, or your professional email address." 
  };
};
