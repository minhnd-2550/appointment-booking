"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
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

interface Patient {
  user_id: string;
  patient_name: string;
  patient_email: string;
  last_appointment: string;
}

async function fetchPatients(search: string, page: number) {
  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (search) params.set("search", search);
  const res = await fetch(`/api/doctor/patients?${params}`);
  if (!res.ok) throw new Error("Failed to fetch patients");
  return res.json() as Promise<{
    data: Patient[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}

export function DoctorPatientList() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceTimer) clearTimeout(debounceTimer);
      const timer = setTimeout(() => {
        setDebouncedSearch(value);
        setPage(1);
      }, 300);
      setDebounceTimer(timer);
    },
    [debounceTimer],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["doctor-patients", debouncedSearch, page],
    queryFn: () => fetchPatients(debouncedSearch, page),
  });

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <div className='space-y-4'>
      <Input
        placeholder='Tìm kiếm theo tên hoặc email…'
        value={searchInput}
        onChange={(e) => handleSearchChange(e.target.value)}
        aria-label='Tìm kiếm bệnh nhân'
        className='max-w-sm'
      />

      {isLoading && <p className='text-muted-foreground text-sm'>Đang tải…</p>}
      {isError && (
        <p className='text-destructive text-sm'>
          Không thể tải danh sách bệnh nhân.
        </p>
      )}

      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Họ tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Lần gần nhất</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className='text-center text-muted-foreground py-8'>
                    Không có bệnh nhân nào
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((patient) => (
                  <TableRow key={patient.user_id}>
                    <TableCell>{patient.patient_name}</TableCell>
                    <TableCell className='text-muted-foreground'>
                      {patient.patient_email}
                    </TableCell>
                    <TableCell>
                      {format(
                        parseISO(patient.last_appointment),
                        "dd/MM/yyyy",
                        { locale: vi },
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant='outline' size='sm' asChild>
                        <Link href={`/dashboard/patients/${patient.user_id}`}>
                          Xem lịch sử
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}>
                Trước
              </Button>
              <span className='text-sm text-muted-foreground'>
                Trang {page} / {totalPages}
              </span>
              <Button
                variant='outline'
                size='sm'
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}>
                Sau
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
