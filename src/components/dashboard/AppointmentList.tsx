'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Appointment, AppointmentStatus } from '@/types/domain'
import { AppointmentRow } from './AppointmentRow'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface AppointmentListProps {
  initialAppointments: Appointment[]
  doctorId: string
}

export function AppointmentList({
  initialAppointments,
  doctorId,
}: AppointmentListProps) {
  const [appointments, setAppointments] =
    useState<Appointment[]>(initialAppointments)

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`dashboard:appointments:${doctorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_id=eq.${doctorId}`,
        },
        (payload) => {
          setAppointments((prev) => [payload.new as Appointment, ...prev])
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_id=eq.${doctorId}`,
        },
        (payload) => {
          setAppointments((prev) =>
            prev.map((appt) =>
              appt.id === (payload.new as Appointment).id
                ? (payload.new as Appointment)
                : appt,
            ),
          )
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [doctorId])

  const handleStatusChange = (id: string, newStatus: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)),
    )
  }

  const filterByStatus = (statuses: AppointmentStatus[]) =>
    appointments
      .filter((a) => statuses.includes(a.status))
      .sort(
        (a, b) =>
          new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime(),
      )

  const tabs: { key: string; label: string; statuses: AppointmentStatus[] }[] =
    [
      { key: 'all', label: 'Tất cả', statuses: ['pending', 'confirmed', 'cancelled'] },
      { key: 'pending', label: 'Chờ xác nhận', statuses: ['pending'] },
      { key: 'confirmed', label: 'Đã xác nhận', statuses: ['confirmed'] },
      { key: 'cancelled', label: 'Đã huỷ', statuses: ['cancelled'] },
    ]

  return (
    <Tabs defaultValue="pending">
      <TabsList className="mb-6">
        {tabs.map((tab) => {
          const count = filterByStatus(tab.statuses).length
          return (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 text-xs bg-slate-200 text-slate-700 rounded-full px-1.5 py-0.5">
                  {count}
                </span>
              )}
            </TabsTrigger>
          )
        })}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.key} value={tab.key}>
          {filterByStatus(tab.statuses).length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-12">
              Không có lịch hẹn nào.
            </p>
          ) : (
            <div className="space-y-3">
              {filterByStatus(tab.statuses).map((appt) => (
                <AppointmentRow
                  key={appt.id}
                  appointment={appt}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  )
}
