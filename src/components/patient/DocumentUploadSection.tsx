"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PatientDocument {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  signedUrl: string | null;
}

interface DocumentUploadSectionProps {
  appointmentId: string;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith("image/"))
    return <ImageIcon className='h-5 w-5 text-blue-500' />;
  return <FileText className='h-5 w-5 text-red-500' />;
}

export function DocumentUploadSection({
  appointmentId,
}: DocumentUploadSectionProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { data, isLoading } = useQuery<{ documents: PatientDocument[] }>({
    queryKey: ["appointment-documents", appointmentId],
    queryFn: async () => {
      const res = await fetch(
        `/api/patient/appointments/${appointmentId}/documents`,
      );
      if (!res.ok) throw new Error("Không thể tải tài liệu");
      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      // Use XMLHttpRequest for progress tracking
      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error ?? "Upload thất bại"));
            } catch {
              reject(new Error("Upload thất bại"));
            }
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Lỗi kết nối")));
        xhr.open(
          "POST",
          `/api/patient/appointments/${appointmentId}/documents`,
        );
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      setUploadProgress(null);
      queryClient.invalidateQueries({
        queryKey: ["appointment-documents", appointmentId],
      });
      toast.success("Tải lên thành công");
    },
    onError: (err: Error) => {
      setUploadProgress(null);
      toast.error(err.message);
    },
  });

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0]!;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Định dạng không hỗ trợ. Chỉ PDF, JPG, PNG, WEBP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Tệp quá lớn. Tối đa 10 MB.");
      return;
    }
    uploadMutation.mutate(file);
  };

  const documents = data?.documents ?? [];

  return (
    <div className='space-y-4'>
      <h3 className='font-semibold'>Tài liệu đính kèm</h3>

      {/* Drop zone */}
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-primary/50",
          uploadMutation.isPending && "pointer-events-none opacity-60",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileRef.current?.click()}
        role='button'
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
        aria-label='Khu vực tải tệp lên'>
        <Upload className='mb-2 h-8 w-8 text-muted-foreground' />
        <p className='text-sm font-medium'>Nhấn hoặc kéo thả tệp vào đây</p>
        <p className='mt-1 text-xs text-muted-foreground'>
          PDF, JPG, PNG, WEBP — tối đa 10 MB
        </p>
        <input
          ref={fileRef}
          type='file'
          className='hidden'
          accept={ALLOWED_TYPES.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {uploadProgress !== null && (
        <div className='space-y-1'>
          <Progress value={uploadProgress} className='h-2' />
          <p className='text-xs text-muted-foreground text-right'>
            {uploadProgress}%
          </p>
        </div>
      )}

      {isLoading ? (
        <div className='flex justify-center py-4'>
          <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
        </div>
      ) : documents.length === 0 ? (
        <p className='text-center text-sm text-muted-foreground'>
          Chưa có tài liệu nào
        </p>
      ) : (
        <div className='space-y-2'>
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className='flex items-center gap-3 py-3'>
                <FileIcon type={doc.file_type} />
                <div className='flex-1 min-w-0'>
                  <p className='truncate text-sm font-medium'>
                    {doc.file_name}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {formatFileSize(doc.file_size)} ·{" "}
                    {format(new Date(doc.created_at), "dd/MM/yyyy", {
                      locale: vi,
                    })}
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
      )}
    </div>
  );
}
