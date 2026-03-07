"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status:
    | "awaiting_payment"
    | "paid"
    | "refund_pending"
    | "refunded"
    | "voided";
  invoice_number: string | null;
  paid_at: string | null;
}

interface Props {
  appointmentId: string;
  payment: Payment;
}

export function PaymentSection({
  appointmentId,
  payment: initialPayment,
}: Props) {
  const [payment, setPayment] = useState(initialPayment);
  const [isPaying, setIsPaying] = useState(false);
  const [signedInvoiceUrl, setSignedInvoiceUrl] = useState<string | null>(null);

  if (payment.status !== "awaiting_payment" && !signedInvoiceUrl) {
    // Already paid — show summary (may not have signed URL until fetched)
    if (payment.status === "paid") {
      return <PaidSummary payment={payment} invoiceUrl={signedInvoiceUrl} />;
    }
    return null;
  }

  async function handlePay() {
    setIsPaying(true);
    try {
      const res = await fetch(
        `/api/patient/appointments/${appointmentId}/payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Mock token — always succeeds
          body: JSON.stringify({ gatewayToken: `tok_${Date.now()}` }),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          toast.error("Thanh toán thất bại. Vui lòng thử lại.");
        } else {
          toast.error(body?.error ?? "Lỗi thanh toán.");
        }
        return;
      }
      setPayment(body.data);
      setSignedInvoiceUrl(body.data.signedInvoiceUrl ?? null);
      toast.success("Thanh toán thành công!");
    } finally {
      setIsPaying(false);
    }
  }

  if (payment.status === "paid") {
    return <PaidSummary payment={payment} invoiceUrl={signedInvoiceUrl} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          Thanh toán
          <Badge variant='secondary'>Chờ thanh toán</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex items-baseline gap-2'>
          <span className='text-2xl font-bold'>
            {Number(payment.amount).toLocaleString("vi-VN")}
          </span>
          <span className='text-muted-foreground'>{payment.currency}</span>
        </div>
        <Button
          onClick={handlePay}
          disabled={isPaying}
          className='w-full sm:w-auto'>
          {isPaying ? "Đang xử lý…" : "Thanh toán ngay"}
        </Button>
      </CardContent>
    </Card>
  );
}

function PaidSummary({
  payment,
  invoiceUrl,
}: {
  payment: Payment;
  invoiceUrl: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          Thanh toán
          <Badge variant='default'>Đã thanh toán</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-2 text-sm'>
        <div className='flex gap-8'>
          <div>
            <p className='text-muted-foreground'>Số tiền</p>
            <p className='font-medium'>
              {Number(payment.amount).toLocaleString("vi-VN")}{" "}
              {payment.currency}
            </p>
          </div>
          {payment.invoice_number && (
            <div>
              <p className='text-muted-foreground'>Số hoá đơn</p>
              <p className='font-medium'>{payment.invoice_number}</p>
            </div>
          )}
        </div>
        {invoiceUrl && (
          <a
            href={invoiceUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-block text-primary underline mt-2'>
            Tải hoá đơn PDF
          </a>
        )}
      </CardContent>
    </Card>
  );
}
