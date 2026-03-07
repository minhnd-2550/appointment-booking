"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClinicalNotesForm } from "./ClinicalNotesForm";

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  cancelled: "Đã hủy",
  completed: "Hoàn thành",
  "no-show": "Không đến",
};

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
  completed: "default",
  "no-show": "outline",
};

interface PrescriptionItem {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string | null;
}

interface MedicalRecord {
  id: string;
  diagnosis: string | null;
  examination_notes: string | null;
  prescription_items: PrescriptionItem[];
}

interface LabOrder {
  id: string;
  test_name: string;
  type: string;
  status: string;
}

interface Appointment {
  id: string;
  slot_start: string;
  slot_end: string;
  status: string;
  visit_reason: string | null;
  medical_records: MedicalRecord[];
  lab_orders: LabOrder[];
}

interface PatientProfile {
  full_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
}

interface Props {
  patientId: string;
  patientProfile: PatientProfile | null;
  appointments: Appointment[];
  doctorId: string;
}

export function PatientHistoryView({
  patientProfile,
  appointments,
  doctorId,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className='space-y-4'>
      {/* Patient information */}
      {patientProfile && (
        <div className='rounded-lg border p-4 bg-muted/30 flex gap-6 text-sm'>
          <div>
            <span className='text-muted-foreground'>Ngày sinh: </span>
            {patientProfile.date_of_birth
              ? format(parseISO(patientProfile.date_of_birth), "dd/MM/yyyy")
              : "—"}
          </div>
          <div>
            <span className='text-muted-foreground'>Giới tính: </span>
            {patientProfile.gender ?? "—"}
          </div>
        </div>
      )}

      <h2 className='text-lg font-semibold'>
        Lịch sử khám ({appointments.length})
      </h2>

      <div className='space-y-3'>
        {appointments.map((appt) => {
          const record = appt.medical_records?.[0] ?? null;
          const isExpanded = expandedId === appt.id;

          return (
            <div key={appt.id} className='rounded-lg border'>
              {/* Header row */}
              <button
                type='button'
                className='w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors'
                onClick={() => setExpandedId(isExpanded ? null : appt.id)}>
                <div className='flex items-center gap-3'>
                  <span className='font-medium'>
                    {format(parseISO(appt.slot_start), "dd/MM/yyyy HH:mm", {
                      locale: vi,
                    })}
                  </span>
                  <Badge variant={STATUS_VARIANTS[appt.status] ?? "secondary"}>
                    {STATUS_LABELS[appt.status] ?? appt.status}
                  </Badge>
                  {appt.visit_reason && (
                    <span className='text-sm text-muted-foreground'>
                      {appt.visit_reason}
                    </span>
                  )}
                </div>
                <span className='text-muted-foreground text-sm'>
                  {isExpanded ? "▲" : "▼"}
                </span>
              </button>

              {/* Expanded: clinical notes + prescription + lab orders */}
              {isExpanded && (
                <div className='border-t px-4 pb-4 pt-3 space-y-4'>
                  {/* Clinical notes form (editable for active appointments) */}
                  <ClinicalNotesForm
                    appointmentId={appt.id}
                    appointmentStatus={appt.status}
                    existingRecord={record}
                  />

                  {/* Lab orders summary */}
                  {appt.lab_orders?.length > 0 && (
                    <div>
                      <h4 className='font-medium mb-2'>
                        Xét nghiệm / Chẩn đoán hình ảnh
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tên xét nghiệm</TableHead>
                            <TableHead>Loại</TableHead>
                            <TableHead>Trạng thái</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {appt.lab_orders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell>{order.test_name}</TableCell>
                              <TableCell>{order.type}</TableCell>
                              <TableCell>{order.status}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
