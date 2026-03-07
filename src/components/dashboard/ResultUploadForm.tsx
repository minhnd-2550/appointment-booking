"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const schema = z.object({
  resultText: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_DISPLAY_MB = 10;

interface Props {
  orderId: string;
  onSuccess?: () => void;
}

export function ResultUploadForm({ orderId, onSuccess }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState<"idle" | "uploading" | "done">(
    "idle",
  );

  const { register, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const upload = useMutation({
    mutationFn: async (values: FormValues) => {
      const hasFile = !!selectedFile;
      const hasText = !!values.resultText?.trim();
      if (!hasFile && !hasText)
        throw new Error("Cần có kết quả hoặc file tải lên.");

      setProgress("uploading");

      let res: Response;
      if (hasFile) {
        const formData = new FormData();
        formData.append("file", selectedFile!);
        if (values.resultText) formData.append("resultText", values.resultText);
        res = await fetch(`/api/doctor/lab-orders/${orderId}/result`, {
          method: "PUT",
          body: formData,
        });
      } else {
        res = await fetch(`/api/doctor/lab-orders/${orderId}/result`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resultText: values.resultText }),
        });
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error === "FILE_TOO_LARGE"
            ? `File vượt quá ${body.maxMb ?? MAX_DISPLAY_MB} MB`
            : "Tải lên thất bại",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      setProgress("done");
      toast.success("Đã lưu kết quả");
      onSuccess?.();
    },
    onError: (err: Error) => {
      setProgress("idle");
      toast.error(err.message);
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setFileError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError("Chỉ chấp nhận PDF, JPG, hoặc PNG.");
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_DISPLAY_MB * 1024 * 1024) {
      setFileError(`File không được vượt quá ${MAX_DISPLAY_MB} MB.`);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  }

  return (
    <form
      onSubmit={handleSubmit((v) => upload.mutate(v))}
      className='space-y-3'>
      <div className='space-y-1'>
        <Label htmlFor={`result-text-${orderId}`}>Kết quả (văn bản)</Label>
        <Textarea
          id={`result-text-${orderId}`}
          rows={3}
          placeholder='Nhập kết quả xét nghiệm…'
          {...register("resultText")}
        />
      </div>

      <div className='space-y-1'>
        <Label htmlFor={`result-file-${orderId}`}>
          Hoặc tải file (PDF/JPG/PNG, tối đa {MAX_DISPLAY_MB} MB)
        </Label>
        <input
          id={`result-file-${orderId}`}
          type='file'
          accept='.pdf,.jpg,.jpeg,.png'
          className='block text-sm'
          onChange={handleFileChange}
        />
        {fileError && <p className='text-xs text-destructive'>{fileError}</p>}
        {selectedFile && (
          <p className='text-xs text-muted-foreground'>
            Đã chọn: {selectedFile.name}
          </p>
        )}
      </div>

      <Button
        type='submit'
        size='sm'
        disabled={upload.isPending || progress === "uploading"}>
        {progress === "uploading" ? "Đang tải lên…" : "Lưu kết quả"}
      </Button>
    </form>
  );
}
