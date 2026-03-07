"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

interface SystemSetting {
  key: string;
  value: unknown;
  updated_by: string | null;
  updated_at: string | null;
}

function SettingRow({ setting }: { setting: SystemSetting }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(JSON.stringify(setting.value));

  const saveMutation = useMutation({
    mutationFn: async () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(draft);
      } catch {
        parsed = draft; // treat as raw string
      }
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: setting.key, value: parsed }),
      });
      if (!res.ok) throw new Error("Lưu thất bại");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Đã cập nhật cài đặt");
      setEditing(false);
    },
    onError: () => toast.error("Lưu thất bại"),
  });

  return (
    <div className='flex items-center gap-3 py-2 border-b last:border-0'>
      <code className='min-w-48 text-sm font-mono text-muted-foreground'>
        {setting.key}
      </code>
      {editing ? (
        <>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className='flex-1 font-mono text-sm'
          />
          <Button
            size='sm'
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Check className='h-4 w-4' />
            )}
          </Button>
          <Button
            size='sm'
            variant='ghost'
            onClick={() => {
              setEditing(false);
              setDraft(JSON.stringify(setting.value));
            }}>
            <X className='h-4 w-4' />
          </Button>
        </>
      ) : (
        <>
          <span className='flex-1 font-mono text-sm'>
            {JSON.stringify(setting.value)}
          </span>
          <Button size='sm' variant='ghost' onClick={() => setEditing(true)}>
            <Pencil className='h-4 w-4' />
          </Button>
        </>
      )}
    </div>
  );
}

export function SystemSettingsPanel() {
  const { data, isLoading } = useQuery<{ settings: SystemSetting[] }>({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const settings = data?.settings ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cài đặt hệ thống</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='flex justify-center py-6'>
            <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
          </div>
        ) : settings.length === 0 ? (
          <p className='text-sm text-muted-foreground'>Chưa có cài đặt nào</p>
        ) : (
          <div>
            {settings.map((s) => (
              <SettingRow key={s.key} setting={s} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
