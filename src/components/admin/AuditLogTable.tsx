"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface AuditEntry {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface AuditLogResponse {
  entries: AuditEntry[];
  page: number;
  pageSize: number;
  total: number;
}

export function AuditLogTable() {
  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const queryParams = new URLSearchParams({
    ...(actorId && { actorId }),
    ...(action && { action }),
    ...(entityType && { entityType }),
    ...(from && { from }),
    ...(to && { to }),
    page: String(page),
  });

  const { data, isLoading } = useQuery<AuditLogResponse>({
    queryKey: ["audit-log", actorId, action, entityType, from, to, page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/audit-log?${queryParams}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const entries = data?.entries ?? [];
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  function handleExport() {
    window.open(`/api/admin/audit-log?${queryParams}&export=csv`, "_blank");
  }

  function handleFilter() {
    setPage(1);
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle>Nhật ký hoạt động</CardTitle>
          <Button variant='outline' size='sm' onClick={handleExport}>
            <Download className='mr-2 h-4 w-4' />
            Xuất CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Filter bar */}
        <div className='flex flex-wrap gap-2'>
          <Input
            placeholder='Actor ID'
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
            className='w-40'
          />
          <Input
            placeholder='Hành động'
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className='w-36'
          />
          <Input
            placeholder='Loại thực thể'
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className='w-36'
          />
          <Input
            type='date'
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className='w-40'
          />
          <Input
            type='date'
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className='w-40'
          />
          <Button onClick={handleFilter}>Lọc</Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className='flex justify-center py-8'>
            <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
          </div>
        ) : entries.length === 0 ? (
          <p className='text-center text-sm text-muted-foreground py-8'>
            Không có kết quả
          </p>
        ) : (
          <>
            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Actor ID</TableHead>
                    <TableHead>Hành động</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>ID thực thể</TableHead>
                    <TableHead>Chi tiết</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className='whitespace-nowrap text-sm'>
                        {format(
                          new Date(entry.created_at),
                          "dd/MM/yyyy HH:mm",
                          { locale: vi },
                        )}
                      </TableCell>
                      <TableCell className='font-mono text-xs max-w-28 truncate'>
                        {entry.actor_id}
                      </TableCell>
                      <TableCell>
                        <span className='inline-block rounded bg-muted px-2 py-0.5 text-xs font-medium'>
                          {entry.action}
                        </span>
                      </TableCell>
                      <TableCell className='text-sm'>
                        {entry.entity_type}
                      </TableCell>
                      <TableCell className='font-mono text-xs max-w-28 truncate'>
                        {entry.entity_id}
                      </TableCell>
                      <TableCell className='text-xs max-w-48 truncate text-muted-foreground'>
                        {entry.metadata ? JSON.stringify(entry.metadata) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className='flex items-center justify-between text-sm text-muted-foreground'>
              <span>Tổng: {data?.total ?? 0} bản ghi</span>
              <div className='flex items-center gap-2'>
                <Button
                  variant='ghost'
                  size='sm'
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className='h-4 w-4' />
                </Button>
                <span>
                  Trang {page} / {totalPages}
                </span>
                <Button
                  variant='ghost'
                  size='sm'
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className='h-4 w-4' />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
