import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Copy, Loader2 } from "lucide-react";
import { getOrderStatus } from "@/lib/fruitfy.functions";
import type { PixChargeResult } from "@/lib/fruitfy";

const PAID = ["paid", "approved", "completed"];

/** Shows the PIX QR / copia-e-cola and polls Fruitfy until the order is paid. */
export function PixPayment({ charge }: { charge: PixChargeResult }) {
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!charge.orderId || paid) return;
    const id = window.setInterval(async () => {
      const r = await getOrderStatus({ data: { orderId: charge.orderId ?? "" } }).catch(() => null);
      if (r?.ok && (PAID.includes(r.status ?? "") || r.paidAt)) setPaid(true);
    }, 5000);
    return () => window.clearInterval(id);
  }, [charge.orderId, paid]);

  if (paid) {
    return (
      <section className="rounded-xl bg-white p-5 text-center">
        <CheckCircle2 className="mx-auto size-10 text-[#15966b]" />
        <p className="mt-2 font-bold">Pagamento confirmado!</p>
        <p className="text-xs text-gray-500">Seu pedido foi recebido e será enviado em breve.</p>
      </section>
    );
  }

  const copy = async () => {
    if (!charge.pixCode) return;
    await navigator.clipboard.writeText(charge.pixCode);
    setCopied(true);
  };

  return (
    <section className="rounded-xl bg-white p-5 text-center">
      <p className="text-sm font-bold">Pague com Pix para concluir</p>
      <div className="mx-auto mt-3 w-fit rounded-lg border p-2">
        {charge.qrCodeImage ? (
          <img alt="QR Code Pix" className="size-48" src={charge.qrCodeImage.startsWith("data:") ? charge.qrCodeImage : `data:image/png;base64,${charge.qrCodeImage}`} />
        ) : charge.pixCode ? <QRCodeSVG value={charge.pixCode} size={192} /> : null}
      </div>
      {charge.pixCode && (
        <>
          <p className="mt-3 break-all rounded bg-[#f7f7f7] p-2 text-[10px] text-gray-600">{charge.pixCode}</p>
          <button type="button" onClick={copy} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#fe2c55] px-5 py-2.5 text-xs font-bold text-white">
            <Copy className="size-4" /> {copied ? "Código copiado!" : "Copiar código Pix"}
          </button>
        </>
      )}
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-500"><Loader2 className="size-3.5 animate-spin" /> Aguardando pagamento...</p>
    </section>
  );
}
