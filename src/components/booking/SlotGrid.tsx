'use client'

import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Skeleton } from '@/components/ui/skeleton'
import type { SlotDTO } from '@/types/domain'

interface SlotGridProps {
  slots: SlotDTO[]
  loading: boolean
  selectedSlot: SlotDTO | undefined
  onSlotSelect: (slot: SlotDTO) => void
}

export function SlotGrid({
  slots,
  loading,
  selectedSlot,
  onSlotSelect,
}: SlotGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-9 rounded-md" />
        ))}
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic py-2">
        Không có khung giờ trống trong ngày này.
      </p>
    )
  }

  const availableSlots = slots.filter((s) => s.available)
  const totalSlots = slots.length

  return (
    <div>
      <p className="text-xs text-slate-400 mb-2">
        {availableSlots.length}/{totalSlots} khung giờ trống
      </p>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Danh sách khung giờ">
        {slots.map((slot) => {
          const time = format(parseISO(slot.start), 'HH:mm', { locale: vi })
          const isSelected = selectedSlot?.start === slot.start
          const isDisabled = !slot.available

          return (
            <button
              key={slot.start}
              type="button"
              disabled={isDisabled}
              onClick={() => onSlotSelect(slot)}
              aria-pressed={isSelected}
              aria-label={`${time}${isDisabled ? ' – đã đặt' : ''}`}
              className={[
                'h-9 rounded-md text-sm font-medium transition-colors',
                isDisabled
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed line-through'
                  : isSelected
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-1'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300',
              ].join(' ')}
            >
              {time}
            </button>
          )
        })}
      </div>
    </div>
  )
}
