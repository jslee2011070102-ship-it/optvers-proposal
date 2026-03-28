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
  const [warningConfirmed, setWarningConfirmed] = useState(false)

  // 사전 판정 계산 (생성 전 경고용)
  const { stats } = parsedData
  const step1Score = [
    stats.keywordSearch >= 5000,
    (stats.keywordSearchLastYear / 12) / Math.max(stats.keywordSearch, 1) < 2,
    stats.categoryMonthlySales >= 3000000000,
    stats.categoryMonthlyQty >= 50000,
  ].filter(Boolean).length
  const step2Pass = stats.top3SaturationSales < 50 && stats.top1SaturationSales < 35
  const hasOpportunity = scored.filter(s => s.grade === 'S' || s.grade === 'A').length >= 1
  const needsWarning = step1Score < 3 || (!step2Pass && !hasOpportunity)

  async function generate() {
    setLoading(true)
    setError('')
    setProgress(10)
    setProgressMsg('데이터를 준비하고 있습니다...')

    try {
      setProgress(30)
      setProgressMsg('Claude가 데이터를 분석하고 있습니다...')

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsedData, keywords, scored }),
      })

      setProgress(80)
      setProgressMsg('슬라이드를 구성하고 있습니다...')

      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || '오류가 발생했습니다')
        return
      }

      setProgress(100)
      setProgressMsg('완성!')
      setSlides(data.slides)
      setCurrentSlide(0)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  // 슬라이드 뷰어
  if (slides.length > 0) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--green)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '4px' }}>
              ✅ 제안서 생성 완료
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-.03em' }}>
              {slides.length}개 슬라이드가 생성되었습니다
            </h2>
          </div>
          <button
            className="btn-primary"
            style={{ background: 'var(--blue)', fontSize: '13px', padding: '10px 20px' }}
            onClick={downloadHTML}
          >
            ⬇ HTML 저장
          </button>
        </div>

        {/* 슬라이드 탭 */}
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

        {/* 슬라이드 렌더 */}
        <div style={{
          border: '1px solid var(--border)', borderRadius: '12px',
          background: '#F8F7F4',
          padding: '40px 48px'
        }}>
          <div dangerouslySetInnerHTML={{ __html: slides[currentSlide] }} />
        </div>

        {/* 네비게이션 */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'center', alignItems: 'center' }}>
          <button className="btn-primary" style={{ padding: '8px 20px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
            disabled={currentSlide === 0}
            onClick={() => setCurrentSlide(c => c - 1)}>
            ← 이전
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text3)', minWidth: '60px', textAlign: 'center' }}>
            {currentSlide + 1} / {slides.length}
          </span>
          <button className="btn-primary" style={{ padding: '8px 20px' }}
            disabled={currentSlide === slides.length - 1}
            onClick={() => setCurrentSlide(c => c + 1)}>
            다음 →
          </button>
        </div>

        {/* 다시 생성 */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            onClick={() => { setSlides([]); setProgress(0) }}
            style={{ fontSize: '13px', color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            다시 생성하기
          </button>
        </div>
      </div>
    )
  }

  function downloadHTML() {
    // 마크다운 코드블록 태그 제거 후 슬라이드 구성
    const cleanSlide = (s: string) =>
      s.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()

    const slideContent = slides.map((s, i) => `
      <section style="padding:80px 48px;background:#F8F7F4;page-break-after:always;min-height:100vh;">
        <div style="max-width:900px;margin:0 auto;">${cleanSlide(s)}</div>
        <div style="text-align:right;margin-top:40px;font-size:12px;color:#9C9A94;">${i+1} / ${slides.length}</div>
      </section>`
    ).join('\n<hr style="border:none;border-top:2px dashed #E8E6E0;margin:0;">\n')

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>쿠팡 신제품 제안서</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
:root {
  --bg: #F8F7F4;
  --surface: #FFFFFF;
  --border: #E8E6E0;
  --text: #191917;
  --text2: #5C5B57;
  --text3: #9C9A94;
  --blue: #3B82F6;
  --green: #16A34A;
  --yellow: #D97706;
}
body { font-family:'Noto Sans KR',sans-serif; color:#191917; background:#F8F7F4; }
h1,h2,h3,h4 { font-weight:800; letter-spacing:-.03em; }
.card { background:#fff; border:1px solid #E8E6E0; border-radius:12px; padding:24px; }
</style>
</head>
<body>${slideContent}</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '쿠팡_신제품_제안서.html'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--blue)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
          STEP 4 · 제안서 생성
        </div>
        <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, letterSpacing: '-.03em', marginBottom: '8px' }}>
          Claude API로 제안서를 생성합니다
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.7 }}>
          분석한 데이터를 바탕으로 10장짜리 슬라이드 제안서가 자동 생성됩니다. (약 30~60초 소요)
        </p>
      </div>

      {/* 분석 요약 */}
      <div className="card" style={{ marginBottom: '24px', background: '#EEF4FF', border: '1px solid #BFDBFE' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--blue)', marginBottom: '12px' }}>
          📋 이번 분석 요약
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', color: 'var(--text2)' }}>
          <div>카테고리 월 매출: <strong>{(parsedData.stats.categoryMonthlySales / 100000000).toFixed(1)}억원</strong></div>
          <div>키워드 월 검색량: <strong>{parsedData.stats.keywordSearch.toLocaleString()}회</strong></div>
          <div>S등급 기회 키워드: <strong style={{ color: 'var(--green)' }}>{scored.filter(s => s.grade === 'S').length}개</strong></div>
          <div>A등급 기회 키워드: <strong style={{ color: 'var(--blue)' }}>{scored.filter(s => s.grade === 'A').length}개</strong></div>
        </div>
        {scored.slice(0, 3).map((s, i) => (
          <div key={i} style={{ marginTop: '8px', padding: '8px 12px', background: '#fff', borderRadius: '6px', fontSize: '12px', color: 'var(--text2)' }}>
            <strong>{s.keyword}</strong> — {s.reason}
          </div>
        ))}
      </div>



      {/* 진행 상태 */}
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

      {/* 재검토 경고: 조건 미충족 시 생성 전 사용자에게 안내 */}
      {needsWarning && !warningConfirmed && (
        <div style={{
          padding: '20px 24px', marginBottom: '20px',
          background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px',
        }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#92400E', marginBottom: '4px' }}>
                데이터 검토가 필요한 시장입니다
              </div>
              <div style={{ fontSize: '13px', color: '#78350F', lineHeight: 1.7 }}>
                {step1Score < 3 && <div>· 시장 규모 기준 {step1Score}/4 충족 — 월 검색량 또는 카테고리 매출이 기준치에 미달합니다</div>}
                {!step2Pass && <div>· 포화도 기준 미충족 — 상위 제품 매출 집중도가 높아 진입 난이도가 높습니다</div>}
                {!hasOpportunity && <div>· S·A등급 기회 키워드 없음 — 공백 키워드가 충분하지 않습니다</div>}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#92400E', background: '#FEF9C3', borderRadius: '6px', padding: '8px 12px', marginBottom: '12px' }}>
            💡 그럼에도 제안서를 생성할 수 있습니다. 다만 고객사에 제출 시 위 사항을 사전에 공유하는 것을 권장합니다.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onBack}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #E8E6E0', background: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
              ← 이전으로
            </button>
            <button
              onClick={() => setWarningConfirmed(true)}
              style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#D97706', color: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: 700 }}>
              이해했습니다, 계속 생성하기 →
            </button>
          </div>
        </div>
      )}

      {(!needsWarning || warningConfirmed) && (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-primary" style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }} onClick={onBack}>
            ← 이전
          </button>
          <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'var(--blue)' }} onClick={generate} disabled={loading}>
            {loading ? '⏳ 생성 중...' : '⚡ 제안서 자동 생성'}
          </button>
        </div>
      )}
    </div>
  )
}
