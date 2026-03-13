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
 * Generate a lightweight PDF prescription buffer (no external PDF dependency).
 */
export function generatePrescriptionPdf(data: PrescriptionData): Buffer {
  const formattedDate = format(new Date(data.date), "dd/MM/yyyy", {
    locale: vi,
  });

  const lines: string[] = [
    data.clinicName,
    "TOA THUOC",
    `Ma ca: ${data.appointmentId.slice(0, 8).toUpperCase()}`,
    `Ngay: ${formattedDate}`,
    "",
    `Benh nhan: ${data.patientName}`,
    ...(data.patientDob ? [`Ngay sinh: ${data.patientDob}`] : []),
    `Bac si: ${data.doctorName}`,
    `Chuyen khoa: ${data.doctorSpecialty}`,
    ...(data.visitReason ? ["", `Ly do kham: ${data.visitReason}`] : []),
    "",
    "--- DON THUOC ---",
  ];

  if (data.medications && data.medications.length > 0) {
    data.medications.forEach((m, index) => {
      lines.push(
        `${index + 1}. ${m.name}`,
        `   Lieu: ${m.dosage} | Tan suat: ${m.frequency} | Thoi gian: ${m.duration}`,
        ...(m.notes ? [`   Ghi chu: ${m.notes}`] : []),
      );
    });
  } else {
    lines.push("Khong co thuoc duoc ke.");
  }

  if (data.prescriptionNote) {
    lines.push("", "--- GHI CHU ---", data.prescriptionNote);
  }

  lines.push("", `Tai lieu tao tu dong - ${formattedDate}`);

  const textContent = lines
    .map((line, i) => {
      const y = 800 - i * 16;
      const safe = pdfEscape(line);
      const fontSize = i === 0 ? 14 : i === 1 ? 13 : 11;
      return `BT /F1 ${fontSize} Tf 48 ${y} Td (${safe}) Tj ET`;
    })
    .join("\n");

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

  const offsets: number[] = [];
  let pos = header.length;
  offsets.push(pos);
  pos += catalog.length;
  offsets.push(pos);
  pos += pages.length;
  offsets.push(pos);
  pos += page.length;
  offsets.push(pos);
  pos += stream.length;
  offsets.push(pos);

  const xrefOffset = header.length + body.length;
  const xref = [
    "xref",
    "0 6",
    "0000000000 65535 f ",
    ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n `),
  ].join("\n");

  const trailer = `\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(header + body + xref + trailer, "latin1");
}

function pdfEscape(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(
      /[^\x20-\x7E]/g,
      (c) => `\\${c.charCodeAt(0).toString(8).padStart(3, "0")}`,
    );
}
