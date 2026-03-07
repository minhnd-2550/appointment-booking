import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-slate-400 text-6xl font-bold mb-4">404</p>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Không tìm thấy trang
        </h1>
        <p className="text-slate-500 text-sm mb-6">
          Trang bạn đang tìm không tồn tại hoặc đã bị xoá.
        </p>
        <Link
          href="/"
          className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Về trang chủ
        </Link>
      </div>
    </main>
  )
}
