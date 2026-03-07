"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface Service {
  id: string;
  name: string;
  default_duration_minutes: number;
  default_fee: number;
  currency: string;
  is_active: boolean;
}

interface ServiceForm {
  name: string;
  defaultDurationMinutes: string;
  defaultFee: string;
  currency: string;
}

const empty: ServiceForm = {
  name: "",
  defaultDurationMinutes: "30",
  defaultFee: "",
  currency: "VND",
};

export function ServiceCatalogue() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<ServiceForm>(empty);
  const [adding, setAdding] = useState(false);
  const [editTarget, setEditTarget] = useState<Service | null>(null);
  const [editForm, setEditForm] = useState<ServiceForm>(empty);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const res = await fetch("/api/admin/services");
      if (!res.ok) throw new Error("Failed to load services");
      const json = (await res.json()) as { data: Service[] };
      return json.data;
    },
  });

  async function handleAdd() {
    if (!addForm.name || !addForm.defaultFee) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name,
          defaultDurationMinutes: Number(addForm.defaultDurationMinutes),
          defaultFee: Number(addForm.defaultFee),
          currency: addForm.currency,
        }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Thêm thất bại");
      }
      toast.success("Đã thêm dịch vụ");
      setShowAdd(false);
      setAddForm(empty);
      await qc.invalidateQueries({ queryKey: ["admin-services"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/services/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          defaultDurationMinutes: Number(editForm.defaultDurationMinutes),
          defaultFee: Number(editForm.defaultFee),
        }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Lưu thất bại");
      }
      toast.success("Đã cập nhật dịch vụ");
      setEditTarget(null);
      await qc.invalidateQueries({ queryKey: ["admin-services"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(svc: Service) {
    try {
      const res = await fetch(`/api/admin/services/${svc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !svc.is_active }),
      });
      if (!res.ok) throw new Error("Cập nhật thất bại");
      toast.success(
        svc.is_active ? "Đã vô hiệu hoá dịch vụ" : "Đã kích hoạt lại dịch vụ",
      );
      await qc.invalidateQueries({ queryKey: ["admin-services"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi không xác định");
    }
  }

  if (isLoading)
    return <div className='text-sm text-slate-500'>Đang tải...</div>;
  if (error)
    return (
      <div className='text-sm text-red-500'>
        Không tải được danh sách dịch vụ
      </div>
    );

  return (
    <div className='space-y-4'>
      <div className='flex justify-end'>
        <Button onClick={() => setShowAdd(true)}>+ Thêm dịch vụ</Button>
      </div>

      <div className='overflow-x-auto rounded-lg border border-slate-200 bg-white'>
        <table className='w-full text-sm'>
          <thead className='bg-slate-50 border-b border-slate-200'>
            <tr>
              <th className='text-left px-4 py-3 font-medium text-slate-700'>
                Tên dịch vụ
              </th>
              <th className='text-left px-4 py-3 font-medium text-slate-700'>
                Thời gian (phút)
              </th>
              <th className='text-left px-4 py-3 font-medium text-slate-700'>
                Phí
              </th>
              <th className='text-left px-4 py-3 font-medium text-slate-700'>
                Trạng thái
              </th>
              <th className='px-4 py-3' />
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((svc) => (
              <tr
                key={svc.id}
                className='border-b border-slate-100 last:border-0 hover:bg-slate-50'>
                <td className='px-4 py-3 font-medium text-slate-800'>
                  {svc.name}
                </td>
                <td className='px-4 py-3 text-slate-600'>
                  {svc.default_duration_minutes}
                </td>
                <td className='px-4 py-3 text-slate-600'>
                  {svc.default_fee.toLocaleString("vi-VN")} {svc.currency}
                </td>
                <td className='px-4 py-3'>
                  <Badge variant={svc.is_active ? "default" : "secondary"}>
                    {svc.is_active ? "Hoạt động" : "Vô hiệu"}
                  </Badge>
                </td>
                <td className='px-4 py-3 text-right space-x-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      setEditTarget(svc);
                      setEditForm({
                        name: svc.name,
                        defaultDurationMinutes: String(
                          svc.default_duration_minutes,
                        ),
                        defaultFee: String(svc.default_fee),
                        currency: svc.currency,
                      });
                    }}>
                    Sửa
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleToggleActive(svc)}>
                    {svc.is_active ? "Vô hiệu" : "Kích hoạt"}
                  </Button>
                </td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className='px-4 py-8 text-center text-slate-400'>
                  Chưa có dịch vụ nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm dịch vụ mới</DialogTitle>
            <DialogDescription>Điền thông tin dịch vụ khám</DialogDescription>
          </DialogHeader>
          <div className='space-y-3 py-2'>
            <Input
              placeholder='Tên dịch vụ'
              value={addForm.name}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, name: e.target.value }))
              }
            />
            <Input
              placeholder='Thời gian (phút)'
              type='number'
              value={addForm.defaultDurationMinutes}
              onChange={(e) =>
                setAddForm((f) => ({
                  ...f,
                  defaultDurationMinutes: e.target.value,
                }))
              }
            />
            <Input
              placeholder='Phí mặc định'
              type='number'
              value={addForm.defaultFee}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, defaultFee: e.target.value }))
              }
            />
            <Input
              placeholder='Đơn vị tiền tệ (VND)'
              value={addForm.currency}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, currency: e.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowAdd(false)}>
              Huỷ
            </Button>
            <Button onClick={handleAdd} disabled={adding}>
              {adding ? "Đang thêm..." : "Thêm dịch vụ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null);
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa dịch vụ</DialogTitle>
            <DialogDescription>Cập nhật thông tin dịch vụ</DialogDescription>
          </DialogHeader>
          <div className='space-y-3 py-2'>
            <Input
              placeholder='Tên dịch vụ'
              value={editForm.name}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, name: e.target.value }))
              }
            />
            <Input
              placeholder='Thời gian (phút)'
              type='number'
              value={editForm.defaultDurationMinutes}
              onChange={(e) =>
                setEditForm((f) => ({
                  ...f,
                  defaultDurationMinutes: e.target.value,
                }))
              }
            />
            <Input
              placeholder='Phí mặc định'
              type='number'
              value={editForm.defaultFee}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, defaultFee: e.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditTarget(null)}>
              Huỷ
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
