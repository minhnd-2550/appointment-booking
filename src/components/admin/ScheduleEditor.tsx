'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Doctor } from '@/types/domain'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BlockedPeriodForm } from './BlockedPeriodForm'

const DAY_LABELS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']
const WORK_DAYS = [1, 2, 3, 4, 5] // Mon–Fri defaults

const ScheduleRowSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'HH:mm'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'HH:mm'),
  slotDurationMinutes: z.coerce.number().int().min(15).max(120),
})

type ScheduleRowValues = z.infer<typeof ScheduleRowSchema>

interface DayRowProps {
  dayOfWeek: number
  doctorId: string
}

function DayRow({ dayOfWeek, doctorId }: DayRowProps) {
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ScheduleRowValues>({
    resolver: zodResolver(ScheduleRowSchema) as Resolver<ScheduleRowValues>,
    defaultValues: { startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
  })

  async function onSubmit(values: ScheduleRowValues) {
    setError(null)
    setSaved(false)
    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId,
        dayOfWeek,
        startTime: values.startTime,
        endTime: values.endTime,
        slotDurationMinutes: values.slotDurationMinutes,
      }),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      const data = (await res.json()) as { error?: string }
      setError(data.error ?? 'Lưu thất bại')
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-wrap items-end gap-3 p-4 bg-white rounded-lg border border-slate-200"
      >
        <span className="w-24 font-medium text-sm text-slate-700">{DAY_LABELS[dayOfWeek]}</span>

        <FormField control={form.control} name="startTime" render={({ field }) => (
          <FormItem className="w-28">
            <FormLabel className="text-xs">Giờ bắt đầu</FormLabel>
            <FormControl><Input {...field} type="time" className="h-8 text-sm" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="endTime" render={({ field }) => (
          <FormItem className="w-28">
            <FormLabel className="text-xs">Giờ kết thúc</FormLabel>
            <FormControl><Input {...field} type="time" className="h-8 text-sm" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="slotDurationMinutes" render={({ field }) => (
          <FormItem className="w-24">
            <FormLabel className="text-xs">Slot (phút)</FormLabel>
            <FormControl><Input {...field} type="number" min={15} max={120} step={15} className="h-8 text-sm" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Đang lưu…' : 'Lưu'}
        </Button>

        {saved && <Badge variant="default" className="bg-green-600">Đã lưu</Badge>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </form>
    </Form>
  )
}

interface ScheduleEditorProps {
  doctors: Doctor[]
}

export function ScheduleEditor({ doctors }: ScheduleEditorProps) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | undefined>(
    doctors[0]?.id,
  )

  if (doctors.length === 0) {
    return <p className="text-slate-500 text-sm">Chưa có bác sĩ nào hoạt động.</p>
  }

  return (
    <div className="space-y-8">
      {/* Doctor selector */}
      <div className="max-w-xs">
        <label className="text-sm font-medium text-slate-700 mb-1 block">
          Chọn bác sĩ
        </label>
        <Select
          value={selectedDoctorId}
          onValueChange={setSelectedDoctorId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Chọn bác sĩ" />
          </SelectTrigger>
          <SelectContent>
            {doctors.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
                {d.specialty ? ` – ${d.specialty}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedDoctorId && (
        <>
          {/* Weekly schedule grid */}
          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-4">
              Lịch làm việc hàng tuần
            </h2>
            <div className="space-y-2">
              {WORK_DAYS.map((day) => (
                <DayRow
                  key={day}
                  dayOfWeek={day}
                  doctorId={selectedDoctorId}
                />
              ))}
            </div>
          </section>

          {/* Blocked period form */}
          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-4">
              Ngày nghỉ / Khoảng thời gian không làm việc
            </h2>
            <BlockedPeriodForm doctorId={selectedDoctorId} />
          </section>
        </>
      )}
    </div>
  )
}
