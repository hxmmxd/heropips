/**
 * NOWPayments API Client
 * Docs: https://documenter.getpostman.com/view/7907941/2s93JtP3F6
 */

const NOWPAYMENTS_BASE = 'https://api.nowpayments.io/v1';
const NOWPAYMENTS_SANDBOX_BASE = 'https://api-sandbox.nowpayments.io/v1';

function getBase(sandbox = false) {
  return sandbox ? NOWPAYMENTS_SANDBOX_BASE : NOWPAYMENTS_BASE;
}

function getApiKey() {
  return process.env.NOWPAYMENTS_API_KEY || '';
}

function getJwtToken() {
  return process.env.NOWPAYMENTS_JWT_TOKEN || '';
}

function isSandbox() {
  return process.env.NOWPAYMENTS_SANDBOX === 'true';
}

async function npFetch(path: string, options: RequestInit = {}, apiKey?: string) {
  const key = apiKey || getApiKey();
  const base = getBase(isSandbox());
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'x-api-key': key,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `NOWPayments error ${res.status}`);
  return data;
}

// ── Types ────────────────────────────────────────────────

export interface NowPaymentsStatus {
  message: string;
}

export interface NowPaymentsCurrency {
  id: number;
  code: string;
  name: string;
  enable: boolean;
  min_amount: number | null;
}

export interface NowPaymentsPayout {
  id: string;
  status: 'WAITING' | 'PROCESSING' | 'CONFIRMING' | 'CONFIRMED' | 'SENDING' | 'PARTIALLY_PAID' | 'FINISHED' | 'FAILED' | 'REFUNDED' | 'EXPIRED';
  payment_id?: string;
  payment_status?: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  outcome?: {
    amount: number;
    currency: string;
    hash?: string;
  };
}

export interface CreatePayoutInput {
  address: string;         // destination wallet
  currency: string;        // e.g. 'usdttrc20', 'btc', 'eth'
  amount: number;          // USD amount
  ipn_callback_url?: string;
  extra_id?: string;       // for memo/tag
}

// ── API Methods ───────────────────────────────────────────

/** Test connectivity — returns { message: 'OK' } */
export async function testConnection(apiKey?: string): Promise<{ ok: boolean; message: string }> {
  try {
    const data = await npFetch('/status', {}, apiKey);
    return { ok: true, message: data.message || 'Connected' };
  } catch (e: any) {
    return { ok: false, message: e.message };
  }
}

/** List available currencies */
export async function getAvailableCurrencies(): Promise<NowPaymentsCurrency[]> {
  const data = await npFetch('/currencies');
  return data.currencies || [];
}

/** Get minimum payout amount for a currency */
export async function getMinAmount(currency: string): Promise<number> {
  const data = await npFetch(`/min-amount?currency_from=${currency}&currency_to=${currency}`);
  return data.min_amount || 0;
}

/**
 * Create a mass-payout / withdrawal via NOWPayments Payout API.
 * Requires JWT token (separate from API key).
 *
 * NOWPayments payout docs:
 * https://documenter.getpostman.com/view/7907941/2s93JtP3F6#b9f5cd67-a074-4bfb-8e07-e51e7c1dd0f2
 */
export async function createPayout(input: CreatePayoutInput): Promise<NowPaymentsPayout> {
  const base = getBase(isSandbox());
  const jwt = getJwtToken();

  // NOWPayments payouts use Bearer JWT, not API key
  const res = await fetch(`${base}/payout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'x-api-key': getApiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ipn_callback_url: input.ipn_callback_url,
      withdrawals: [
        {
          address: input.address,
          currency: input.currency.toLowerCase(),
          amount: input.amount,
          extra_id: input.extra_id,
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `Payout failed: ${res.status}`);

  // Return the first withdrawal result
  const payout = Array.isArray(data.withdrawals) ? data.withdrawals[0] : data;
  return payout as NowPaymentsPayout;
}

/** Get payout status by ID */
export async function getPayoutStatus(paymentId: string): Promise<NowPaymentsPayout> {
  const data = await npFetch(`/payment/${paymentId}`);
  return data as NowPaymentsPayout;
}

/** Estimate exchange amount */
export async function estimateAmount(
  amount: number,
  currencyFrom: string,
  currencyTo: string,
): Promise<{ estimated_amount: number; rate: number }> {
  const data = await npFetch(
    `/estimate?amount=${amount}&currency_from=${currencyFrom}&currency_to=${currencyTo}`,
  );
  return { estimated_amount: data.estimated_amount, rate: 1 / (data.rate_from || 1) };
}
