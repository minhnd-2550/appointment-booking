"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Dependent {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | null;
  relationship: string;
  is_active: boolean;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  child: "Con",
  parent: "Cha/Mẹ",
  spouse: "Vợ/Chồng",
  sibling: "Anh/Chị/Em",
  other: "Khác",
};

const GENDER_LABELS: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

function DependentFormDialog({
  dependent,
  onClose,
}: {
  dependent?: Dependent;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(dependent?.full_name ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(
    dependent?.date_of_birth ?? "",
  );
  const [gender, setGender] = useState(dependent?.gender ?? "");
  const [relationship, setRelationship] = useState(
    dependent?.relationship ?? "",
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        fullName,
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || undefined,
        relationship,
      };
      const url = dependent
        ? `/api/patient/dependents/${dependent.id}`
        : "/api/patient/dependents";
      const method = dependent ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Lưu thất bại");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-dependents"] });
      toast.success(
        dependent ? "Cập nhật thành công" : "Thêm người phụ thuộc thành công",
      );
      onClose();
    },
    onError: () => toast.error("Lưu thất bại. Vui lòng thử lại."),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {dependent ? "Chỉnh sửa" : "Thêm người phụ thuộc"}
          </DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='space-y-1.5'>
            <Label htmlFor='fullName'>Họ và tên *</Label>
            <Input
              id='fullName'
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='dob'>Ngày sinh</Label>
            <Input
              id='dob'
              type='date'
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>
          <div className='space-y-1.5'>
            <Label>Giới tính</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger>
                <SelectValue placeholder='Chọn giới tính' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='male'>Nam</SelectItem>
                <SelectItem value='female'>Nữ</SelectItem>
                <SelectItem value='other'>Khác</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-1.5'>
            <Label>Mối quan hệ *</Label>
            <Select value={relationship} onValueChange={setRelationship}>
              <SelectTrigger>
                <SelectValue placeholder='Chọn mối quan hệ' />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RELATIONSHIP_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!fullName || !relationship || mutation.isPending}>
            {mutation.isPending && (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            )}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DependentList() {
  const queryClient = useQueryClient();
  const [editTarget, setEditTarget] = useState<Dependent | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading } = useQuery<{ dependents: Dependent[] }>({
    queryKey: ["patient-dependents"],
    queryFn: async () => {
      const res = await fetch("/api/patient/dependents");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/patient/dependents/${id}`, {
        method: "DELETE",
      });
      if (res.status === 409) {
        const json = await res.json();
        throw new Error(json.error);
      }
      if (!res.ok) throw new Error("Xóa thất bại");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-dependents"] });
      toast.success("Đã xóa người phụ thuộc");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/patient/dependents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      if (!res.ok) throw new Error("Vô hiệu hóa thất bại");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-dependents"] });
      toast.success("Đã vô hiệu hóa");
    },
    onError: () => toast.error("Thất bại. Vui lòng thử lại."),
  });

  const dependents = data?.dependents ?? [];

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>Người phụ thuộc</h2>
        <Button size='sm' onClick={() => setShowAdd(true)}>
          <Plus className='mr-1 h-4 w-4' /> Thêm
        </Button>
      </div>

      {isLoading ? (
        <div className='flex justify-center py-8'>
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        </div>
      ) : dependents.length === 0 ? (
        <p className='py-6 text-center text-sm text-muted-foreground'>
          Chưa có người phụ thuộc
        </p>
      ) : (
        <div className='grid gap-3 sm:grid-cols-2'>
          {dependents.map((dep) => (
            <Card key={dep.id}>
              <CardHeader className='pb-2'>
                <div className='flex items-start justify-between'>
                  <CardTitle className='text-base'>{dep.full_name}</CardTitle>
                  <Badge variant='secondary'>
                    {RELATIONSHIP_LABELS[dep.relationship] ?? dep.relationship}
                  </Badge>
                </div>
                <CardDescription>
                  {dep.gender && GENDER_LABELS[dep.gender]}
                  {dep.date_of_birth && ` · ${dep.date_of_birth}`}
                </CardDescription>
              </CardHeader>
              <CardContent className='flex gap-2 pt-0'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => setEditTarget(dep)}>
                  <Pencil className='mr-1 h-3 w-3' /> Sửa
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  className='text-destructive hover:bg-destructive/10'
                  onClick={() => deleteMutation.mutate(dep.id)}
                  disabled={deleteMutation.isPending}>
                  <Trash2 className='mr-1 h-3 w-3' /> Xóa
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showAdd && <DependentFormDialog onClose={() => setShowAdd(false)} />}
      {editTarget && (
        <DependentFormDialog
          dependent={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
