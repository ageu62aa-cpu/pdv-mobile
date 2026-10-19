import { createClient } from '@supabase/supabase-js';

function sameSecret(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN')?.trim();
  const receivedToken = request.headers.get('asaas-access-token') || '';
  if (!expectedToken || !sameSecret(receivedToken, expectedToken)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    console.error('Supabase service environment is not configured.');
    return new Response('Service unavailable', { status: 503 });
  }

  try {
    const event = await request.json();
    if (!['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(event.event)) {
      return Response.json({ received: true, ignored: true });
    }
    if (!event.payment || typeof event.payment !== 'object') {
      return Response.json({ received: true, ignored: true });
    }
    const database = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const payment = event.payment;
    const paymentId = String(payment.id || '');
    const subscriptionId = String(payment.subscription || '');
    if (!paymentId) return Response.json({ received: true, ignored: true });

    if (subscriptionId) {
      const { data, error } = await database.rpc('pdv_activate_subscription_from_asaas', {
        p_asaas_subscription_id: subscriptionId,
        p_payment_id: paymentId,
      });
      if (error) throw error;
      if (!data) console.error('Asaas paid event did not match a local subscription:', subscriptionId);
      return Response.json({ received: true, synchronized: Boolean(data) });
    }

    const externalReference = String(payment.externalReference || '');
    const amount = Number(payment.value);
    if (!externalReference || !Number.isFinite(amount)) {
      console.error('Asaas sale payment event is missing its reference or amount:', paymentId);
      return Response.json({ received: true, synchronized: false });
    }
    const { data, error } = await database.rpc('pdv_confirm_asaas_pix_sale', {
      p_payment_id: paymentId,
      p_external_reference: externalReference,
      p_amount: amount,
    });
    if (error) throw error;
    if (!data) console.warn('Asaas paid event did not match a pending sale:', externalReference);
    return Response.json({ received: true, synchronized: Boolean(data) });
  } catch (error) {
    console.error('Asaas webhook processing failed:', error);
    return new Response('Webhook processing failed', { status: 500 });
  }
});
