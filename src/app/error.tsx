'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Đã xảy ra lỗi
          </h1>
          <p className="text-slate-500 text-sm mb-6">
            {error.message ?? 'Lỗi không xác định. Vui lòng thử lại.'}
          </p>
          <button
            onClick={reset}
            className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  )
}
