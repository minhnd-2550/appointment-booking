import {
  Body,
  Button,
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

export function InvoiceEmail(data: NotificationPayload) {
  const appointmentDate = data.appointmentDate
    ? format(parseISO(String(data.appointmentDate)), "dd/MM/yyyy", {
        locale: vi,
      })
    : "";

  const amount = Number(data.amount ?? 0).toLocaleString("vi-VN");
  const currency = String(data.currency ?? "VND");
  const invoiceNumber = String(data.invoiceNumber ?? "");
  const patientName = String(data.patientName ?? "");
  const doctorName = String(data.doctorName ?? "");
  const invoiceUrl = String(data.invoiceUrl ?? "");

  return (
    <Html lang='vi'>
      <Head />
      <Preview>
        Hoá đơn {invoiceNumber} – {amount} {currency}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Hoá đơn tư vấn của bạn đã sẵn sàng</Heading>
          <Text style={text}>Xin chào {patientName},</Text>
          <Text style={text}>
            Cảm ơn bạn đã thanh toán. Dưới đây là tóm tắt hoá đơn của bạn.
          </Text>

          <Section style={infoBox}>
            <Text style={infoLabel}>Số hoá đơn:</Text>
            <Text style={infoValue}>{invoiceNumber}</Text>
            <Hr style={hr} />
            <Text style={infoLabel}>Bác sĩ:</Text>
            <Text style={infoValue}>{doctorName}</Text>
            <Hr style={hr} />
            {appointmentDate && (
              <>
                <Text style={infoLabel}>Ngày khám:</Text>
                <Text style={infoValue}>{appointmentDate}</Text>
                <Hr style={hr} />
              </>
            )}
            <Text style={infoLabel}>Số tiền:</Text>
            <Text style={{ ...infoValue, fontWeight: "bold" }}>
              {amount} {currency}
            </Text>
          </Section>

          {invoiceUrl && (
            <Section style={{ textAlign: "center", margin: "24px 0" }}>
              <Button href={invoiceUrl} style={button}>
                Tải hoá đơn PDF
              </Button>
            </Section>
          )}

          <Text style={text}>
            Liên kết tải hoá đơn có hiệu lực trong 1 giờ. Nếu hết hạn, hãy đăng
            nhập cổng bệnh nhân để tải lại.
          </Text>
          <Text style={footer}>Phòng Khám – Chăm sóc sức khoẻ tận tâm</Text>
        </Container>
      </Body>
    </Html>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const main: React.CSSProperties = {
  backgroundColor: "#f6f9fc",
  fontFamily: "sans-serif",
};
const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "40px auto",
  padding: "40px",
  maxWidth: "560px",
  borderRadius: "8px",
};
const h1: React.CSSProperties = {
  fontSize: "20px",
  color: "#1a1a1a",
  marginBottom: "16px",
};
const text: React.CSSProperties = {
  fontSize: "14px",
  color: "#444",
  lineHeight: "1.6",
};
const infoBox: React.CSSProperties = {
  backgroundColor: "#f0f4ff",
  borderRadius: "6px",
  padding: "16px",
  margin: "16px 0",
};
const infoLabel: React.CSSProperties = {
  fontSize: "12px",
  color: "#888",
  margin: "4px 0 0",
};
const infoValue: React.CSSProperties = {
  fontSize: "14px",
  color: "#1a1a1a",
  margin: "2px 0 8px",
};
const hr: React.CSSProperties = { borderColor: "#ddd", margin: "8px 0" };
const button: React.CSSProperties = {
  backgroundColor: "#4f46e5",
  color: "#fff",
  padding: "12px 24px",
  borderRadius: "6px",
  fontSize: "14px",
  textDecoration: "none",
  display: "inline-block",
};
const footer: React.CSSProperties = {
  fontSize: "12px",
  color: "#aaa",
  marginTop: "32px",
};
