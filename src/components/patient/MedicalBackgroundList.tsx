"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const addSchema = z.object({
  entryType: z.enum(["allergy", "chronic_condition"]),
  description: z.string().min(2, "Mô tả phải có ít nhất 2 ký tự"),
});

type AddFormValues = z.infer<typeof addSchema>;

interface MedicalBackgroundEntry {
  id: string;
  entry_type: "allergy" | "chronic_condition";
  description: string;
}

interface Props {
  initialEntries: MedicalBackgroundEntry[];
}

const TYPE_LABELS: Record<string, string> = {
  allergy: "Dị ứng",
  chronic_condition: "Bệnh mãn tính",
};

const TYPE_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  allergy: "destructive",
  chronic_condition: "secondary",
};

export function MedicalBackgroundList({ initialEntries }: Props) {
  const [entries, setEntries] =
    useState<MedicalBackgroundEntry[]>(initialEntries);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddFormValues>({
    resolver: zodResolver(addSchema),
    defaultValues: { entryType: "allergy", description: "" },
  });

  async function onAdd(values: AddFormValues) {
    const res = await fetch("/api/patient/medical-background", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      toast.error("Không thể thêm. Thử lại sau.");
      return;
    }
    const { data } = await res.json();
    setEntries((prev) => [data, ...prev]);
    reset();
    setIsAdding(false);
    toast.success("Đã thêm thông tin y tế");
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/patient/medical-background/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Đã xóa");
    } catch {
      toast.error("Không thể xóa. Thử lại.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className='flex-row items-center justify-between'>
        <CardTitle>Tiền sử bệnh &amp; Dị ứng</CardTitle>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setIsAdding((v) => !v)}>
          {isAdding ? "Hủy" : "+ Thêm"}
        </Button>
      </CardHeader>
      <CardContent className='space-y-4'>
        {isAdding && (
          <form
            onSubmit={handleSubmit(onAdd)}
            className='flex items-end gap-3 border rounded-lg p-3'>
            <div className='space-y-1'>
              <Label htmlFor='entryType'>Loại</Label>
              <select
                id='entryType'
                className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                {...register("entryType")}>
                <option value='allergy'>Dị ứng</option>
                <option value='chronic_condition'>Bệnh mãn tính</option>
              </select>
            </div>
            <div className='flex-1 space-y-1'>
              <Label htmlFor='description'>Mô tả *</Label>
              <Input
                id='description'
                placeholder='Ví dụ: Dị ứng penicillin'
                {...register("description")}
              />
              {errors.description && (
                <p className='text-xs text-destructive'>
                  {errors.description.message}
                </p>
              )}
            </div>
            <Button type='submit' size='sm' disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu…" : "Lưu"}
            </Button>
          </form>
        )}

        {entries.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            Chưa có thông tin y tế nào.
          </p>
        ) : (
          <ul className='space-y-2'>
            {entries.map((entry) => (
              <li
                key={entry.id}
                className='flex items-center justify-between gap-3 py-1'>
                <div className='flex items-center gap-2'>
                  <Badge
                    variant={TYPE_VARIANTS[entry.entry_type] ?? "secondary"}>
                    {TYPE_LABELS[entry.entry_type] ?? entry.entry_type}
                  </Badge>
                  <span className='text-sm'>{entry.description}</span>
                </div>
                <Button
                  variant='ghost'
                  size='sm'
                  className='text-destructive hover:text-destructive'
                  disabled={deletingId === entry.id}
                  onClick={() => onDelete(entry.id)}>
                  Xóa
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
