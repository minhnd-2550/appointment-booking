/**
 * Lightweight server-only invoice PDF generator.
 * Generates a minimal valid PDF without external dependencies.
 */

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string; // e.g., "2026-03-06"
  patientName: string;
  patientEmail: string;
  doctorName: string;
  doctorSpecialty: string;
  serviceDescription: string;
  amount: number;
  currency: string; // e.g., "VND"
  clinicName?: string;
}

/**
 * Generate a simple PDF invoice and return it as a Buffer.
 */
export function generateInvoicePdf(data: InvoiceData): Buffer {
  const clinic = data.clinicName ?? "Phòng Khám";
  const lines = [
    clinic,
    "",
    `HÓA ĐƠN: ${data.invoiceNumber}`,
    `Ngày: ${data.invoiceDate}`,
    "",
    `Bệnh nhân: ${data.patientName}`,
    `Email: ${data.patientEmail}`,
    "",
    `Bác sĩ: ${data.doctorName}`,
    `Chuyên khoa: ${data.doctorSpecialty}`,
    "",
    `Dịch vụ: ${data.serviceDescription}`,
    "",
    `Tổng cộng: ${data.amount.toLocaleString("vi-VN")} ${data.currency}`,
    "",
    "Cảm ơn bạn đã tin tưởng sử dụng dịch vụ của chúng tôi.",
  ];

  // Build PDF content stream
  const textContent = lines
    .map((line, i) => {
      const y = 720 - i * 20;
      const safe = pdfEscape(line);
      if (i === 0) return `BT /F1 16 Tf 50 ${y} Td (${safe}) Tj ET`;
      if (i === 2) return `BT /F1 14 Tf 50 ${y} Td (${safe}) Tj ET`;
      return `BT /F1 12 Tf 50 ${y} Td (${safe}) Tj ET`;
    })
    .join("\n");

  // Build PDF objects
  const catalog = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const pages = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
  const page =
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
    "/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n";
  const stream = `4 0 obj\n<< /Length ${textContent.length} >>\nstream\n${textContent}\nendstream\nendobj\n`;
  const font =
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";

  const header = "%PDF-1.4\n";
  const body = catalog + pages + page + stream + font;

  // Cross-reference table
  const offsets: number[] = [];
  let pos = header.length;
  offsets.push(pos); // obj 1
  pos += catalog.length;
  offsets.push(pos); // obj 2
  pos += pages.length;
  offsets.push(pos); // obj 3
  pos += page.length;
  offsets.push(pos); // obj 4
  pos += stream.length;
  offsets.push(pos); // obj 5

  const xrefOffset = header.length + body.length;
  const xref = [
    "xref",
    "0 6",
    "0000000000 65535 f \n",
    ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`),
  ].join("\n");

  const trailer = `\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const full = header + body + xref + trailer;
  return Buffer.from(full, "latin1");
}

function pdfEscape(str: string): string {
  // Escape parentheses and backslashes in PDF strings (Latin-1 safe)
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(
      /[^\x20-\x7E]/g,
      (c) => `\\${c.charCodeAt(0).toString(8).padStart(3, "0")}`,
    );
}
