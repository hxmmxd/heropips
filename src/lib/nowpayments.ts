/**
 * NOWPayments Payout Client
 * Docs: https://documenter.getpostman.com/view/7907941/2s93JusNJt
 *
 * This client is PAYOUT-ONLY. We use NOWPayments to send crypto
 * withdrawals (primarily USDT) to users who earn referral commissions.
 *
 * Flow:
 *   1. Admin approves a pending withdrawal request
 *   2. POST /v1/auth  → get fresh JWT (expires in 5 min)
 *   3. POST /v1/payout → create the payout (must be array format)
 *   4. POST /v1/payout/:id/verify → verify with 2FA code (or auto-rejected in 1 hr)
 *   5. IPN webhook receives status updates → updates our DB
 */

import { createClient } from '@supabase/supabase-js';

const NOWPAYMENTS_BASE         = 'https://api.nowpayments.io/v1';
const NOWPAYMENTS_SANDBOX_BASE = 'https://api-sandbox.nowpayments.io/v1';

function getBase(sandbox = false) {
  return sandbox ? NOWPAYMENTS_SANDBOX_BASE : NOWPAYMENTS_BASE;
}

// ── Config ────────────────────────────────────────────────

export interface NowPaymentsConfig {
  api_key?:     string;   // x-api-key header
  email?:       string;   // nowpayments.io login email (for JWT auth)
  password?:    string;   // nowpayments.io login password (for JWT auth)
  totp_secret?: string;   // base32 TOTP secret for 2FA payout verification
  ipn_secret?:  string;   // HMAC-SHA512 IPN signature key
  sandbox?:     boolean;
}

let _supabaseAdmin: any = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabaseAdmin;
}

/**
 * Resolves NOWPayments credentials.
 * Priority: DB platform_config → env variables
 */
export async function getActiveConfig(): Promise<NowPaymentsConfig> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('platform_config')
      .select('value')
      .eq('key', 'nowpayments_config')
      .single();

    if (data?.value) {
      const v = data.value;
      return {
        api_key:     v.api_key     || '',
        email:       v.email       || '',
        password:    v.password    || '',
        totp_secret: v.totp_secret || '',
        ipn_secret:  v.ipn_secret  || '',
        sandbox:     !!v.sandbox,
      };
    }
  } catch (e) {
    console.warn('[nowpayments] Failed to load config from DB:', e);
  }

  return {
    api_key:     process.env.NOWPAYMENTS_API_KEY    || '',
    email:       process.env.NOWPAYMENTS_EMAIL       || '',
    password:    process.env.NOWPAYMENTS_PASSWORD    || '',
    totp_secret: process.env.NOWPAYMENTS_TOTP_SECRET || '',
    ipn_secret:  process.env.NOWPAYMENTS_IPN_SECRET  || '',
    sandbox:     process.env.NOWPAYMENTS_SANDBOX === 'true',
  };
}

// ── Types ─────────────────────────────────────────────────

/** Payout statuses per docs */
export type PayoutStatus = 'creating' | 'waiting' | 'processing' | 'sending' | 'finished' | 'failed' | 'rejected';

export interface NowPaymentsPayout {
  id:                  string;
  batch_withdrawal_id: string;
  status:              PayoutStatus;
  currency:            string;
  amount:              string;
  address:             string;
  fee?:                string | null;
  extra_id?:           string | null;
  hash?:               string | null;
  error?:              string | null;
  ipn_callback_url?:   string | null;
  created_at:          string;
  updated_at?:         string | null;
}

export interface CreatePayoutInput {
  address:  string;   // destination wallet
  currency: string;   // NOWPayments ticker e.g. 'usdttrc20'
  amount:   number;   // amount in crypto
  ipn_callback_url?: string;
}

// ── JWT Auth ──────────────────────────────────────────────

/**
 * Fetch a fresh JWT from POST /v1/auth.
 * ⚠️ Expires in 5 minutes — call right before making payout requests.
 */
async function getJwtToken(config: NowPaymentsConfig): Promise<string> {
  if (!config.email || !config.password) {
    throw new Error('NOWPayments email + password required. Configure in Admin → Settings → Payments.');
  }

  const res = await fetch(`${getBase(config.sandbox)}/auth`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email: config.email, password: config.password }),
  });

  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(data?.message || 'Failed to obtain JWT from NOWPayments');
  }
  return data.token as string;
}

// ── Fetch with Retry + Timeout ────────────────────────────

