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

interface ProviderProfile {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  doctor_id?: string;
  doctors?: { full_name: string; specialty: string } | null;
}

interface InviteForm {
  email: string;
  fullName: string;
  specialty: string;
}

export function ProviderTable() {
  const qc = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteForm>({
    email: "",
    fullName: "",
    specialty: "",
  });
  const [inviting, setInviting] = useState(false);
  const [deactivateTarget, setDeactivateTarget] =
    useState<ProviderProfile | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [forceConflicts, setForceConflicts] = useState<
    { id: string; scheduled_at: string }[]
  >([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-providers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/providers");
      if (!res.ok) throw new Error("Failed to load providers");
      const json = (await res.json()) as { data: ProviderProfile[] };
      return json.data;
    },
  });

  async function handleInvite() {
    if (!inviteForm.email || !inviteForm.fullName || !inviteForm.specialty) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    setInviting(true);
    try {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Lỗi mời bác sĩ");
      }
      toast.success("Đã gửi lời mời thành công");
      setShowInviteDialog(false);
      setInviteForm({ email: "", fullName: "", specialty: "" });
      await qc.invalidateQueries({ queryKey: ["admin-providers"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setInviting(false);
    }
  }

  async function handleDeactivate(provider: ProviderProfile, force = false) {
    setDeactivating(true);
    try {
      const res = await fetch(`/api/admin/providers/${provider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: false,
          ...(force ? { force: true } : {}),
        }),
      });
      if (res.status === 409) {
        const json = (await res.json()) as {
          error: string;
          conflicts: { id: string; scheduled_at: string }[];
        };
        if (json.error === "ACTIVE_APPOINTMENTS") {
          setForceConflicts(json.conflicts ?? []);
          setDeactivating(false);
          return;
        }
      }
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Lỗi vô hiệu hoá");
      }
      toast.success("Đã vô hiệu hoá tài khoản bác sĩ");
      setDeactivateTarget(null);
      setForceConflicts([]);
      await qc.invalidateQueries({ queryKey: ["admin-providers"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setDeactivating(false);
    }
  }

  async function handleReactivate(provider: ProviderProfile) {
    try {
      const res = await fetch(`/api/admin/providers/${provider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (!res.ok) throw new Error("Lỗi kích hoạt lại");
      toast.success("Đã kích hoạt lại tài khoản");
      await qc.invalidateQueries({ queryKey: ["admin-providers"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi không xác định");
    }
  }

  if (isLoading)
    return <div className='text-sm text-slate-500'>Đang tải...</div>;
  if (error)
    return (
      <div className='text-sm text-red-500'>
        Không tải được danh sách bác sĩ
      </div>
    );

  return (
    <div className='space-y-4'>
      <div className='flex justify-end'>
        <Button onClick={() => setShowInviteDialog(true)}>
          + Mời bác sĩ mới
        </Button>
      </div>

      <div className='overflow-x-auto rounded-lg border border-slate-200 bg-white'>
        <table className='w-full text-sm'>
          <thead className='bg-slate-50 border-b border-slate-200'>
            <tr>
              <th className='text-left px-4 py-3 font-medium text-slate-700'>
                Họ tên
              </th>
              <th className='text-left px-4 py-3 font-medium text-slate-700'>
                Email
              </th>
              <th className='text-left px-4 py-3 font-medium text-slate-700'>
                Chuyên khoa
              </th>
              <th className='text-left px-4 py-3 font-medium text-slate-700'>
                Trạng thái
              </th>
              <th className='px-4 py-3' />
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((p) => (
              <tr
                key={p.id}
                className='border-b border-slate-100 last:border-0 hover:bg-slate-50'>
                <td className='px-4 py-3 font-medium text-slate-800'>
                  {p.full_name}
                </td>
                <td className='px-4 py-3 text-slate-600'>{p.email}</td>
                <td className='px-4 py-3 text-slate-600'>
                  {p.doctors?.specialty ?? "—"}
                </td>
                <td className='px-4 py-3'>
                  <Badge variant={p.is_active ? "default" : "secondary"}>
                    {p.is_active ? "Hoạt động" : "Vô hiệu"}
                  </Badge>
                </td>
                <td className='px-4 py-3 text-right space-x-2'>
                  {p.is_active ? (
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setDeactivateTarget(p)}>
                      Vô hiệu hoá
                    </Button>
                  ) : (
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleReactivate(p)}>
                      Kích hoạt lại
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className='px-4 py-8 text-center text-slate-400'>
                  Chưa có bác sĩ nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mời bác sĩ mới</DialogTitle>
            <DialogDescription>
              Bác sĩ sẽ nhận email kèm liên kết thiết lập mật khẩu.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3 py-2'>
            <Input
              placeholder='Họ tên đầy đủ'
              value={inviteForm.fullName}
              onChange={(e) =>
                setInviteForm((f) => ({ ...f, fullName: e.target.value }))
              }
            />
            <Input
              placeholder='Email'
              type='email'
              value={inviteForm.email}
              onChange={(e) =>
                setInviteForm((f) => ({ ...f, email: e.target.value }))
              }
            />
            <Input
              placeholder='Chuyên khoa (vd: Nội tổng quát)'
              value={inviteForm.specialty}
              onChange={(e) =>
                setInviteForm((f) => ({ ...f, specialty: e.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setShowInviteDialog(false)}>
              Huỷ
            </Button>
            <Button onClick={handleInvite} disabled={inviting}>
              {inviting ? "Đang gửi..." : "Gửi lời mời"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={!!deactivateTarget}
        onOpenChange={(o) => {
          if (!o) {
            setDeactivateTarget(null);
            setForceConflicts([]);
          }
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vô hiệu hoá bác sĩ</DialogTitle>
            <DialogDescription>
              {forceConflicts.length > 0
                ? `Bác sĩ có ${forceConflicts.length} lịch hẹn đang chờ/đã xác nhận. Bạn có muốn tiếp tục?`
                : `Bạn có chắc chắn muốn vô hiệu hoá tài khoản của ${deactivateTarget?.full_name}?`}
            </DialogDescription>
          </DialogHeader>
          {forceConflicts.length > 0 && (
            <ul className='text-sm text-slate-600 max-h-40 overflow-y-auto list-disc pl-5 space-y-1'>
              {forceConflicts.map((c) => (
                <li key={c.id}>
                  {new Date(c.scheduled_at).toLocaleString("vi-VN")}
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setDeactivateTarget(null);
                setForceConflicts([]);
              }}>
              Huỷ
            </Button>
            <Button
              variant='destructive'
              disabled={deactivating}
              onClick={() =>
                deactivateTarget &&
                handleDeactivate(deactivateTarget, forceConflicts.length > 0)
              }>
              {deactivating
                ? "Đang xử lý..."
                : forceConflicts.length > 0
                  ? "Vô hiệu hoá (buộc)"
                  : "Vô hiệu hoá"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
