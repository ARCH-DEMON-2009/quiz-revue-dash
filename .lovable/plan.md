

## Fix: Razorpay "Failed to initiate payment" Error

### Root Cause
The Razorpay API returns `Authentication failed` when the edge function tries to create an order. This means the `RAZORPAY_KEY_ID` and/or `RAZORPAY_KEY_SECRET` secrets are invalid.

### What You Need To Do (Manual Step)
1. Go to your **Razorpay Dashboard** → Settings → API Keys
2. Generate a **new live API key pair** (Key ID + Key Secret)
3. Copy both values carefully -- the secret is shown only once

### What I Will Do (Code Changes)

1. **Update the `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` secrets** with the new values you provide

2. **Improve the `create-razorpay-order` edge function** with:
   - Better error logging (log the full Razorpay error response)
   - Validate key format starts with `rzp_live_` before calling API
   - Return actionable error messages to the frontend

3. **Improve error handling in `Pricing.tsx`**:
   - Show specific error messages from the edge function instead of generic "Failed to initiate payment"
   - Add retry logic hint

### Technical Details

The current edge function code is correct in structure. The only issue is the stored credentials. After updating secrets, payment flow will work:

```
User clicks Pay → create-razorpay-order (with valid keys) → Razorpay returns order_id → Razorpay checkout opens → verify-razorpay-payment → Premium activated
```

### Steps
1. You regenerate Razorpay API keys from dashboard
2. I update the secrets and redeploy the edge function with better error handling
3. Test a payment end-to-end

