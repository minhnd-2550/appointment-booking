import { Resend } from "resend";
import { render } from "@react-email/components";
import type { NotificationPayload, NotificationType } from "@/types/domain";
import { BookingReceivedEmail } from "./templates/booking-received";
import { ConfirmedEmail } from "./templates/confirmed";
import { CancelledEmail } from "./templates/cancelled";
import { ReminderEmail } from "./templates/reminder";
import RescheduledTemplate from "./templates/rescheduled";
import { InvoiceEmail } from "./templates/invoice";
import { ProviderInviteEmail } from "./templates/provider-invite";
import { WaitlistJoinedEmail } from "./templates/waitlist-joined";
import { WaitlistOpportunityEmail } from "./templates/waitlist-opportunity";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "clinic@resend.dev"; // Use your verified Resend domain in production

interface SendNotificationOptions {
  appointmentId: string;
  supabaseServiceClient?: import("@supabase/supabase-js").SupabaseClient;
}

/**
 * Send a notification email for an appointment lifecycle event.
 *
 * - If MOCK_EMAIL=true: logs to console only (no external call)
 * - Otherwise: sends via Resend with one automatic retry on failure
 * - Logs outcome to notification_logs via the provided service client (optional)
 */
export async function sendNotification(
  type: NotificationType,
  to: string,
  data: NotificationPayload,
  opts: SendNotificationOptions = { appointmentId: "" },
): Promise<void> {
  const { subject, html } = await buildEmail(type, data);

  if (process.env.MOCK_EMAIL === "true") {
    console.log(
      `[MOCK_EMAIL] type=${type} to=${to} subject="${subject}" appointmentId=${opts.appointmentId}`,
      JSON.stringify(data, null, 2),
    );
    await logNotification(opts, type, to, "sent");
    return;
  }

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
      await logNotification(opts, type, to, "sent");
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) {
        // Brief delay before retry
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  // Both attempts failed
  console.error(
    `[sendNotification] FAILED type=${type} to=${to} error=${lastError?.message}`,
  );
  await logNotification(opts, type, to, "failed", lastError?.message);
}

async function buildEmail(
  type: NotificationType,
  data: NotificationPayload,
): Promise<{ subject: string; html: string }> {
  switch (type) {
    case "booking-received": {
      const html = await render(BookingReceivedEmail(data));
      return { subject: "Đặt lịch thành công – Phòng khám", html };
    }
    case "confirmed": {
      const html = await render(ConfirmedEmail(data));
      return { subject: "Lịch hẹn đã được xác nhận", html };
    }
    case "cancelled": {
      const html = await render(CancelledEmail(data));
      return { subject: "Lịch hẹn đã bị huỷ", html };
    }
    case "reminder": {
      const html = await render(ReminderEmail(data));
      return { subject: "Nhắc nhở: Lịch hẹn của bạn vào ngày mai", html };
    }
    case "rescheduled": {
      const html = await render(
        RescheduledTemplate({
          patientName: String(data.patientName ?? data.name ?? ""),
          oldSlot: String(data.oldSlot ?? data.slotStart ?? ""),
          newSlot: String(data.newSlot ?? data.newSlotStart ?? ""),
        }),
      );
      return { subject: "Lịch hẹn đã được đổi giờ", html };
    }
    case "cancelled-by-patient": {
      const html = await render(CancelledEmail(data));
      return { subject: "Bệnh nhân đã huỷ lịch hẹn", html };
    }
    case "invoice": {
      const html = await render(InvoiceEmail(data));
      return {
        subject: `Hoá đơn ${data.invoiceNumber ?? ""} – Phòng khám`,
        html,
      };
    }
    case "provider-invite": {
      const html = await render(ProviderInviteEmail(data));
      return {
        subject: "Mời bạn vào hệ thống Phòng Khám – Thiết lập mật khẩu",
        html,
      };
    }
    case "waitlist-joined": {
      const html = await render(WaitlistJoinedEmail(data));
      return { subject: "Đăng ký danh sách chờ thành công", html };
    }
    case "waitlist-opportunity": {
      const html = await render(WaitlistOpportunityEmail(data));
      return {
        subject: "Có lịch trống! Xác nhận ngay trước khi hết hạn",
        html,
      };
    }
    default:
      return { subject: "Thông báo", html: "" };
  }
}

async function logNotification(
  opts: SendNotificationOptions,
  type: NotificationType,
  recipient: string,
  status: "sent" | "failed" | "retried",
  errorMessage?: string,
): Promise<void> {
  if (!opts.supabaseServiceClient || !opts.appointmentId) return;
  try {
    await opts.supabaseServiceClient.from("notification_logs").insert({
      appointment_id: opts.appointmentId,
      notification_type: type,
      recipient_email: recipient,
      status,
      error_message: errorMessage ?? null,
    });
  } catch (err) {
    // Logging failure must not throw
    console.error(
      "[logNotification] failed to write to notification_logs",
      err,
    );
  }
}
