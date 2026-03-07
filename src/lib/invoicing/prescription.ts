import { format } from "date-fns";
import { vi } from "date-fns/locale";

export interface PrescriptionData {
  appointmentId: string;
  patientName: string;
  patientDob?: string | null;
  doctorName: string;
  doctorSpecialty: string;
  clinicName: string;
  date: string; // ISO date
  visitReason?: string | null;
  prescriptionNote?: string | null;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes?: string;
  }>;
}

/**
 * Generates a simple HTML-based prescription PDF as a Buffer.
 * Uses a minimal HTML template rendered server-side — no pdfkit dependency.
 */
export function generatePrescriptionPdf(data: PrescriptionData): Buffer {
  const formattedDate = format(new Date(data.date), "dd/MM/yyyy", {
    locale: vi,
  });

  const medicationsHtml =
    data.medications && data.medications.length > 0
      ? `
        <table style="width:100%;border-collapse:collapse;margin-top:8px;">
          <thead>
            <tr style="background:#f0f4f8;">
              <th style="padding:6px 10px;text-align:left;border:1px solid #d0d7de;">Thuốc</th>
              <th style="padding:6px 10px;text-align:left;border:1px solid #d0d7de;">Liều</th>
              <th style="padding:6px 10px;text-align:left;border:1px solid #d0d7de;">Tần suất</th>
              <th style="padding:6px 10px;text-align:left;border:1px solid #d0d7de;">Thời gian</th>
              <th style="padding:6px 10px;text-align:left;border:1px solid #d0d7de;">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            ${data.medications
              .map(
                (m, i) => `
              <tr style="${i % 2 === 0 ? "" : "background:#f9fafb;"}">
                <td style="padding:6px 10px;border:1px solid #d0d7de;">${escHtml(m.name)}</td>
                <td style="padding:6px 10px;border:1px solid #d0d7de;">${escHtml(m.dosage)}</td>
                <td style="padding:6px 10px;border:1px solid #d0d7de;">${escHtml(m.frequency)}</td>
                <td style="padding:6px 10px;border:1px solid #d0d7de;">${escHtml(m.duration)}</td>
                <td style="padding:6px 10px;border:1px solid #d0d7de;">${escHtml(m.notes ?? "")}</td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>`
      : '<p style="color:#666;">Không có toa thuốc</p>';

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <title>Toa thuốc - ${escHtml(data.patientName)}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 13px; margin: 0; padding: 32px; color: #1a1a1a; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { font-size: 15px; margin: 20px 0 6px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; }
    .clinic { font-size: 11px; color: #555; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; margin: 12px 0; }
    .label { color: #555; font-size: 12px; }
    .value { font-weight: 600; }
    .footer { margin-top: 40px; text-align: right; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>TOA THUỐC</h1>
      <div class="clinic">${escHtml(data.clinicName)}</div>
    </div>
    <div style="text-align:right;font-size:12px;color:#555;">
      Ngày: ${formattedDate}<br/>
      Mã CA: ${escHtml(data.appointmentId.slice(0, 8).toUpperCase())}
    </div>
  </div>

  <h2>Thông tin bệnh nhân</h2>
  <div class="info-grid">
    <div><span class="label">Họ và tên: </span><span class="value">${escHtml(data.patientName)}</span></div>
    ${data.patientDob ? `<div><span class="label">Ngày sinh: </span><span class="value">${escHtml(data.patientDob)}</span></div>` : ""}
  </div>

  <h2>Thông tin bác sĩ</h2>
  <div class="info-grid">
    <div><span class="label">Bác sĩ: </span><span class="value">${escHtml(data.doctorName)}</span></div>
    <div><span class="label">Chuyên khoa: </span><span class="value">${escHtml(data.doctorSpecialty)}</span></div>
  </div>

  ${data.visitReason ? `<h2>Lý do khám</h2><p>${escHtml(data.visitReason)}</p>` : ""}

  <h2>Toa thuốc</h2>
  ${medicationsHtml}

  ${
    data.prescriptionNote
      ? `<h2>Ghi chú</h2><p style="white-space:pre-wrap;">${escHtml(data.prescriptionNote)}</p>`
      : ""
  }

  <div class="footer">
    <em>Tài liệu này được tạo tự động — ${formattedDate}</em>
  </div>
</body>
</html>`;

  return Buffer.from(html, "utf-8");
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
