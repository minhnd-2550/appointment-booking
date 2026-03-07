import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { NotificationPayload } from "@/types/domain";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

export function WaitlistOpportunityEmail(data: NotificationPayload) {
  const expiresAt = data.expiresAt ? parseISO(data.expiresAt) : null;
  const expiresFormatted = expiresAt
    ? format(expiresAt, "HH:mm 'ngày' dd/MM/yyyy", { locale: vi })
    : null;

  return (
    <Html lang='vi'>
      <Head />
      <Preview>Có lịch trống! Xác nhận ngay trước khi hết hạn</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Có lịch trống phù hợp! 🎉</Heading>
          <Text style={text}>Xin chào{data.name ? ` ${data.name}` : ""},</Text>
          <Text style={text}>
            Một lịch hẹn đã được giải phóng và phù hợp với đăng ký chờ của bạn.
            Nhấn vào nút bên dưới để xác nhận đặt lịch ngay.
          </Text>

          {expiresFormatted && (
            <Section style={warningBox}>
              <Text style={warningText}>
                ⚠️ Liên kết này hết hạn lúc {expiresFormatted}. Xác nhận ngay!
              </Text>
            </Section>
          )}

          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button href={data.claimUrl ?? "#"} style={btn}>
              Xác nhận đặt lịch
            </Button>
          </Section>

          <Text style={note}>
            Nếu bạn không xác nhận trong thời gian trên, cơ hội này sẽ được
            chuyển sang bệnh nhân khác trong danh sách chờ.
          </Text>
          <Text style={footer}>Phòng Khám – Hệ thống đặt lịch</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif" };
const container = {
  maxWidth: "520px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  padding: "32px 24px",
  borderRadius: "8px",
};
const h1 = {
  fontSize: "20px",
  fontWeight: "bold",
  color: "#0f172a",
  marginBottom: "16px",
};
const text = { fontSize: "14px", color: "#475569", lineHeight: "1.6" };
const warningBox = {
  backgroundColor: "#fef3c7",
  border: "1px solid #fbbf24",
  padding: "12px 16px",
  borderRadius: "6px",
  margin: "16px 0",
};
const warningText = { fontSize: "13px", color: "#92400e", margin: 0 };
const btn = {
  backgroundColor: "#16a34a",
  color: "#ffffff",
  padding: "12px 28px",
  borderRadius: "6px",
  fontWeight: "bold",
  fontSize: "14px",
  textDecoration: "none",
};
const note = { fontSize: "12px", color: "#94a3b8", marginTop: "24px" };
const footer = { fontSize: "12px", color: "#94a3b8", marginTop: "8px" };
