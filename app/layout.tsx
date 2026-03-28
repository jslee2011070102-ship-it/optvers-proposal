import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Optvers â ì¿ í¡ ì ì í ì ìì ìì±ê¸°',
  description: 'ìë¬ë¼ì´í ë°ì´í° ê¸°ë° ì ì í ì¶ì ì ìì ìë ìì±',
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
