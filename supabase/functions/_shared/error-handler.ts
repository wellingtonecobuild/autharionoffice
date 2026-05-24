/**
 * Sanitizes error messages to prevent information leakage to clients.
 * Full error details are logged server-side, but clients receive safe generic messages.
 */
export function getSafeErrorMessage(error: unknown, context: string): string {
  const errMsg = error instanceof Error ? error.message : String(error);
  
  // Log full error server-side for debugging
  console.error(`[${context}] Error:`, errMsg);
  
  // Return generic, safe message based on error type
  if (errMsg.includes('Authentication') || errMsg.includes('authorization') || errMsg.includes('Unauthorized')) {
    return 'Authentication failed. Please sign in again.';
  }
  if (errMsg.includes('Stripe') || errMsg.includes('payment') || errMsg.includes('STRIPE_SECRET_KEY')) {
    return 'Payment processing error. Please try again later.';
  }
  if (errMsg.includes('not set') || errMsg.includes('configuration') || errMsg.includes('not configured')) {
    return 'Service temporarily unavailable.';
  }
  if (errMsg.includes('No Stripe customer')) {
    return 'No active subscription found.';
  }
  if (errMsg.includes('Admin access required')) {
    return 'Insufficient permissions.';
  }
  if (errMsg.includes('Price ID is required')) {
    return 'Invalid request. Please try again.';
  }
  
  return 'An error occurred. Please try again or contact support.';
}
