import { Skeleton } from '@/components/ui/skeleton'

export default function BookLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 h-14" />
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        {/* Doctor summary skeleton */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-5">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>

        {/* Calendar + form skeleton */}
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </main>
  )
}
