"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AppointmentStats {
  total: number;
  byStatus: Record<string, number>;
  byDoctor: Record<string, number>;
  bySpecialty: Record<string, number>;
}

interface RevenueStats {
  totalCollected: number;
  byDoctor: Record<string, number>;
  bySpecialty: Record<string, number>;
  count: number;
}

type Tab = "appointments" | "revenue";

export default function AdminReportsPage() {
  const [tab, setTab] = useState<Tab>("appointments");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [apptStats, setApptStats] = useState<AppointmentStats | null>(null);
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchStats() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ format: "json" });
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const [apptRes, revRes] = await Promise.all([
        fetch(`/api/admin/reports/appointments?${params}`),
        fetch(`/api/admin/reports/revenue?${params}`),
      ]);

      if (!apptRes.ok || !revRes.ok) throw new Error("Tải báo cáo thất bại");

      const apptData = (await apptRes.json()) as AppointmentStats;
      const revData = (await revRes.json()) as RevenueStats;
      setApptStats(apptData);
      setRevenueStats(revData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  }

  function exportCSV(type: "appointments" | "revenue") {
    const params = new URLSearchParams({ format: "csv" });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.open(`/api/admin/reports/${type}?${params}`, "_blank");
  }

  return (
    <main className='min-h-screen bg-slate-50'>
      <header className='bg-white border-b border-slate-200'>
        <div className='mx-auto max-w-5xl px-4 py-5 flex items-center justify-between'>
          <div>
            <h1 className='text-xl font-bold text-slate-900'>
              Báo cáo & Thống kê
            </h1>
            <p className='text-sm text-slate-500'>
              Xem và xuất báo cáo lịch hẹn và doanh thu
            </p>
          </div>
          <Link
            href='/'
            className='text-sm text-slate-500 hover:text-slate-700'>
            ← Trang chủ
          </Link>
        </div>
      </header>

      <div className='mx-auto max-w-5xl px-4 py-8 space-y-6'>
        {/* Filters */}
        <div className='bg-white rounded-lg border border-slate-200 p-4 flex flex-wrap gap-4 items-end'>
          <div>
            <label className='block text-xs font-medium text-slate-600 mb-1'>
              Từ ngày
            </label>
            <Input
              type='date'
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className='w-40'
            />
          </div>
          <div>
            <label className='block text-xs font-medium text-slate-600 mb-1'>
              Đến ngày
            </label>
            <Input
              type='date'
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className='w-40'
            />
          </div>
          <Button onClick={fetchStats} disabled={loading}>
            {loading ? "Đang tải..." : "Xem báo cáo"}
          </Button>
          <Button variant='outline' onClick={() => exportCSV("appointments")}>
            Xuất lịch hẹn CSV
          </Button>
          <Button variant='outline' onClick={() => exportCSV("revenue")}>
            Xuất doanh thu CSV
          </Button>
        </div>

        {error && (
          <div className='bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg'>
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className='flex border-b border-slate-200 gap-4'>
          <button
            onClick={() => setTab("appointments")}
            className={`pb-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "appointments"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500"
            }`}>
            Lịch hẹn
          </button>
          <button
            onClick={() => setTab("revenue")}
            className={`pb-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "revenue"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500"
            }`}>
            Doanh thu
          </button>
        </div>

        {/* Appointments Tab */}
        {tab === "appointments" && apptStats && (
          <div className='space-y-6'>
            <div className='bg-white rounded-lg border border-slate-200 p-4'>
              <p className='text-sm text-slate-500 mb-1'>Tổng lịch hẹn</p>
              <p className='text-3xl font-bold text-slate-900'>
                {apptStats.total}
              </p>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <StatsTable title='Theo trạng thái' data={apptStats.byStatus} />
              <StatsTable title='Theo bác sĩ' data={apptStats.byDoctor} />
            </div>
            <StatsTable title='Theo chuyên khoa' data={apptStats.bySpecialty} />
          </div>
        )}

        {/* Revenue Tab */}
        {tab === "revenue" && revenueStats && (
          <div className='space-y-6'>
            <div className='bg-white rounded-lg border border-slate-200 p-4'>
              <p className='text-sm text-slate-500 mb-1'>Tổng doanh thu</p>
              <p className='text-3xl font-bold text-slate-900'>
                {revenueStats.totalCollected.toLocaleString("vi-VN")} VND
              </p>
              <p className='text-sm text-slate-400 mt-1'>
                {revenueStats.count} thanh toán
              </p>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <RevenueTable title='Theo bác sĩ' data={revenueStats.byDoctor} />
              <RevenueTable
                title='Theo chuyên khoa'
                data={revenueStats.bySpecialty}
              />
            </div>
          </div>
        )}

        {!apptStats && !revenueStats && !loading && (
          <div className='text-center text-slate-400 py-12 text-sm'>
            Chọn khoảng thời gian và nhấn &quot;Xem báo cáo&quot;
          </div>
        )}
      </div>
    </main>
  );
}

function StatsTable({
  title,
  data,
}: {
  title: string;
  data: Record<string, number>;
}) {
  const entries = Object.entries(data);
  return (
    <div className='bg-white rounded-lg border border-slate-200 overflow-hidden'>
      <div className='px-4 py-3 bg-slate-50 border-b border-slate-200'>
        <h3 className='text-sm font-semibold text-slate-700'>{title}</h3>
      </div>
      <table className='w-full text-sm'>
        <tbody>
          {entries.map(([key, val]) => (
            <tr key={key} className='border-b border-slate-100 last:border-0'>
              <td className='px-4 py-2 text-slate-700'>{key}</td>
              <td className='px-4 py-2 text-right font-medium text-slate-900'>
                {val}
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={2} className='px-4 py-4 text-center text-slate-400'>
                Không có dữ liệu
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RevenueTable({
  title,
  data,
}: {
  title: string;
  data: Record<string, number>;
}) {
  const entries = Object.entries(data);
  return (
    <div className='bg-white rounded-lg border border-slate-200 overflow-hidden'>
      <div className='px-4 py-3 bg-slate-50 border-b border-slate-200'>
        <h3 className='text-sm font-semibold text-slate-700'>{title}</h3>
      </div>
      <table className='w-full text-sm'>
        <tbody>
          {entries.map(([key, val]) => (
            <tr key={key} className='border-b border-slate-100 last:border-0'>
              <td className='px-4 py-2 text-slate-700'>{key}</td>
              <td className='px-4 py-2 text-right font-medium text-slate-900'>
                {val.toLocaleString("vi-VN")} VND
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={2} className='px-4 py-4 text-center text-slate-400'>
                Không có dữ liệu
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
