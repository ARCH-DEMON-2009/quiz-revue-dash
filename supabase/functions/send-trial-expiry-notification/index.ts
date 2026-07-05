import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ---- Authorization: this endpoint reads user PII, so it must never be
    // callable anonymously. Allow either the service-role key (scheduled/cron
    // invocation) or an authenticated admin's JWT.
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    let authorized = false;
    if (token && token === supabaseServiceKey) {
      authorized = true;
    } else if (token) {
      // Evaluate is_admin() in the context of the caller's JWT (it reads auth.jwt()).
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: isAdmin } = await userClient.rpc('is_admin');
        authorized = !!isAdmin;
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting trial expiry notification check...');

    // Get users whose trial expires in 1 day
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    // Get all trials
    const { data: trials, error: trialsError } = await supabase
      .from('user_trials')
      .select('user_id, email, name, start_date');

    if (trialsError) {
      console.error('Error fetching trials:', trialsError);
      throw trialsError;
    }

    console.log(`Found ${trials?.length || 0} trials to check`);

    const usersToNotify: Array<{
      user_id: string;
      email: string;
      name: string;
      whatsapp_number: string | null;
      expiry_date: Date;
    }> = [];

    // Check each trial
    for (const trial of trials || []) {
      const trialStart = new Date(trial.start_date);
      const trialEnd = new Date(trialStart);
      trialEnd.setDate(trialEnd.getDate() + 3); // 3-day trial

      // Check if trial expires tomorrow
      if (trialEnd >= tomorrowStart && trialEnd <= tomorrowEnd) {
        // Check if user is already premium
        const { data: premium } = await supabase
          .from('premium_users')
          .select('id')
          .eq('user_id', trial.user_id)
          .eq('status', 'active')
          .maybeSingle();

        if (!premium) {
          // Get user's WhatsApp number
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('whatsapp_number')
            .eq('user_id', trial.user_id)
            .maybeSingle();

          usersToNotify.push({
            user_id: trial.user_id,
            email: trial.email,
            name: trial.name,
            whatsapp_number: profile?.whatsapp_number || null,
            expiry_date: trialEnd,
          });
        }
      }
    }

    console.log(`Found ${usersToNotify.length} users to notify`);

    // Generate WhatsApp notification links
    const notifications = usersToNotify.map(user => {
      const message = encodeURIComponent(
        `Hi ${user.name}! Your TestSagar free trial expires tomorrow. ` +
        `To continue accessing all tests and features, please upgrade to premium. ` +
        `Contact us: https://t.me/TestSagarHelpRobot or https://t.me/Its_trms`
      );
      
      const whatsappLink = user.whatsapp_number 
        ? `https://wa.me/${user.whatsapp_number.replace(/[^0-9]/g, '')}?text=${message}`
        : null;

      return {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        whatsapp_number: user.whatsapp_number,
        whatsapp_link: whatsappLink,
        message: decodeURIComponent(message),
        expiry_date: user.expiry_date.toISOString(),
      };
    });

    console.log('Notification data generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        count: notifications.length,
        notifications,
        message: `Found ${notifications.length} users with trials expiring tomorrow`,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in trial expiry notification:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
