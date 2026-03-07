"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

const prescriptionItemSchema = z.object({
  medicationName: z.string().min(1, "Tên thuốc không được để trống"),
  dosage: z.string().min(1, "Liều lượng không được để trống"),
  frequency: z.string().min(1, "Tần suất không được để trống"),
  duration: z.string().min(1, "Thời gian không được để trống"),
  notes: z.string().optional(),
});

const clinicalNotesSchema = z.object({
  diagnosis: z.string().optional(),
  examinationNotes: z.string().optional(),
  prescriptionItems: z.array(prescriptionItemSchema),
});

type ClinicalNotesFormValues = z.infer<typeof clinicalNotesSchema>;

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

interface Props {
  appointmentId: string;
  appointmentStatus: string;
  existingRecord: MedicalRecord | null;
}

async function saveClinicalNotes(
  appointmentId: string,
  values: ClinicalNotesFormValues,
) {
  const res = await fetch(
    `/api/doctor/appointments/${appointmentId}/clinical`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Lưu thất bại");
  }
  return res.json();
}

export function ClinicalNotesForm({
  appointmentId,
  appointmentStatus,
  existingRecord,
}: Props) {
  const isDisabled = appointmentStatus === "cancelled";

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClinicalNotesFormValues>({
    resolver: zodResolver(clinicalNotesSchema),
    defaultValues: {
      diagnosis: existingRecord?.diagnosis ?? "",
      examinationNotes: existingRecord?.examination_notes ?? "",
      prescriptionItems:
        existingRecord?.prescription_items.map((item) => ({
          medicationName: item.medication_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          notes: item.notes ?? "",
        })) ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "prescriptionItems",
  });

  useEffect(() => {
    reset({
      diagnosis: existingRecord?.diagnosis ?? "",
      examinationNotes: existingRecord?.examination_notes ?? "",
      prescriptionItems:
        existingRecord?.prescription_items.map((item) => ({
          medicationName: item.medication_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          notes: item.notes ?? "",
        })) ?? [],
    });
  }, [existingRecord, reset]);

  const {
    mutate,
    isPending,
    data: savedData,
  } = useMutation({
    mutationFn: (values: ClinicalNotesFormValues) =>
      saveClinicalNotes(appointmentId, values),
    onSuccess: () => {
      toast.success("Đã lưu ghi chú lâm sàng");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const onSubmit = (values: ClinicalNotesFormValues) => mutate(values);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h4 className='font-medium'>Ghi chú lâm sàng</h4>
        {savedData && (
          <span className='text-xs text-muted-foreground'>
            Đã lưu lúc {format(new Date(), "HH:mm dd/MM/yyyy", { locale: vi })}
          </span>
        )}
      </div>

      <div className='space-y-2'>
        <Label htmlFor={`diagnosis-${appointmentId}`}>Chẩn đoán</Label>
        <Textarea
          id={`diagnosis-${appointmentId}`}
          disabled={isDisabled}
          rows={3}
          {...register("diagnosis")}
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor={`notes-${appointmentId}`}>Ghi chú khám</Label>
        <Textarea
          id={`notes-${appointmentId}`}
          disabled={isDisabled}
          rows={4}
          {...register("examinationNotes")}
        />
      </div>

      <div className='space-y-2'>
        <div className='flex items-center justify-between'>
          <Label>Đơn thuốc</Label>
          {!isDisabled && (
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() =>
                append({
                  medicationName: "",
                  dosage: "",
                  frequency: "",
                  duration: "",
                  notes: "",
                })
              }>
              + Thêm thuốc
            </Button>
          )}
        </div>

        {fields.length > 0 && (
          <div className='space-y-3'>
            {fields.map((field, index) => (
              <div
                key={field.id}
                className='grid grid-cols-5 gap-2 items-start'>
                <div className='col-span-2 space-y-1'>
                  <Input
                    placeholder='Tên thuốc *'
                    disabled={isDisabled}
                    {...register(`prescriptionItems.${index}.medicationName`)}
                  />
                  {errors.prescriptionItems?.[index]?.medicationName && (
                    <p className='text-xs text-destructive'>
                      {errors.prescriptionItems[index]!.medicationName!.message}
                    </p>
                  )}
                </div>
                <Input
                  placeholder='Liều lượng *'
                  disabled={isDisabled}
                  {...register(`prescriptionItems.${index}.dosage`)}
                />
                <Input
                  placeholder='Tần suất *'
                  disabled={isDisabled}
                  {...register(`prescriptionItems.${index}.frequency`)}
                />
                <div className='flex gap-1'>
                  <Input
                    placeholder='Thời gian *'
                    disabled={isDisabled}
                    {...register(`prescriptionItems.${index}.duration`)}
                  />
                  {!isDisabled && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => remove(index)}
                      className='shrink-0 text-destructive hover:text-destructive'>
                      ✕
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!isDisabled && (
        <Button type='submit' disabled={isPending}>
          {isPending ? "Đang lưu…" : "Lưu ghi chú"}
        </Button>
      )}

      {isDisabled && (
        <p className='text-sm text-muted-foreground'>
          Cuộc hẹn đã bị hủy — không thể chỉnh sửa ghi chú.
        </p>
      )}
    </form>
  );
}
