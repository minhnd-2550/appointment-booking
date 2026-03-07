'use client'

import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useQueryClient } from '@tanstack/react-query'
import type { Appointment } from '@/types/domain'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import 'react-day-picker/style.css'

interface BlockedPeriodFormProps {
  doctorId: string
}

export function BlockedPeriodForm({ doctorId }: BlockedPeriodFormProps) {
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({})
  const [startTime, setStartTime] = useState('00:00')
  const [endTime, setEndTime] = useState('23:59')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [conflicts, setConflicts] = useState<Appointment[]>([])
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null)
  const queryClient = useQueryClient()

  function buildPayload() {
    const from = range.from
    const to = range.to ?? range.from
    if (!from) return null

    const startAt = `${format(from, 'yyyy-MM-dd')}T${startTime}:00+07:00`
    const endAt = `${format(to!, 'yyyy-MM-dd')}T${endTime}:00+07:00`

    return {
      doctorId,
      startAt,
      endAt,
      reason: reason || undefined,
    }
  }

  async function submit(payload: Record<string, unknown>, force = false) {
    setLoading(true)
    setError(null)
    setSuccess(false)

    const url = force
      ? '/api/blocked-periods?force=true'
      : '/api/blocked-periods'

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setLoading(false)

    if (res.status === 409) {
      const data = (await res.json()) as { conflicts?: Appointment[] }
      setConflicts(data.conflicts ?? [])
      setPendingPayload(payload)
      setShowConflictDialog(true)
      return
    }

    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      setError(data.error ?? 'Thêm thất bại')
      return
    }

    setSuccess(true)
    setRange({})
    setReason('')
    // Invalidate slot caches for this doctor
    queryClient.invalidateQueries({ queryKey: ['slots', doctorId] })
    setTimeout(() => setSuccess(false), 3000)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = buildPayload()
    if (!payload) {
      setError('Vui lòng chọn ngày')
      return
    }
    await submit(payload as Record<string, unknown>)
  }

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-lg border border-slate-200 p-5 space-y-4"
      >
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Chọn khoảng ngày</p>
          <DayPicker
            mode="range"
            selected={range.from ? { from: range.from, to: range.to } : undefined}
            onSelect={(r) => setRange({ from: r?.from, to: r?.to })}
            locale={vi}
            classNames={{
              today: 'font-bold text-blue-600',
              range_start: 'bg-blue-600 text-white rounded-l-md',
              range_end: 'bg-blue-600 text-white rounded-r-md',
              range_middle: 'bg-blue-100 text-blue-800',
            }}
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-600 mb-1 block">
              Từ giờ
            </label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-600 mb-1 block">
              Đến giờ
            </label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">
            Lý do (tuỳ chọn)
          </label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="VD: Hội nghị y tế, ngày lễ..."
            className="h-8 text-sm"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-700 bg-green-50 rounded px-3 py-2">
            Đã thêm khoảng thời gian không làm việc.
          </p>
        )}

        <Button
          type="submit"
          disabled={loading || !range.from}
          size="sm"
        >
          {loading ? 'Đang lưu…' : 'Thêm khoảng nghỉ'}
        </Button>
      </form>

      {/* Conflict warning dialog */}
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Có lịch hẹn trong khoảng thời gian này</DialogTitle>
            <DialogDescription>
              Có {conflicts.length} lịch hẹn đang tồn tại trong khoảng thời gian
              bạn muốn chặn. Bạn có muốn tiếp tục?
            </DialogDescription>
          </DialogHeader>

          <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
            {conflicts.map((c) => (
              <li key={c.id} className="text-slate-700">
                • {c.patient_name} –{' '}
                {format(new Date(c.slot_start), "dd/MM HH:mm", { locale: vi })}
              </li>
            ))}
          </ul>

          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowConflictDialog(false)}
            >
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setShowConflictDialog(false)
                if (pendingPayload) await submit(pendingPayload, true)
              }}
            >
              Tiếp tục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
