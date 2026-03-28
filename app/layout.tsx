import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Optvers — 쿠팡 신제품 제안서 생성기',
  description: '셀러라이프 데이터 기반 신제품 출시 제안서 자동 생성',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
                <meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
