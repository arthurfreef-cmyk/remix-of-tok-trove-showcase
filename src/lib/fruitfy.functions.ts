import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  FRUITFY_API_BASE,
  FRUITFY_PRODUCT_ID,
  type OrderStatusResult,
  type PixChargeInput,
  type PixChargeResult,
} from "./fruitfy";

// ---------------------------------------------------------------------------
// Validation. Every field the Fruitfy charge endpoint requires is checked
// here, so a bad payload never reaches the payment provider.
// ---------------------------------------------------------------------------

const chargeSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo."),
  email: z.string().trim().email("E-mail inválido."),
  phone: z.string().regex(/^\d{10,13}$/, "Telefone inválido."),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos."),
  items: z
    .array(
      z.object({
        id: z.string().max(100).optional(),
        value: z.number().int().positive("Valor inválido."),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1, "O pedido precisa de pelo menos um item.")
    .max(5, "Muitos itens em um só pedido."),
});

// ---------------------------------------------------------------------------
// Response normalising. The public docs ship an empty example for the 201
// body, so dig for the fields by name instead of trusting one shape.
// ---------------------------------------------------------------------------

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Depth-limited search for the first non-empty string among `keys`. */
const findString = (source: unknown, keys: string[], depth = 0): string | undefined => {
  if (depth > 4) return undefined;
  const record = asRecord(source);
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      const found = findString(value, keys, depth + 1);
      if (found) return found;
    }
  }
  return undefined;
};

const findNumber = (source: unknown, keys: string[], depth = 0): number | undefined => {
  if (depth > 4) return undefined;
  const record = asRecord(source);
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      const found = findNumber(value, keys, depth + 1);
      if (found !== undefined) return found;
    }
  }
  return undefined;
};

const PIX_CODE_KEYS = [
  "copia_e_cola",
  "copia-e-cola",
  "pix_copia_e_cola",
  "copy_paste",
  "pix_copy_paste",
  "copiaCola",
  "pix_code",
  "emv",
  "code",
];

const PIX_QR_KEYS = [
  "qrcode_base64",
  "qr_code_base64",
  "qrcode_image",
  "qr_code_image",
  "pix_qrcode_base64",
  "qrcode",
  "qr_code",
];

const ORDER_ID_KEYS = ["order_uuid", "uuid", "order_id", "id", "short_id"];

const looksLikeImage = (value: string): boolean =>
  value.startsWith("data:image") || /^[A-Za-z0-9+/]{200,}={0,2}$/.test(value);

const normalizeCharge = (payload: unknown): PixChargeResult => {
  const orderId = findString(payload, ORDER_ID_KEYS);
  const pixCode = findString(payload, PIX_CODE_KEYS);
  const maybeQr = findString(payload, PIX_QR_KEYS);
  const qrCodeImage = maybeQr && looksLikeImage(maybeQr) ? maybeQr : undefined;
  const amountCents = findNumber(payload, ["total_gross_amount", "total_amount", "amount"]);
  const status = findString(payload, ["status", "order_status"]);

  if (!orderId) {
    return { ok: false, error: "A Fruitfy não retornou o pedido. Tente novamente." };
  }
  if (!pixCode && !qrCodeImage) {
    return {
      ok: false,
      orderId,
      status,
      amountCents,
      error: "A cobrança foi criada, mas a Fruitfy não retornou o código PIX.",
    };
  }
  return { ok: true, orderId, status, pixCode, qrCodeImage, amountCents };
};

const describeFailure = (status: number, payload: unknown): string => {
  const message = findString(payload, ["message", "error", "msg", "detail"]);
  if (status === 401) return "Token da Fruitfy inválido ou expirado.";
  if (status === 403) return "Este token não tem acesso à loja informada.";
  if (status === 404) return "Produto ou loja não encontrados na Fruitfy.";
  if (status === 422) return message ? `Dados recusados: ${message}` : "Dados inválidos para a Fruitfy.";
  return message ? `Fruitfy: ${message}` : "Não foi possível criar a cobrança agora.";
};

const authHeaders = (token: string, storeId: string): Record<string, string> => ({
  accept: "application/json",
  authorization: `Bearer ${token}`,
  "Store-Id": storeId,
});

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

/**
 * Creates a PIX charge on Fruitfy for the given order.
 * Public on purpose: a buyer is not signed in when checking out. The handler
 * only forwards the buyer's own data to the payment provider and never reads
 * store metrics, balance or any other customer's order.
 */
export const createPixCharge = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => chargeSchema.parse(data))
  .handler(async ({ data }): Promise<PixChargeResult> => {
    const token = process.env["FRUITFY_API_TOKEN"];
    const storeId = process.env["FRUITFY_STORE_ID"];
    const base = process.env["FRUITFY_API_URL"] ?? FRUITFY_API_BASE;

    if (!token || !storeId) {
      return {
        ok: false,
        error:
          "Pagamento ainda não configurado: faltam o token e a loja da Fruitfy em Secrets.",
      };
    }

    // Product id: the secret wins, then the constant in fruitfy.ts.
    const productId = process.env["FRUITFY_PRODUCT_ID"] || FRUITFY_PRODUCT_ID;
    if (!productId) {
      return { ok: false, error: "Falta o ID do produto da Fruitfy." };
    }
    const body: PixChargeInput = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      cpf: data.cpf,
      items: data.items.map((i) => ({ id: productId, value: i.value, quantity: i.quantity })),
    };

    try {
      const response = await fetch(`${base}/api/pix/charge`, {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders(token, storeId) },
        body: JSON.stringify(body),
      });

      const text = await response.text();
      let payload: unknown = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        return { ok: false, error: describeFailure(response.status, payload) };
      }
      return normalizeCharge(payload);
    } catch {
      return { ok: false, error: "Falha de conexão com a Fruitfy. Tente novamente." };
    }
  });

/**
 * Reads the payment status of one order created by this app.
 * `orderId` comes from createPixCharge, so the caller can only ever poll the
 * order they just created; the store metrics endpoints stay server-side only.
 */
export const getOrderStatus = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ orderId: z.string().min(8).max(64) }).parse(data),
  )
  .handler(async ({ data }): Promise<OrderStatusResult> => {
    const token = process.env["FRUITFY_API_TOKEN"];
    const storeId = process.env["FRUITFY_STORE_ID"];
    const base = process.env["FRUITFY_API_URL"] ?? FRUITFY_API_BASE;

    if (!token || !storeId) {
      return { ok: false, error: "Pagamento ainda não configurado." };
    }

    try {
      const response = await fetch(`${base}/api/order/${encodeURIComponent(data.orderId)}`, {
        headers: authHeaders(token, storeId),
      });

      const text = await response.text();
      let payload: unknown = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        return { ok: false, error: describeFailure(response.status, payload) };
      }
      return {
        ok: true,
        status: findString(payload, ["status", "order_status"]),
        paidAt: findString(payload, ["paid_at"]) ?? null,
        totalPaidCents: findNumber(payload, ["total_paid_amount"]),
      };
    } catch {
      return { ok: false, error: "Falha de conexão com a Fruitfy." };
    }
  });
