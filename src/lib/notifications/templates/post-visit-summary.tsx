import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";

interface PostVisitSummaryProps {
  patientName: string;
  doctorName: string;
  specialty?: string;
  slotStart: string;
  diagnosis?: string;
  hasPrescription?: boolean;
  hasLabResults?: boolean;
  paymentAmount?: number;
  currency?: string;
  paymentUrl?: string;
}

export default function PostVisitSummaryTemplate({
  patientName,
  doctorName,
  specialty,
  slotStart,
  diagnosis,
  hasPrescription,
  hasLabResults,
  paymentAmount,
  currency = "VND",
  paymentUrl,
}: PostVisitSummaryProps) {
  const formattedAmount = paymentAmount
    ? new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(
        paymentAmount,
      )
    : null;

  return (
    <Html lang='vi'>
      <Head />
      <Preview>Tóm tắt sau khám – {doctorName}</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f8fafc" }}>
        <Container
          style={{ maxWidth: "520px", margin: "0 auto", padding: "32px 16px" }}>
          <Heading
            style={{ fontSize: "22px", color: "#1e293b", marginBottom: "8px" }}>
            Tóm tắt sau khám
          </Heading>
          <Text style={{ color: "#64748b" }}>
            Xin chào <strong>{patientName}</strong>,
          </Text>
          <Text style={{ color: "#64748b" }}>
            Dưới đây là tóm tắt buổi khám của bạn với{" "}
            <strong>{doctorName}</strong>
            {specialty && ` (${specialty})`} vào ngày{" "}
            <strong>{slotStart}</strong>.
          </Text>

          {diagnosis && (
            <Section
              style={{
                backgroundColor: "#f1f5f9",
                borderRadius: "6px",
                padding: "12px 16px",
                margin: "16px 0",
              }}>
              <Text
                style={{
                  fontWeight: "600",
                  color: "#1e293b",
                  marginBottom: "4px",
                }}>
                Chẩn đoán
              </Text>
              <Text style={{ color: "#475569", margin: 0 }}>{diagnosis}</Text>
            </Section>
          )}

          {(hasPrescription || hasLabResults) && (
            <Section style={{ margin: "16px 0" }}>
              <Text
                style={{
                  fontWeight: "600",
                  color: "#1e293b",
                  marginBottom: "8px",
                }}>
                Kết quả khám:
              </Text>
              {hasPrescription && (
                <Text style={{ color: "#64748b", margin: "4px 0" }}>
                  📋 Đơn thuốc đã được kê — đăng nhập để xem chi tiết
                </Text>
              )}
              {hasLabResults && (
                <Text style={{ color: "#64748b", margin: "4px 0" }}>
                  🔬 Kết quả xét nghiệm có sẵn trong hồ sơ của bạn
                </Text>
              )}
            </Section>
          )}

          {formattedAmount && (
            <>
              <Hr style={{ margin: "20px 0" }} />
              <Text style={{ color: "#64748b" }}>
                Phí khám: <strong>{formattedAmount}</strong>
              </Text>
              {paymentUrl && (
                <Text style={{ color: "#64748b" }}>
                  Vui lòng{" "}
                  <a href={paymentUrl} style={{ color: "#2563eb" }}>
                    thanh toán tại đây
                  </a>
                  .
                </Text>
              )}
            </>
          )}

          <Hr style={{ margin: "20px 0" }} />
          <Text style={{ fontSize: "13px", color: "#94a3b8" }}>
            Cảm ơn bạn đã tin tưởng sử dụng dịch vụ của chúng tôi.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
