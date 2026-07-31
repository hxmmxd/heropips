import { z } from "zod";

export type InvoiceRequest = {
  price_amount: number;
  price_currency: "usd";
  order_id: string;
  order_description: string;
  ipn_callback_url: string;
  success_url: string;
  cancel_url: string;
  pay_currency?: string;
};

export type Invoice = { id: string; invoiceUrl: string };

export interface InvoiceClient {
  createInvoice(req: InvoiceRequest): Promise<Invoice>;
}

/** Tolerant response shape: id may be number|string; url may arrive under several keys. */
const InvoiceRes = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String).optional(),
    invoice_url: z.string().optional(),
    invoice_id: z.union([z.string(), z.number()]).transform(String).optional(),
    token: z.string().optional(),
  })
  .passthrough();

export class NowPaymentsClient implements InvoiceClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  async createInvoice(req: InvoiceRequest): Promise<Invoice> {
    const res = await fetch(`${this.baseUrl}/v1/invoice`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": this.apiKey },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      throw new Error(`nowpayments invoice create failed: HTTP ${res.status}`);
    }
    const data = InvoiceRes.parse(await res.json());
    const id = data.id ?? data.invoice_id;
    const invoiceUrl = data.invoice_url ?? (id ? `${this.baseUrl}/invoice/${id}` : undefined);
    if (!id || !invoiceUrl) {
      throw new Error("nowpayments invoice create failed: response missing id/invoice_url");
    }
    return { id, invoiceUrl };
  }
}
