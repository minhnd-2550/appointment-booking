"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import type { AppointmentStatus } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { PaymentSection } from "./PaymentSection";

interface PrescriptionItem {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string | null;
}

interface ExaminationResult {
  id: string;
  result_text: string | null;
  file_path: string | null;
  uploaded_at: string;
}

interface LabOrder {
  id: string;
  test_name: string;
  type: string;
  instructions: string | null;
  status: string;
  created_at: string;
  examination_results: ExaminationResult[];
}

interface MedicalRecord {
  id: string;
  diagnosis: string | null;
  examination_notes: string | null;
  created_at: string;
  updated_at: string;
  prescription_items: PrescriptionItem[];
}

interface PaymentData {
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

interface AppointmentDetailData {
  id: string;
  slot_start: string;
  slot_end: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string | null;
  visit_reason: string | null;
  status: AppointmentStatus;
  doctors: { name: string; specialty: string } | null;
  medical_records: MedicalRecord[] | null;
  lab_orders: LabOrder[] | null;
  payment?: PaymentData | null;
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  cancelled: "Đã huỷ",
  completed: "Hoàn thành",
  "no-show": "Không đến",
};

const STATUS_VARIANTS: Record<
  AppointmentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
  completed: "outline",
  "no-show": "outline",
};

interface Props {
  appointment: AppointmentDetailData;
}

