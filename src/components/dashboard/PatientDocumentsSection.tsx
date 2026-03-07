"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Image, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface PatientDocument {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  signedUrl: string | null;
}

interface PatientDocumentsSectionProps {
  appointmentId: string;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith("image/"))
    return <Image className='h-5 w-5 text-blue-500' />;
  return <FileText className='h-5 w-5 text-red-500' />;
}

export function PatientDocumentsSection({
  appointmentId,
}: PatientDocumentsSectionProps) {
  const { data, isLoading } = useQuery<{ documents: PatientDocument[] }>({
    queryKey: ["doctor-patient-documents", appointmentId],
    queryFn: async () => {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/patient-documents`,
      );
      if (!res.ok) throw new Error("Không thể tải tài liệu");
      return res.json();
    },
  });

  const documents = data?.documents ?? [];

  if (isLoading) {
    return (
      <div className='flex justify-center py-4'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>
        Bệnh nhân chưa tải lên tài liệu nào
      </p>
    );
  }

  return (
    <div className='space-y-2'>
      <h4 className='text-sm font-medium text-muted-foreground'>
        Tài liệu từ bệnh nhân
      </h4>
      {documents.map((doc) => (
        <Card key={doc.id}>
          <CardContent className='flex items-center gap-3 py-3'>
            <FileIcon type={doc.file_type} />
            <div className='flex-1 min-w-0'>
              <p className='truncate text-sm font-medium'>{doc.file_name}</p>
              <p className='text-xs text-muted-foreground'>
                {formatFileSize(doc.file_size)} ·{" "}
                {format(new Date(doc.created_at), "dd/MM/yyyy", { locale: vi })}
              </p>
            </div>
            {doc.signedUrl && (
              <Button size='sm' variant='outline' asChild>
                <a href={doc.signedUrl} target='_blank' rel='noreferrer'>
                  Xem
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