/**
 * Wraps fetch with timeout (default 10s) and retry (default 2 attempts).
 * Uses exponential backoff between retries.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  timeoutMs = 10000,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err: any) {
      clearTimeout(timer);
      if (attempt === retries) {
        throw new Error(
          err.name === 'AbortError'
            ? `NOWPayments request timed out after ${timeoutMs}ms`
            : err.message || 'NOWPayments request failed'
        );
      }
      // Exponential backoff: 1s, 2s
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error('NOWPayments request failed after retries');
}

// ── API Methods ───────────────────────────────────────────

/**
 * GET /v1/status — test API connectivity
 */
export async function testConnection(apiKey?: string): Promise<{ ok: boolean; message: string }> {
  try {
    const config = await getActiveConfig();
    const key    = apiKey || config.api_key || '';
    const base   = getBase(config.sandbox);

    const res  = await fetchWithRetry(`${base}/status`, { headers: { 'x-api-key': key } });
    const data = await res.json();

    if (!res.ok) throw new Error(data?.message || `Status check failed: ${res.status}`);
    return { ok: true, message: data.message || 'Connected' };
  } catch (e: any) {
    return { ok: false, message: e.message };
  }
}

/**
 * POST /v1/payout — create a crypto payout.
 *
 * Body must wrap withdrawals in an array even for a single payout.
 * Requires fresh JWT + API key in headers.
 * ⚠️ Payout auto-rejected after 1 hr if not verified with 2FA.
 */
