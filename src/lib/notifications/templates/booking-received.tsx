import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { NotificationPayload } from "@/types/domain";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

export function BookingReceivedEmail(data: NotificationPayload) {
  const slotStart = parseISO(data.slotStart!);
  const formatted = format(slotStart, "EEEE, dd/MM/yyyy 'lúc' HH:mm", {
    locale: vi,
  });

  return (
    <Html lang='vi'>
      <Head />
      <Preview>Xác nhận đặt lịch với {data.doctorName ?? ""}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Đặt lịch thành công!</Heading>
          <Text style={text}>Xin chào {data.patientName},</Text>
          <Text style={text}>
            Chúng tôi đã nhận được yêu cầu đặt lịch của bạn. Dưới đây là thông
            tin chi tiết:
          </Text>

          <Section style={infoBox}>
            <Text style={infoLabel}>Bác sĩ:</Text>
            <Text style={infoValue}>{data.doctorName}</Text>
            <Hr style={hr} />
            <Text style={infoLabel}>Thời gian:</Text>
            <Text style={infoValue}>{formatted}</Text>
            {data.visitReason && (
              <>
                <Hr style={hr} />
                <Text style={infoLabel}>Lý do khám:</Text>
                <Text style={infoValue}>{data.visitReason}</Text>
              </>
            )}
          </Section>

          <Text style={text}>
            Lịch hẹn của bạn đang chờ xác nhận từ phòng khám. Chúng tôi sẽ thông
            báo cho bạn ngay khi lịch được xác nhận.
          </Text>
          <Text style={footer}>Phòng Khám – Hệ thống đặt lịch</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default BookingReceivedEmail;

const main: React.CSSProperties = {
  backgroundColor: "#f6f9fc",
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "32px",
  maxWidth: "600px",
  borderRadius: "8px",
};

const h1: React.CSSProperties = {
  color: "#0f172a",
  fontSize: "24px",
  fontWeight: "700",
  marginBottom: "16px",
};

const text: React.CSSProperties = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "1.6",
  marginBottom: "12px",
};

const infoBox: React.CSSProperties = {
  backgroundColor: "#f0f9ff",
  border: "1px solid #bae6fd",
  borderRadius: "6px",
  padding: "16px",
  marginBottom: "24px",
};

const infoLabel: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "13px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  margin: "0 0 4px 0",
};

const infoValue: React.CSSProperties = {
  color: "#111827",
  fontSize: "15px",
  margin: "0 0 8px 0",
};

const hr: React.CSSProperties = {
  borderColor: "#e0f2fe",
  margin: "8px 0",
};

const footer: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "13px",
  marginTop: "32px",
};
