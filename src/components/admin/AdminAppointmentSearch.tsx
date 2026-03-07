"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  no_show: "Vắng mặt",
};

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  confirmed: "default",
  completed: "outline",
  cancelled: "destructive",
  no_show: "destructive",
};

interface AppointmentRow {
  id: string;
  slot_start: string;
  status: string;
  patient_name: string | null;
  doctor_name: string | null;
  doctor_id: string;
}

interface AppointmentSearchResponse {
  appointments: AppointmentRow[];
  page: number;
  pageSize: number;
  total: number;
}

export function AdminAppointmentSearch() {
  const queryClient = useQueryClient();
  const [doctorId, setDoctorId] = useState("");
  const [status, setStatus] = useState("");
  const [patientName, setPatientName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const queryParams = new URLSearchParams({
    ...(doctorId && { doctorId }),
    ...(status && status !== "all" && { status }),
    ...(patientName && { patientName }),
    ...(from && { from }),
    ...(to && { to }),
    page: String(page),
  });

  const { data, isLoading } = useQuery<AppointmentSearchResponse>({
    queryKey: [
      "admin-appointments",
      doctorId,
      status,
      patientName,
      from,
      to,
      page,
    ],
    queryFn: async () => {
      const res = await fetch(`/api/admin/appointments?${queryParams}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/admin/appointments/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Hủy thất bại");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-appointments"] });
      toast.success("Đã hủy lịch hẹn");
      setCancelTarget(null);
      setCancelReason("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const appointments = data?.appointments ?? [];
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  function handleFilter() {
    setPage(1);
  }

  function openCancel(id: string) {
    setCancelTarget(id);
    setCancelReason("");
  }

  function submitCancel() {
    if (!cancelTarget) return;
    if (cancelReason.trim().length < 5) {
      toast.error("Lý do hủy phải có ít nhất 5 ký tự");
      return;
    }
    cancelMutation.mutate({ id: cancelTarget, reason: cancelReason.trim() });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tìm kiếm lịch hẹn</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Filter bar */}
          <div className='flex flex-wrap gap-2'>
            <Input
              placeholder='ID bác sĩ'
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className='w-48'
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className='w-44'>
                <SelectValue placeholder='Tất cả trạng thái' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tất cả</SelectItem>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder='Tên bệnh nhân'
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className='w-44'
            />
            <Input
              type='date'
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className='w-40'
            />
            <Input
              type='date'
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className='w-40'
            />
            <Button onClick={handleFilter}>Tìm</Button>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className='flex justify-center py-8'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
          ) : appointments.length === 0 ? (
            <p className='text-center text-sm text-muted-foreground py-8'>
              Không có kết quả
            </p>
          ) : (
            <>
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Bác sĩ</TableHead>
                      <TableHead>Bệnh nhân</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((appt) => (
                      <TableRow key={appt.id}>
                        <TableCell className='whitespace-nowrap text-sm'>
                          {format(
                            new Date(appt.slot_start),
                            "dd/MM/yyyy HH:mm",
                            { locale: vi },
                          )}
                        </TableCell>
                        <TableCell className='text-sm'>
                          {appt.doctor_name ?? "—"}
                        </TableCell>
                        <TableCell className='text-sm'>
                          {appt.patient_name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              STATUS_VARIANTS[appt.status] ?? "secondary"
                            }>
                            {STATUS_LABELS[appt.status] ?? appt.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {!["cancelled", "completed", "no_show"].includes(
                            appt.status,
                          ) && (
                            <Button
                              size='sm'
                              variant='destructive'
                              onClick={() => openCancel(appt.id)}>
                              Hủy
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className='flex items-center justify-between text-sm text-muted-foreground'>
                <span>Tổng: {data?.total ?? 0} lịch hẹn</span>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='ghost'
                    size='sm'
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className='h-4 w-4' />
                  </Button>
                  <span>
                    Trang {page} / {totalPages}
                  </span>
                  <Button
                    variant='ghost'
                    size='sm'
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận hủy lịch hẹn</DialogTitle>
          </DialogHeader>
          <div className='space-y-2'>
            <p className='text-sm text-muted-foreground'>
              Vui lòng cung cấp lý do hủy (bắt buộc):
            </p>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder='Nhập lý do hủy (tối thiểu 5 ký tự)...'
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setCancelTarget(null)}>
              Đóng
            </Button>
            <Button
              variant='destructive'
              onClick={submitCancel}
              disabled={
                cancelMutation.isPending || cancelReason.trim().length < 5
              }>
              {cancelMutation.isPending && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
