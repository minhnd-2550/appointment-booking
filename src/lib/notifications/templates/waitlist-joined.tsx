import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { NotificationPayload } from "@/types/domain";

export function WaitlistJoinedEmail(data: NotificationPayload) {
  return (
    <Html lang='vi'>
      <Head />
      <Preview>Bạn đã đăng ký danh sách chờ thành công</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Đăng ký danh sách chờ thành công ✓</Heading>
          <Text style={text}>Xin chào{data.name ? ` ${data.name}` : ""},</Text>
          <Text style={text}>
            Bạn đã được thêm vào danh sách chờ. Chúng tôi sẽ thông báo ngay khi
            có lịch trống phù hợp.
          </Text>
          {(data.preferredDateFrom || data.preferredDateTo) && (
            <Section style={infoBox}>
              {data.preferredDateFrom && (
                <Text style={infoItem}>Từ ngày: {data.preferredDateFrom}</Text>
              )}
              {data.preferredDateTo && (
                <Text style={infoItem}>Đến ngày: {data.preferredDateTo}</Text>
              )}
            </Section>
          )}
          <Text style={note}>
            Bạn sẽ nhận được email khi có lịch trống với liên kết để xác nhận
            đặt lịch. Liên kết này có thời hạn, vui lòng xác nhận ngay khi nhận
            được.
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
const infoBox = {
  backgroundColor: "#f1f5f9",
  padding: "12px 16px",
  borderRadius: "6px",
  margin: "16px 0",
};
const infoItem = { fontSize: "13px", color: "#334155", margin: "4px 0" };
const note = { fontSize: "12px", color: "#94a3b8", marginTop: "24px" };
const footer = { fontSize: "12px", color: "#94a3b8", marginTop: "8px" };
