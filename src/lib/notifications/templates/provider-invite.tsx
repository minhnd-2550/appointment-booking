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

export function ProviderInviteEmail(data: NotificationPayload) {
  return (
    <Html lang='vi'>
      <Head />
      <Preview>
        Bạn được mời làm bác sĩ tại Phòng Khám – Thiết lập mật khẩu ngay
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Chào mừng đến với Phòng Khám!</Heading>
          <Text style={text}>Xin chào{data.name ? ` ${data.name}` : ""},</Text>
          <Text style={text}>
            Tài khoản bác sĩ của bạn đã được tạo trong hệ thống Phòng Khám. Vui
            lòng nhấn vào nút bên dưới để thiết lập mật khẩu và truy cập tài
            khoản của bạn.
          </Text>

          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button href={data.setPasswordUrl ?? "#"} style={btn}>
              Thiết lập mật khẩu
            </Button>
          </Section>

          <Text style={note}>
            Liên kết này sẽ hết hạn sau 24 giờ. Nếu bạn không yêu cầu điều này,
            hãy bỏ qua email này.
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
const btn = {
  backgroundColor: "#2563eb",
  color: "#ffffff",
  padding: "12px 28px",
  borderRadius: "6px",
  fontWeight: "bold",
  fontSize: "14px",
  textDecoration: "none",
};
const note = { fontSize: "12px", color: "#94a3b8", marginTop: "24px" };
const footer = { fontSize: "12px", color: "#94a3b8", marginTop: "8px" };
