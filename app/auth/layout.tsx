import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Masuk Akun — Portal Klinik',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </div>
      <footer className="py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Portal Klinik
      </footer>
    </div>
  )
}
