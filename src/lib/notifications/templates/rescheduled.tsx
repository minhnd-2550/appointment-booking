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

interface RescheduledProps {
  patientName: string;
  oldSlot: string;
  newSlot: string;
}

export default function RescheduledTemplate({
  patientName,
  oldSlot,
  newSlot,
}: RescheduledProps) {
  return (
    <Html lang='vi'>
      <Head />
      <Preview>Lịch hẹn đã được đổi giờ</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f8fafc" }}>
        <Container
          style={{ maxWidth: "520px", margin: "0 auto", padding: "32px 16px" }}>
          <Heading
            style={{ fontSize: "22px", color: "#1e293b", marginBottom: "8px" }}>
            Lịch hẹn đã được đổi giờ
          </Heading>
          <Text style={{ color: "#64748b" }}>
            Bệnh nhân <strong>{patientName}</strong> đã đổi lịch hẹn của họ.
          </Text>
          <Section
            style={{
              backgroundColor: "#f1f5f9",
              borderRadius: "8px",
              padding: "16px",
              margin: "16px 0",
            }}>
            <Text style={{ margin: 0, color: "#64748b" }}>
              <strong>Giờ cũ:</strong> {oldSlot}
            </Text>
            <Text style={{ margin: "8px 0 0", color: "#2563eb" }}>
              <strong>Giờ mới:</strong> {newSlot}
            </Text>
          </Section>
          <Text style={{ color: "#94a3b8", fontSize: "12px" }}>
            Đây là email tự động từ hệ thống đặt lịch khám.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