export function PatientAppointmentDetail({ appointment: appt }: Props) {
  const router = useRouter();
  const record = appt.medical_records?.[0] ?? null;
  const labOrders = appt.lab_orders ?? [];
  const payment = appt.payment ?? null;

  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const canModify = ["pending", "confirmed"].includes(appt.status);

  const { data: cutoffData } = useQuery({
    queryKey: ["cutoff"],
    queryFn: async () => {
      const res = await fetch("/api/patient/settings/cutoff");
      return res.json() as Promise<{ cutoffHours: number }>;
    },
    enabled: canModify,
  });

  const { data: resultsData } = useQuery({
    queryKey: ["patient-results", appt.id],
    queryFn: async () => {
      const res = await fetch(`/api/patient/appointments/${appt.id}/results`);
      if (!res.ok) return { data: [] };
      return res.json() as Promise<{
        data: Array<{
          id: string;
          test_name: string;
          type: string;
          status: string;
          examination_results: Array<{
            id: string;
            result_text: string | null;
            signedUrl: string | null;
            uploaded_at: string;
          }>;
        }>;
      }>;
    },
    enabled: labOrders.length > 0,
  });

  const cutoffHours = cutoffData?.cutoffHours ?? 24;

  async function handleCancel() {
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/patient/appointments/${appt.id}/cancel`, {
        method: "PATCH",
      });
      const body = await res.json();
      if (!res.ok) {
        if (body?.error === "CUTOFF_WINDOW") {
          toast.error(
            `Không thể hủy trong vòng ${body.cutoffHours} giờ trước giờ hẹn.`,
          );
        } else {
          toast.error("Hủy lịch thất bại. Thử lại sau.");
        }
        return;
      }
      toast.success("Lịch hẹn đã được hủy.");
      setCancelOpen(false);
      router.refresh();
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className='space-y-6'>
      {/* Back link */}
      <Button variant='ghost' size='sm' asChild className='-ml-2'>
        <Link href='/my-appointments'>← Danh sách lịch hẹn</Link>
      </Button>

      {/* Appointment summary */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            Thông tin lịch hẹn
            <Badge variant={STATUS_VARIANTS[appt.status]}>
              {STATUS_LABELS[appt.status]}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-2 text-sm'>
          <div className='grid grid-cols-2 gap-x-4 gap-y-1'>
            <span className='text-muted-foreground'>Bác sĩ</span>
            <span>{appt.doctors?.name ?? "—"}</span>
            <span className='text-muted-foreground'>Chuyên khoa</span>
            <span>{appt.doctors?.specialty ?? "—"}</span>
            <span className='text-muted-foreground'>Thời gian</span>
            <span>
              {format(
                parseISO(appt.slot_start),
                "EEEE, dd/MM/yyyy 'lúc' HH:mm",
                { locale: vi },
              )}
            </span>
            {appt.visit_reason && (
              <>
                <span className='text-muted-foreground'>Lý do</span>
                <span>{appt.visit_reason}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions: Reschedule / Cancel */}
      {canModify && (
        <div className='flex gap-3'>
          <Button variant='outline' asChild>
            <Link href={`/my-appointments/${appt.id}/reschedule`}>
              Đổi lịch hẹn
            </Link>
          </Button>

          <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <DialogTrigger asChild>
              <Button variant='destructive'>Hủy lịch hẹn</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Xác nhận hủy lịch hẹn</DialogTitle>
                <DialogDescription>
                  Bạn có chắc muốn hủy lịch hẹn vào{" "}
                  {format(parseISO(appt.slot_start), "dd/MM/yyyy 'lúc' HH:mm", {
                    locale: vi,
                  })}
                  ? Lưu ý: Không thể hủy trong vòng {cutoffHours} giờ trước giờ
                  hẹn.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant='outline' onClick={() => setCancelOpen(false)}>
                  Quay lại
                </Button>
                <Button
                  variant='destructive'
                  disabled={isCancelling}
                  onClick={handleCancel}>
                  {isCancelling ? "Đang hủy…" : "Xác nhận hủy"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
      {record && (
        <Card>
          <CardHeader>
            <CardTitle>Hồ sơ khám bệnh</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {record.diagnosis && (
              <div>
                <p className='text-sm font-medium mb-1'>Chẩn đoán</p>
                <p className='text-sm text-muted-foreground whitespace-pre-wrap'>
                  {record.diagnosis}
                </p>
              </div>
            )}
            {record.examination_notes && (
              <div>
                <p className='text-sm font-medium mb-1'>Ghi chú khám</p>
                <p className='text-sm text-muted-foreground whitespace-pre-wrap'>
                  {record.examination_notes}
                </p>
              </div>
            )}
            {record.prescription_items.length > 0 && (
              <div>
                <p className='text-sm font-medium mb-2'>Đơn thuốc</p>
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm border-collapse'>
                    <thead>
                      <tr className='border-b text-left'>
                        <th className='py-1 pr-3 font-medium'>Thuốc</th>
                        <th className='py-1 pr-3 font-medium'>Liều lượng</th>
                        <th className='py-1 pr-3 font-medium'>Tần suất</th>
                        <th className='py-1 pr-3 font-medium'>Thời gian</th>
                        <th className='py-1 font-medium'>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {record.prescription_items.map((item) => (
                        <tr key={item.id} className='border-b'>
                          <td className='py-1 pr-3'>{item.medication_name}</td>
                          <td className='py-1 pr-3'>{item.dosage}</td>
                          <td className='py-1 pr-3'>{item.frequency}</td>
                          <td className='py-1 pr-3'>{item.duration}</td>
                          <td className='py-1 text-muted-foreground'>
                            {item.notes ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lab orders & results */}
      {labOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              Kết quả xét nghiệm
              {labOrders.some((o) => o.status === "result_available") && (
                <Badge variant='default'>Có kết quả</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {(resultsData?.data ?? labOrders).map((order) => {
              const apiOrder = resultsData?.data?.find(
                (o) => o.id === order.id,
              );
              const results =
                apiOrder?.examination_results ??
                (order as (typeof labOrders)[0]).examination_results ??
                [];
              return (
                <div key={order.id} className='border rounded p-3 space-y-2'>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium text-sm'>
                      {order.test_name}
                    </span>
                    <Badge variant='outline'>{order.type}</Badge>
                    {order.status === "result_available" && (
                      <Badge variant='default'>Có kết quả</Badge>
                    )}
                  </div>
                  {(order as (typeof labOrders)[0]).instructions && (
                    <p className='text-xs text-muted-foreground'>
                      {(order as (typeof labOrders)[0]).instructions}
                    </p>
                  )}
                  {results.map(
                    (res: {
                      id: string;
                      result_text?: string | null;
                      signedUrl?: string | null;
                      file_path?: string | null;
                    }) => (
                      <div
                        key={res.id}
                        className='pl-3 border-l-2 border-primary/30 space-y-1'>
                        {res.result_text && (
                          <p className='text-sm whitespace-pre-wrap'>
                            {res.result_text}
                          </p>
                        )}
                        {(res.signedUrl ?? res.file_path) && (
                          <a
                            href={res.signedUrl ?? "#"}
                            className='text-sm text-primary underline'
                            target='_blank'
                            rel='noopener noreferrer'>
                            Tải xuống kết quả
                          </a>
                        )}
                      </div>
                    ),
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      {/* Payment section */}
      {appt.status === "completed" && payment && (
        <PaymentSection appointmentId={appt.id} payment={payment} />
      )}
    </div>
  );
}
