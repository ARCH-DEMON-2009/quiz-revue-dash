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

    const { mode, message, numbers } = await req.json();

    // mode: "broadcast" (all users), "expiry" (premium expiring in 3 days), "custom" (specific numbers)
    let targetNumbers: string[] = [];

    if (mode === 'custom' && numbers?.length) {
      targetNumbers = numbers;
    } else if (mode === 'broadcast' || mode === 'expiry') {
      // Fetch all user profiles with whatsapp numbers
      let allProfiles: any[] = [];
      let from = 0;
      const batchSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('whatsapp_number, user_id, name')
          .not('whatsapp_number', 'is', null)
          .range(from, from + batchSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allProfiles = [...allProfiles, ...data];
        if (data.length < batchSize) break;
        from += batchSize;
      }

      if (mode === 'expiry') {
        // Filter to only premium users expiring in 3 days
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        const windowStart = new Date(threeDaysFromNow);
        windowStart.setHours(0, 0, 0, 0);
        const windowEnd = new Date(threeDaysFromNow);
        windowEnd.setHours(23, 59, 59, 999);

        const { data: expiringUsers, error: expError } = await supabase
          .from('premium_users')
          .select('user_id, email, name')
          .eq('status', 'active')
          .gte('expiry_date', windowStart.toISOString())
          .lte('expiry_date', windowEnd.toISOString());

        if (expError) throw expError;

        const expiringUserIds = new Set((expiringUsers || []).map(u => u.user_id));
        allProfiles = allProfiles.filter(p => expiringUserIds.has(p.user_id));
      }

      // Extract and clean phone numbers (remove +91, spaces, etc.)
      targetNumbers = allProfiles
        .map(p => {
          let num = (p.whatsapp_number || '').replace(/[\s\-\+]/g, '');
          if (num.startsWith('91') && num.length === 12) num = num.substring(2);
          if (num.startsWith('0')) num = num.substring(1);
          return num;
        })
        .filter(n => n.length === 10 && /^\d+$/.test(n));
    }

    if (targetNumbers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, count: 0, message: 'No valid phone numbers found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remove duplicates
    targetNumbers = [...new Set(targetNumbers)];

    const smsMessage = message || 'Your TestSagar premium subscription expires in 3 days. Renew now at testsagar.com/pricing';

    console.log(`Sending SMS to ${targetNumbers.length} numbers via Fast2SMS`);

    // Fast2SMS Quick SMS API - send in batches of 1000
    const results: Array<{ batch: number; success: boolean; error?: string; count: number }> = [];
    const batchSize = 1000;

    for (let i = 0; i < targetNumbers.length; i += batchSize) {
      const batch = targetNumbers.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;

      try {
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            'authorization': FAST2SMS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'q', // Quick SMS route
            message: smsMessage,
            language: 'english',
            flash: 0,
            numbers: batch.join(','),
          }),
        });

        const data = await response.json();

        if (data.return === true) {
          console.log(`Batch ${batchNum}: SMS sent successfully to ${batch.length} numbers`);
          results.push({ batch: batchNum, success: true, count: batch.length });
        } else {
          console.error(`Batch ${batchNum} failed:`, data);
          results.push({ batch: batchNum, success: false, error: JSON.stringify(data), count: batch.length });
        }
      } catch (err: any) {
        console.error(`Batch ${batchNum} error:`, err);
        results.push({ batch: batchNum, success: false, error: err.message, count: batch.length });
      }
    }

    const successCount = results.filter(r => r.success).reduce((sum, r) => sum + r.count, 0);
    const failCount = results.filter(r => !r.success).reduce((sum, r) => sum + r.count, 0);

    return new Response(
      JSON.stringify({
        success: true,
        total: targetNumbers.length,
        sent: successCount,
        failed: failCount,
        results,
        message: `SMS sent to ${successCount}/${targetNumbers.length} numbers`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-sms:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
