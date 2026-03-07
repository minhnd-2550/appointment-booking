import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Doctor } from '@/types/domain'
import { SlotCalendar } from '@/components/booking/SlotCalendar'

interface BookPageProps {
  params: Promise<{ doctorId: string }>
}

export async function generateMetadata({ params }: BookPageProps) {
  const { doctorId } = await params
  const supabase = await createClient()
  const { data: doctor } = await supabase
    .from('doctors')
    .select('name, specialty')
    .eq('id', doctorId)
    .eq('is_active', true)
    .single()

  if (!doctor) return { title: 'Không tìm thấy bác sĩ' }

  return {
    title: `Đặt lịch với ${doctor.name} – Phòng Khám`,
    description: doctor.specialty
      ? `Đặt lịch khám với ${doctor.name} – Chuyên khoa ${doctor.specialty}`
      : `Đặt lịch khám với ${doctor.name}`,
  }
}

export default async function BookPage({ params }: BookPageProps) {
  const { doctorId } = await params
  const supabase = await createClient()

  const { data: doctor } = await supabase
    .from('doctors')
    .select('*')
    .eq('id', doctorId)
    .eq('is_active', true)
    .single()

  if (!doctor) notFound()

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-4 py-5 flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-700"
            aria-label="Quay về trang chủ"
          >
            ← Trang chủ
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-sm font-medium text-slate-800">
            Đặt lịch khám
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Doctor summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8 flex items-center gap-5">
          {(doctor as Doctor).avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(doctor as Doctor).avatar_url ?? ''}
              alt={`Ảnh bác sĩ ${(doctor as Doctor).name}`}
              className="h-16 w-16 rounded-full object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div
              aria-hidden="true"
              className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xl shrink-0"
            >
              {(doctor as Doctor).name
                .split(' ')
                .map((p) => p[0] ?? '')
                .slice(-2)
                .join('')
                .toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {(doctor as Doctor).name}
            </h1>
            {(doctor as Doctor).specialty && (
              <p className="text-sm text-slate-500 mt-0.5">
                Chuyên khoa: {(doctor as Doctor).specialty}
              </p>
            )}
          </div>
        </div>

        {/* Slot calendar + booking form */}
        <SlotCalendar doctor={doctor as Doctor} />
      </div>
    </main>
  )
}
