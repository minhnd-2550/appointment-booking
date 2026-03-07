"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface InAppNotification {
  id: string;
  event_type: string;
  message: string;
  is_read: boolean;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
}

interface NotificationsResponse {
  notifications: InAppNotification[];
  total: number;
  unreadCount: number;
}

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
}

const PAGE_SIZE = 20;

export function NotificationDrawer({
  open,
  onOpenChange,
  patientId,
}: NotificationDrawerProps) {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ["patient-notifications", page],
    queryFn: async () => {
      const res = await fetch(
        `/api/patient/notifications?page=${page}&pageSize=${PAGE_SIZE}`,
      );
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: async (payload: { ids?: string[]; markAll?: boolean }) => {
      const res = await fetch("/api/patient/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to mark notifications as read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-notifications"] });
    },
  });

  const handleMarkAll = useCallback(() => {
    markReadMutation.mutate({ markAll: true });
  }, [markReadMutation]);

  const handleMarkOne = useCallback(
    (id: string) => {
      markReadMutation.mutate({ ids: [id] });
    },
    [markReadMutation],
  );

  const notifications = data?.notifications ?? [];
  const total = data?.total ?? 0;
  const hasMore = page * PAGE_SIZE < total;
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='flex w-full flex-col sm:max-w-md'>
        <SheetHeader className='flex-row items-center justify-between'>
          <SheetTitle>
            Thông báo{" "}
            {unreadCount > 0 && (
              <span className='text-sm text-muted-foreground'>
                ({unreadCount} chưa đọc)
              </span>
            )}
          </SheetTitle>
          {unreadCount > 0 && (
            <Button
              variant='ghost'
              size='sm'
              onClick={handleMarkAll}
              disabled={markReadMutation.isPending}>
              <CheckCheck className='mr-1 h-4 w-4' />
              Đánh dấu tất cả đã đọc
            </Button>
          )}
        </SheetHeader>

        <ScrollArea className='flex-1 pr-2'>
          {isLoading ? (
            <div className='flex justify-center py-8'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
          ) : notifications.length === 0 ? (
            <p className='py-8 text-center text-sm text-muted-foreground'>
              Chưa có thông báo
            </p>
          ) : (
            <div className='space-y-1 py-2'>
              {notifications.map((n) => (
                <button
                  key={n.id}
                  className={cn(
                    "w-full rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted/60",
                    !n.is_read &&
                      "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30",
                  )}
                  onClick={() => !n.is_read && handleMarkOne(n.id)}>
                  <p className={cn("text-sm", !n.is_read && "font-medium")}>
                    {n.message}
                  </p>
                  <p className='mt-0.5 text-xs text-muted-foreground'>
                    {format(new Date(n.created_at), "d MMM yyyy, HH:mm", {
                      locale: vi,
                    })}
                  </p>
                </button>
              ))}
            </div>
          )}

          {hasMore && (
            <div className='py-3 text-center'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setPage((p) => p + 1)}>
                Tải thêm
              </Button>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
