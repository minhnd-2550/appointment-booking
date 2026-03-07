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

interface EmailVerificationProps {
  confirmUrl: string;
  email?: string;
}

export default function EmailVerificationTemplate({
  confirmUrl,
  email,
}: EmailVerificationProps) {
  return (
    <Html lang='vi'>
      <Head />
      <Preview>Xác minh email tài khoản của bạn</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f8fafc" }}>
        <Container
          style={{ maxWidth: "520px", margin: "0 auto", padding: "32px 16px" }}>
          <Heading
            style={{ fontSize: "22px", color: "#1e293b", marginBottom: "8px" }}>
            Xác minh email của bạn
          </Heading>
          {email && (
            <Text style={{ color: "#64748b" }}>
              Chúng tôi đã nhận được yêu cầu đăng ký tài khoản cho{" "}
              <strong>{email}</strong>.
            </Text>
          )}
          <Text style={{ color: "#64748b" }}>
            Nhấp vào nút bên dưới để xác minh địa chỉ email và kích hoạt tài
            khoản của bạn. Liên kết này sẽ hết hạn sau <strong>24 giờ</strong>.
          </Text>
          <Section style={{ textAlign: "center", margin: "24px 0" }}>
            <Button
              href={confirmUrl}
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                padding: "12px 28px",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: "600",
              }}>
              Xác minh email
            </Button>
          </Section>
          <Text style={{ fontSize: "13px", color: "#94a3b8" }}>
            Nếu bạn không tạo tài khoản, hãy bỏ qua email này.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
