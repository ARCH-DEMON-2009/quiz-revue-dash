import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const FAST2SMS_API_KEY = Deno.env.get('FAST2SMS_API_KEY');

    if (!FAST2SMS_API_KEY) {
      throw new Error('FAST2SMS_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { mode, user_id, phone_number } = await req.json();

    // Only "bypass_warning" mode is supported now
    if (mode !== 'bypass_warning') {
      return new Response(
        JSON.stringify({ success: false, error: 'Only bypass_warning mode is supported' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get the user's phone number
    let targetNumber = phone_number;

    if (!targetNumber && user_id) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('whatsapp_number, name')
        .eq('user_id', user_id)
        .maybeSingle();

      if (profile?.whatsapp_number) {
        targetNumber = profile.whatsapp_number;
      }
    }

    if (!targetNumber) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No phone number found for this user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean the phone number
    let num = (targetNumber || '').replace(/[\s\-+]/g, '');
    if (num.startsWith('91') && num.length === 12) num = num.substring(2);
    if (num.startsWith('0')) num = num.substring(1);

    if (num.length !== 10 || !/^\d+$/.test(num)) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'Invalid phone number format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Warning message with help links
    const primaryMessage = 'Warning: verification bypass attempt detected on TestSagar. Access blocked for 24 hours. Need help? Telegram: t.me/TestSagarHelpRobot WhatsApp: wa.me/84522122461';
    const fallbackMessage = 'TestSagar alert: bypass attempt detected. Access blocked 24 hours. If this was a mistake contact Telegram TestSagarHelpRobot or WhatsApp 84522122461.';

    const sendFast2Sms = async (message: string) => {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': FAST2SMS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'q',
          message,
          language: 'english',
          flash: 0,
          numbers: num,
        }),
      });

      return response.json();
    };

    console.log(`Sending bypass warning SMS to ${num}`);
    let data = await sendFast2Sms(primaryMessage);

    // Fast2SMS can reject link-heavy content with spam_sms; retry once with neutral fallback text
    if (data?.return !== true && Array.isArray(data?.errors_keys) && data.errors_keys.includes('spam_sms')) {
      console.warn('Primary SMS rejected with spam_sms, retrying with fallback text');
      data = await sendFast2Sms(fallbackMessage);
    }

    if (data.return === true) {
      console.log(`Bypass warning SMS sent successfully to ${num}`);
      return new Response(
        JSON.stringify({ success: true, sent: 1, message: 'Warning SMS sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.error('Fast2SMS error:', data);
    const reason = typeof data?.message === 'string' && data.message.toLowerCase().includes('account disabled')
      ? 'account_disabled'
      : Array.isArray(data?.errors_keys) && data.errors_keys.includes('spam_sms')
        ? 'spam_rejected'
        : 'failed';

    return new Response(
      JSON.stringify({ success: false, reason, error: JSON.stringify(data), message: 'Failed to send SMS' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  } catch (error: any) {
    console.error('Error in send-sms:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