export async function createPayout(
  input: CreatePayoutInput,
  customConfig?: NowPaymentsConfig,
): Promise<NowPaymentsPayout> {
  const config = customConfig || await getActiveConfig();
  const base   = getBase(config.sandbox);
  const jwt    = await getJwtToken(config);

  const res = await fetchWithRetry(`${base}/payout`, {
    method:  'POST',
    headers: {
      Authorization:   `Bearer ${jwt}`,
      'x-api-key':     config.api_key || '',
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      ipn_callback_url: input.ipn_callback_url,
      withdrawals: [{
        address:  input.address,
        currency: input.currency.toLowerCase(),
        amount:   String(input.amount),
      }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `Payout creation failed: ${res.status}`);

  const withdrawal = Array.isArray(data.withdrawals) ? data.withdrawals[0] : data;
  if (!withdrawal) throw new Error('No withdrawal returned from NOWPayments');

  return {
    ...withdrawal,
    batch_withdrawal_id: data.id || withdrawal.batch_withdrawal_id || withdrawal.id,
  } as NowPaymentsPayout;
}

/**
 * POST /v1/payout/:batch_withdrawal_id/verify
 * Required 2FA step — without this the payout is auto-rejected after 1 hour.
 */
export async function verifyPayout(
  batchWithdrawalId: string,
  verificationCode: string,
  customConfig?: NowPaymentsConfig,
): Promise<{ ok: boolean; message: string }> {
  const config = customConfig || await getActiveConfig();
  const jwt    = await getJwtToken(config);

  try {
    const res = await fetchWithRetry(`${getBase(config.sandbox)}/payout/${batchWithdrawalId}/verify`, {
      method:  'POST',
      headers: {
        Authorization:   `Bearer ${jwt}`,
        'x-api-key':     config.api_key || '',
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ verification_code: verificationCode }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || `Verify failed: ${res.status}`);
    return { ok: true, message: 'Payout verified' };
  } catch (e: any) {
    return { ok: false, message: e.message };
  }
}

/**
 * GET /v1/payout/:id — check payout status
 */
export async function getPayoutStatus(
  payoutId: string,
  customConfig?: NowPaymentsConfig,
): Promise<NowPaymentsPayout> {
  const config = customConfig || await getActiveConfig();
  const base   = getBase(config.sandbox);

  const res  = await fetchWithRetry(`${base}/payout/${payoutId}`, {
    headers: {
      'x-api-key': config.api_key || '',
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `Payout status check failed: ${res.status}`);
  return data as NowPaymentsPayout;
}

// ── IPN Signature Verification ────────────────────────────

/**
 * Recursively sort object keys (required by NOWPayments IPN spec).
 */
export function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  return Object.keys(obj).sort().reduce((result: any, key) => {
    result[key] = sortObjectKeys(obj[key]);
    return result;
  }, {});
}

/**
 * Verify IPN webhook signature.
 * Docs: parse JSON → sort keys recursively → JSON.stringify → HMAC-SHA512 → compare to x-nowpayments-sig
 */
export function verifyIpnSignature(payload: Record<string, any>, signature: string, secret: string): boolean {
  const crypto = require('crypto');
  const sorted = sortObjectKeys(payload);
  const hmac   = crypto.createHmac('sha512', secret);
  hmac.update(JSON.stringify(sorted));
  return hmac.digest('hex') === signature;
}

// ── Payment Creation Methods ────────────────────────────────

export interface CreatePaymentInput {
  price_amount: number;
  price_currency: string; // e.g. 'usd'
  pay_currency: string;   // e.g. 'usdttrc20'
  ipn_callback_url?: string;
  order_id?: string;
  order_description?: string;
}

export interface NowPaymentsPaymentResponse {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id?: string;
  order_description?: string;
  created_at: string;
}

/**
 * POST /v1/payment — create a client invoice/payment.
 */
export async function createPayment(
  input: CreatePaymentInput,
  customConfig?: NowPaymentsConfig,
): Promise<NowPaymentsPaymentResponse> {
  const config = customConfig || await getActiveConfig();
  const base   = getBase(config.sandbox);

  const res = await fetchWithRetry(`${base}/payment`, {
    method:  'POST',
    headers: {
      'x-api-key':    config.api_key || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price_amount:     input.price_amount,
      price_currency:   input.price_currency.toLowerCase(),
      pay_currency:     input.pay_currency.toLowerCase(),
      ipn_callback_url: input.ipn_callback_url,
      order_id:         input.order_id,
      order_description: input.order_description,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `Payment creation failed: ${res.status}`);
  return data as NowPaymentsPaymentResponse;
}

/**
 * GET /v1/payment/:id — check payment status
 */
export async function getPaymentStatus(
  paymentId: string,
  customConfig?: NowPaymentsConfig,
): Promise<{ payment_id: string; payment_status: string; pay_amount: number; pay_currency: string }> {
  const config = customConfig || await getActiveConfig();
  const base   = getBase(config.sandbox);

  const res  = await fetchWithRetry(`${base}/payment/${paymentId}`, {
    headers: {
      'x-api-key': config.api_key || '',
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `Payment status check failed: ${res.status}`);
  return data;
}

// ── Invoice-Based Checkout ────────────────────────────────

export interface CreateInvoiceInput {
  price_amount: number;
  price_currency: string;      // e.g. 'usd'
  ipn_callback_url?: string;
  order_id?: string;
  order_description?: string;
  success_url?: string;
  cancel_url?: string;
}

export interface NowPaymentsInvoiceResponse {
  id: string;
  token_id: string;
  invoice_url: string;
  order_id?: string;
  order_description?: string;
  price_amount: number;
  price_currency: string;
  created_at: string;
}

/**
 * POST /v1/invoice — create a hosted invoice page.
 * Users get a NOWPayments-hosted page where they can choose ANY supported crypto.
 * Much better UX than raw /payment which requires specifying pay_currency upfront.
 */
export async function createInvoice(
  input: CreateInvoiceInput,
  customConfig?: NowPaymentsConfig,
): Promise<NowPaymentsInvoiceResponse> {
  const config = customConfig || await getActiveConfig();
  const base   = getBase(config.sandbox);

  const res = await fetchWithRetry(`${base}/invoice`, {
    method:  'POST',
    headers: {
      'x-api-key':    config.api_key || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price_amount:      input.price_amount,
      price_currency:    input.price_currency.toLowerCase(),
      ipn_callback_url:  input.ipn_callback_url,
      order_id:          input.order_id,
      order_description: input.order_description,
      success_url:       input.success_url,
      cancel_url:        input.cancel_url,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `Invoice creation failed: ${res.status}`);
  return data as NowPaymentsInvoiceResponse;
}

// ── Available Currencies ──────────────────────────────────

/**
 * GET /v1/currencies — get list of available crypto currencies.
 */
export async function getAvailableCurrencies(
  customConfig?: NowPaymentsConfig,
): Promise<string[]> {
  const config = customConfig || await getActiveConfig();
  const base   = getBase(config.sandbox);

  const res = await fetchWithRetry(`${base}/currencies`, {
    headers: { 'x-api-key': config.api_key || '' },
  }, 1, 5000); // fewer retries, shorter timeout for non-critical

  const data = await res.json();
  if (!res.ok) return [];
  return data.currencies || [];
}
