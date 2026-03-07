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

export function ConfirmedEmail(data: NotificationPayload) {
  const slotStart = parseISO(data.slotStart!);
  const formatted = format(slotStart, "EEEE, dd/MM/yyyy 'lúc' HH:mm", {
    locale: vi,
  });

  return (
    <Html lang='vi'>
      <Head />
      <Preview>Lịch hẹn đã được xác nhận – {formatted}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Lịch hẹn đã được xác nhận ✓</Heading>
          <Text style={text}>Xin chào {data.patientName},</Text>
          <Text style={text}>
            Lịch hẹn của bạn đã được phòng khám xác nhận. Vui lòng đến đúng giờ.
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
            Nếu bạn cần thay đổi hoặc huỷ lịch, vui lòng liên hệ phòng khám
            trước ít nhất 24 giờ.
          </Text>
          <Text style={footer}>Phòng Khám – Hệ thống đặt lịch</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ConfirmedEmail;

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
  backgroundColor: "#f0fdf4",
  border: "1px solid #bbf7d0",
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
  borderColor: "#dcfce7",
  margin: "8px 0",
};

const footer: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "13px",
  marginTop: "32px",
};
