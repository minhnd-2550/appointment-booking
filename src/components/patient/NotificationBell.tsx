"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationDrawer } from "./NotificationDrawer";

interface InAppNotification {
  id: string;
  event_type: string;
  message: string;
  is_read: boolean;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
}

interface NotificationBellProps {
  patientId: string;
}

export function NotificationBell({ patientId }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  // Initial fetch of unread count
  useEffect(() => {
    supabase
      .from("in_app_notifications")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patientId)
      .eq("is_read", false)
      .then(({ count }) => {
        setUnreadCount(count ?? 0);
      });
  }, [patientId]);

  // Realtime subscription for new notifications
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "in_app_notifications",
          filter: `patient_id=eq.${patientId}`,
        },
        () => {
          setUnreadCount((prev) => prev + 1);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "in_app_notifications",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          const updated = payload.new as InAppNotification;
          if (updated.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, supabase]);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Refresh unread count after drawer closes
      supabase
        .from("in_app_notifications")
        .select("id", { count: "exact", head: true })
        .eq("patient_id", patientId)
        .eq("is_read", false)
        .then(({ count }) => setUnreadCount(count ?? 0));
    }
  };

  return (
    <>
      <Button
        variant='ghost'
        size='icon'
        className='relative'
        onClick={() => handleOpen(true)}
        aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ""}`}>
        <Bell className='h-5 w-5' />
        {unreadCount > 0 && (
          <span className='absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white'>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>
      <NotificationDrawer
        open={open}
        onOpenChange={handleOpen}
        patientId={patientId}
      />
    </>
  );
}
