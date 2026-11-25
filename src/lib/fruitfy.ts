// Client-safe helpers for the Fruitfy integration.
// No secrets, no process.env here: this module is imported by browser code.

/**
 * Base URL of the Fruitfy API. Overridable at runtime with the
 * FRUITFY_API_URL secret if the endpoint ever moves.
 */
export const FRUITFY_API_BASE = "https://api.fruitfy.io";

/**
 * Fruitfy product id for the 9 em 1 brush. The id lives in the Fruitfy
 * dashboard (Produtos) and is required by POST /api/pix/charge.
 * Empty means "not configured yet" — the checkout refuses to charge until set.
 */
export const FRUITFY_PRODUCT_ID = "";

export interface ChargeItem {
  /** Fruitfy product id. */
  id: string;
  /** Unit price in cents (R$48,90 -> 4890). */
  value: number;
  quantity: number;
}

export interface PixChargeInput {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  items: ChargeItem[];
}

export interface PixChargeResult {
  ok: boolean;
  error?: string;
  /** Order uuid used to poll payment status. */
  orderId?: string;
  status?: string;
  /** PIX "copia e cola" payload, when Fruitfy returns one. */
  pixCode?: string;
  /** Base64/data-URI QR image, when Fruitfy returns one. */
  qrCodeImage?: string;
  amountCents?: number;
}

export interface OrderStatusResult {
  ok: boolean;
  error?: string;
  status?: string;
  paidAt?: string | null;
  totalPaidCents?: number;
}

export const onlyDigits = (value: string): string => value.replace(/\D/g, "");

/** Reais -> cents. Rounds so 48.9 never becomes 4889.999... */
export const toCents = (amount: number): number => Math.round(amount * 100);

export const fromCents = (cents: number): string =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** CPF mask: 123.456.789-01 */
export const maskCpf = (raw: string): string => {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

/**
 * Real CPF check-digit validation. Rejects repeated-digit CPFs (111.111.111-11)
 * that the digit math alone would let through.
 */
export const isValidCpf = (raw: string): boolean => {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digit = (base: string, factor: number): number => {
    let sum = 0;
    for (const char of base) {
      sum += Number(char) * factor;
      factor -= 1;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const first = digit(cpf.slice(0, 9), 10);
  const second = digit(cpf.slice(0, 10), 11);
  return first === Number(cpf[9]) && second === Number(cpf[10]);
};

/** Phone for the API: digits only, 10 (landline) or 11 (mobile) long. */
export const isValidPhone = (raw: string): boolean => {
  const d = onlyDigits(raw);
  return d.length === 10 || d.length === 11;
};
