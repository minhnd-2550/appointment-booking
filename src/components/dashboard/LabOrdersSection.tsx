"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const orderSchema = z.object({
  testName: z.string().min(1, "Tên xét nghiệm không được để trống"),
  type: z.enum(["lab", "imaging", "other"]),
  instructions: z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderSchema>;

interface ExaminationResult {
  id: string;
  result_text: string | null;
  file_path: string | null;
}

interface LabOrder {
  id: string;
  test_name: string;
  type: string;
  status: string;
  instructions: string | null;
  examination_results: ExaminationResult[];
}

const STATUS_LABELS: Record<string, string> = {
  ordered: "Đã yêu cầu",
  result_available: "Có kết quả",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  ordered: "secondary",
  result_available: "default",
};

interface Props {
  appointmentId: string;
  appointmentStatus: string;
}

export function LabOrdersSection({ appointmentId, appointmentStatus }: Props) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);

  const canOrder = !["cancelled", "no-show"].includes(appointmentStatus);

  const { data: orders = [], isLoading } = useQuery<LabOrder[]>({
    queryKey: ["lab-orders", appointmentId],
    queryFn: async () => {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/lab-orders`,
      );
      if (!res.ok) throw new Error("Failed to load orders");
      const body = await res.json();
      return body.data;
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: { type: "lab" },
  });

  const createOrder = useMutation({
    mutationFn: async (values: OrderFormValues) => {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/lab-orders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      if (!res.ok) throw new Error("Tạo yêu cầu thất bại");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["lab-orders", appointmentId],
      });
      reset();
      setShowAddForm(false);
      toast.success("Đã thêm yêu cầu xét nghiệm");
    },
    onError: () => toast.error("Không thể tạo yêu cầu xét nghiệm."),
  });

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h4 className='font-medium'>Xét nghiệm / Chẩn đoán hình ảnh</h4>
        {canOrder && (
          <Button
            variant='outline'
            size='sm'
            onClick={() => setShowAddForm((v) => !v)}>
            {showAddForm ? "Hủy" : "+ Thêm yêu cầu"}
          </Button>
        )}
      </div>

      {showAddForm && (
        <form
          onSubmit={handleSubmit((v) => createOrder.mutate(v))}
          className='rounded-lg border p-3 space-y-3'>
          <div className='grid grid-cols-3 gap-2'>
            <div className='col-span-2 space-y-1'>
              <Label>Tên xét nghiệm *</Label>
              <Input
                placeholder='Xét nghiệm máu tổng quát'
                {...register("testName")}
              />
              {errors.testName && (
                <p className='text-xs text-destructive'>
                  {errors.testName.message}
                </p>
              )}
            </div>
            <div className='space-y-1'>
              <Label>Loại *</Label>
              <Select
                defaultValue='lab'
                onValueChange={(v) =>
                  setValue("type", v as "lab" | "imaging" | "other")
                }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='lab'>Xét nghiệm</SelectItem>
                  <SelectItem value='imaging'>Hình ảnh</SelectItem>
                  <SelectItem value='other'>Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='space-y-1'>
            <Label>Chỉ định (tùy chọn)</Label>
            <Input
              placeholder='Hướng dẫn đặc biệt'
              {...register("instructions")}
            />
          </div>
          <Button type='submit' size='sm' disabled={createOrder.isPending}>
            {createOrder.isPending ? "Đang tạo…" : "Tạo yêu cầu"}
          </Button>
        </form>
      )}

      {isLoading && <p className='text-sm text-muted-foreground'>Đang tải…</p>}

      {orders.length === 0 && !isLoading && (
        <p className='text-sm text-muted-foreground'>
          Chưa có yêu cầu xét nghiệm nào.
        </p>
      )}

      <div className='space-y-2'>
        {orders.map((order) => (
          <div key={order.id} className='rounded border p-3 space-y-2'>
            <div className='flex items-center gap-2'>
              <span className='font-medium text-sm'>{order.test_name}</span>
              <Badge variant='outline'>{order.type}</Badge>
              <Badge variant={STATUS_VARIANTS[order.status] ?? "secondary"}>
                {STATUS_LABELS[order.status] ?? order.status}
              </Badge>
            </div>
            {order.instructions && (
              <p className='text-xs text-muted-foreground'>
                {order.instructions}
              </p>
            )}
            {order.examination_results?.length > 0 && (
              <div className='pl-3 border-l-2 border-primary/30 text-sm space-y-1'>
                {order.examination_results.map((res) => (
                  <p key={res.id} className='text-muted-foreground'>
                    {res.result_text ?? "File đã tải lên"}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
