"use client";

import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface InvoiceItem {
  id: string;
  appointment_id: string;
  amount: number;
  currency: string;
  status: string;
  invoice_number: string | null;
  paid_at: string | null;
  created_at: string;
  signedInvoiceUrl: string | null;
  appointments: {
    slot_start: string;
    slot_end: string;
    doctors: { name: string; specialty: string } | null;
  } | null;
}

const STATUS_LABELS: Record<string, string> = {
  awaiting_payment: "Chờ thanh toán",
  paid: "Đã thanh toán",
  refund_pending: "Đang hoàn tiền",
  refunded: "Đã hoàn tiền",
  voided: "Đã huỷ",
};

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  awaiting_payment: "secondary",
  paid: "default",
  refund_pending: "outline",
  refunded: "outline",
  voided: "destructive",
};

export function InvoiceList() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["patient-invoices"],
    queryFn: async () => {
      const res = await fetch("/api/patient/invoices");
      if (!res.ok) throw new Error("Failed to load invoices");
      return res.json() as Promise<{ data: InvoiceItem[] }>;
    },
  });

  if (isLoading) {
    return (
      <div className='space-y-3'>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className='h-20 w-full rounded-lg' />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className='text-sm text-destructive'>
        Không thể tải danh sách hoá đơn. Vui lòng thử lại.
      </p>
    );
  }

  const invoices = data?.data ?? [];

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className='py-12 text-center text-muted-foreground'>
          Bạn chưa có hoá đơn nào.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-3'>
      {invoices.map((inv) => {
        const slotStart = inv.appointments?.slot_start;
        const doctorName = inv.appointments?.doctors?.name ?? "—";
        return (
          <Card key={inv.id}>
            <CardContent className='py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
              <div className='space-y-1'>
                <div className='flex items-center gap-2'>
                  <span className='font-medium text-sm'>
                    {inv.invoice_number ?? `ID: ${inv.id.slice(0, 8)}`}
                  </span>
                  <Badge variant={STATUS_VARIANTS[inv.status] ?? "outline"}>
                    {STATUS_LABELS[inv.status] ?? inv.status}
                  </Badge>
                </div>
                <p className='text-xs text-muted-foreground'>
                  Bác sĩ: {doctorName}
                  {slotStart
                    ? ` · ${format(parseISO(slotStart), "dd/MM/yyyy", { locale: vi })}`
                    : ""}
                </p>
              </div>
              <div className='flex items-center gap-4'>
                <span className='font-semibold text-sm'>
                  {Number(inv.amount).toLocaleString("vi-VN")} {inv.currency}
                </span>
                {inv.signedInvoiceUrl && (
                  <a
                    href={inv.signedInvoiceUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-sm text-primary underline whitespace-nowrap'>
                    Tải PDF
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
