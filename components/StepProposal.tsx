'use client'

import { useState } from 'react'
import type { ParsedData, KeywordRow, ScoredKeyword } from '@/lib/types'

interface Props {
  parsedData: ParsedData
  keywords: KeywordRow[]
  scored: ScoredKeyword[]
  onBack: () => void
}

export default function StepProposal({ parsedData, keywords, scored, onBack }: Props) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')
  const [slides, setSlides] = useState<string[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [error, setError] = useState('')

  async function generate() {
    setLoading(true)
    setError('')
    setProgress(10)
    setProgressMsg('ë°ì´í°ë¥¼ ì¤ë¹íê³  ììµëë¤...')

    try {
      setProgress(30)
      setProgressMsg('Claudeê° ë°ì´í°ë¥¼ ë¶ìíê³  ììµëë¤...')

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsedData, keywords, scored }),
      })

      setProgress(80)
      setProgressMsg('ì¬ë¼ì´ëë¥¼ êµ¬ì±íê³  ììµëë¤...')

      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'ì¤ë¥ê° ë°ìíìµëë¤')
        return
      }

      setProgress(100)
      setProgressMsg('ìì±!')
      setSlides(data.slides)
      setCurrentSlide(0)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  // ì¬ë¼ì´ë ë·°ì´
  if (slides.length > 0) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--green)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '4px' }}>
              â ì ìì ìì± ìë£
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-.03em' }}>
              {slides.length}ê° ì¬ë¼ì´ëê° ìì±ëììµëë¤
            </h2>
          </div>
          <button
            className="btn-primary"
            style={{ background: 'var(--blue)', fontSize: '13px', padding: '10px 20px' }}
            onClick={downloadHTML}
          >
            â¬ HTML ì ì¥
          </button>
        </div>

        {/* ì¬ë¼ì´ë í­ */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {slides.map((_, i) => (
            <button key={i}
              onClick={() => setCurrentSlide(i)}
              style={{
                padding: '5px 12px', borderRadius: '6px', cursor: 'pointer',
                fontSize: '12px', fontWeight: 600,
                background: i === currentSlide ? '#1a1a1a' : 'var(--surface)',
                color: i === currentSlide ? '#fff' : 'var(--text3)',
                border: `1px solid ${i === currentSlide ? '#1a1a1a' : 'var(--border)'}`,
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* ì¬ë¼ì´ë ë ë */}
        <div style={{
          border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden',
          background: '#F8F7F4', minHeight: '400px',
          padding: '40px 48px'
        }}>
          <div dangerouslySetInnerHTML={{ __html: slides[currentSlide] }} />
        </div>

        {/* ë¤ë¹ê²ì´ì */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'center', alignItems: 'center' }}>
          <button className="btn-primary" style={{ padding: '8px 20px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
            disabled={currentSlide === 0}
            onClick={() => setCurrentSlide(c => c - 1)}>
            â ì´ì 
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text3)', minWidth: '60px', textAlign: 'center' }}>
            {currentSlide + 1} / {slides.length}
          </span>
          <button className="btn-primary" style={{ padding: '8px 20px' }}
            disabled={currentSlide === slides.length - 1}
            onClick={() => setCurrentSlide(c => c + 1)}>
            ë¤ì â
          </button>
        </div>

        {/* ë¤ì ìì± */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            onClick={() => { setSlides([]); setProgress(0) }}
            style={{ fontSize: '13px', color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            ë¤ì ìì±íê¸°
          </button>
        </div>
      </div>
    )
  }

  function downloadHTML() {
    const slideContent = slides.map((s, i) => `
      <section style="min-height:100vh;padding:80px 48px;background:#F8F7F4;page-break-after:always;">
        <div style="max-width:900px;margin:0 auto;">${s}</div>
        <div style="position:fixed;bottom:20px;right:32px;font-size:12px;color:#9C9A94;">${i+1} / ${slides.length}</div>
      </section>`
    ).join('')

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>ì¿ í¡ ì ì í ì ìì</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Noto Sans KR',sans-serif; }
</style>
</head>
<body>${slideContent}</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ì¿ í¡_ì ì í_ì ìì.html'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--blue)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
          STEP 4 Â· ì ìì ìì±
        </div>
        <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, letterSpacing: '-.03em', marginBottom: '8px' }}>
          Claude APIë¡ ì ììë¥¼ ìì±í©ëë¤
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.7 }}>
          ë¶ìí ë°ì´í°ë¥¼ ë°íì¼ë¡ 10ì¥ì§ë¦¬ ì¬ë¼ì´ë ì ììê° ìë ìì±ë©ëë¤. (ì½ 30~60ì´ ìì)
        </p>
      </div>

      {/* ë¶ì ìì½ */}
      <div className="card" style={{ marginBottom: '24px', background: '#EEF4FF', border: '1px solid #BFDBFE' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--blue)', marginBottom: '12px' }}>
          ð ì´ë² ë¶ì ìì½
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', color: 'var(--text2)' }}>
          <div>ì¹´íê³ ë¦¬ ì ë§¤ì¶: <strong>{(parsedData.stats.categoryMonthlySales / 100000000).toFixed(1)}ìµì</strong></div>
          <div>í¤ìë ì ê²ìë: <strong>{parsedData.stats.keywordSearch.toLocaleString()}í</strong></div>
          <div>Së±ê¸ ê¸°í í¤ìë: <strong style={{ color: 'var(--green)' }}>{scored.filter(s => s.grade === 'S').length}ê°</strong></div>
          <div>Aë±ê¸ ê¸°í í¤ìë: <strong style={{ color: 'var(--blue)' }}>{scored.filter(s => s.grade === 'A').length}ê°</strong></div>
        </div>
        {scored.slice(0, 3).map((s, i) => (
          <div key={i} style={{ marginTop: '8px', padding: '8px 12px', background: '#fff', borderRadius: '6px', fontSize: '12px', color: 'var(--text2)' }}>
            <strong>{s.keyword}</strong> â {s.reason}
          </div>
        ))}
      </div>



      {/* ì§í ìí */}
      {loading && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>{progressMsg}</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '6px' }}>{progress}%</div>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '13px', color: '#DC2626', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="btn-primary" style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }} onClick={onBack}>
          â ì´ì 
        </button>
        <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'var(--blue)' }} onClick={generate} disabled={loading}>
          {loading ? 'â³ ìì± ì¤...' : 'â¡ ì ìì ìë ìì±'}
        </button>
      </div>
    </div>
  )
}
