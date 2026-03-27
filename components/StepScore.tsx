'use client'

import { useMemo } from 'react'
import { scoreKeywords } from '@/lib/scorer'
import type { ParsedData, KeywordRow, ScoredKeyword } from '@/lib/types'

interface Props {
  parsedData: ParsedData
  keywords: KeywordRow[]
  onComplete: (scored: ScoredKeyword[]) => void
  onBack: () => void
}

const GRADE_COLORS: Record<string, string> = {
  S: '#16A34A', A: '#3B82F6', B: '#D97706', C: '#9C9A94'
}
const GRADE_BG: Record<string, string> = {
  S: '#ECFDF5', A: '#EEF4FF', B: '#FFFBEB', C: '#F2F1EE'
}

export default function StepScore({ parsedData, keywords, onComplete, onBack }: Props) {
  const scored = useMemo(() => scoreKeywords(keywords, parsedData), [keywords, parsedData])
  const topS = scored.filter(s => s.grade === 'S')
  const topA = scored.filter(s => s.grade === 'A')
  const maxScore = scored[0]?.opportunityScore ?? 100

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--blue)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
          STEP 3 Â· ê¸°í ì ë³
        </div>
        <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, letterSpacing: '-.03em', marginBottom: '8px' }}>
          ê²ìë ëê³  ê²½ì ë®ì í¤ìë
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.7 }}>
          {scored.length}ê° í¤ìëë¥¼ ê¸°í ì ìë¡ ìë ììííìµëë¤.
          <strong style={{ color: 'var(--green)' }}> Së±ê¸ {topS.length}ê°</strong>,
          <strong style={{ color: 'var(--blue)' }}> Aë±ê¸ {topA.length}ê°</strong>ê° ì§ì ê¸°íìëë¤.
        </p>
      </div>

      {/* ë±ê¸ ìì½ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '24px' }}>
        {(['S', 'A', 'B', 'C'] as const).map(g => (
          <div key={g} className="card" style={{ textAlign: 'center', borderTop: `3px solid ${GRADE_COLORS[g]}` }}>
            <div style={{ fontSize: '28px', fontWeight: 900, color: GRADE_COLORS[g] }}>{g}</div>
            <div style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>
              {scored.filter(s => s.grade === g).length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
              {g === 'S' ? 'ì¦ì ì ì ' : g === 'A' ? 'ì§ì ì°ì' : g === 'B' ? 'ê²í  íì' : 'ê²½ì ì¬í¨'}
            </div>
          </div>
        ))}
      </div>

      {/* ê¸°í í¤ìë ìì¸ */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text2)', marginBottom: '16px' }}>
          ê¸°í ì ì ìì (ì ì²´ {scored.length}ê°)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {scored.slice(0, 20).map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* ìì */}
              <div style={{ width: '24px', fontSize: '12px', fontWeight: 700, color: 'var(--text3)', flexShrink: 0 }}>
                {i + 1}
              </div>
              {/* ë±ê¸ ë°°ì§ */}
              <div style={{
                width: '28px', height: '28px', borderRadius: '6px',
                background: GRADE_BG[item.grade], color: GRADE_COLORS[item.grade],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 800, flexShrink: 0
              }}>
                {item.grade}
              </div>
              {/* í¤ìë + ì´ì  */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>
                  {item.keyword}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.reason}
                </div>
              </div>
              {/* ì ì ë° */}
              <div style={{ width: '120px', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text3)' }}>ê¸°í ì ì</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: GRADE_COLORS[item.grade] }}>{item.opportunityScore}</span>
                </div>
                <div className="score-bar">
                  <div className="score-fill" style={{
                    width: `${(item.opportunityScore / maxScore) * 100}%`,
                    background: GRADE_COLORS[item.grade]
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ë¶ì ì§ì¹¨ ìì½ */}
      <div className="card" style={{ marginBottom: '24px', background: '#ECFDF5', border: '1px solid #BBF7D0' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--green)', marginBottom: '10px' }}>
          ð Step 1~2 íì  ê²°ê³¼
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: 'var(--text2)' }}>
          <div>1ì ë§¤ì¶ í¬íë: <strong>{parsedData.stats.top1SaturationSales.toFixed(1)}%</strong>
            {' '}<span style={{ color: parsedData.stats.top1SaturationSales < 20 ? 'var(--green)' : 'var(--yellow)' }}>
              {parsedData.stats.top1SaturationSales < 20 ? 'â' : 'â³'}
            </span>
          </div>
          <div>1~3ì ë§¤ì¶ í¬íë: <strong>{parsedData.stats.top3SaturationSales.toFixed(1)}%</strong>
            {' '}<span style={{ color: parsedData.stats.top3SaturationSales < 50 ? 'var(--green)' : parsedData.stats.top3SaturationSales < 70 ? 'var(--yellow)' : 'var(--red-600)' }}>
              {parsedData.stats.top3SaturationSales < 50 ? 'â' : parsedData.stats.top3SaturationSales < 70 ? 'â³' : 'â'}
            </span>
          </div>
          <div>1~3ì ë¦¬ë·° í¬íë: <strong>{parsedData.stats.top3SaturationReview.toFixed(1)}%</strong>
            {' '}<span style={{ color: parsedData.stats.top3SaturationReview < 40 ? 'var(--green)' : 'var(--yellow)' }}>
              {parsedData.stats.top3SaturationReview < 40 ? 'â' : 'â³'}
            </span>
          </div>
          <div>ë¡ì¼ ê³ì´ ë°°ì¡: <strong>{parsedData.stats.rocketRatio.toFixed(1)}%</strong>
            {' '}<span style={{ color: parsedData.stats.rocketRatio < 70 ? 'var(--green)' : parsedData.stats.rocketRatio < 80 ? 'var(--yellow)' : '#DC2626' }}>
              {parsedData.stats.rocketRatio < 70 ? 'â' : parsedData.stats.rocketRatio < 80 ? 'â³' : 'â'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="btn-primary" style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }} onClick={onBack}>
          â ì´ì 
        </button>
        <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onComplete(scored)}>
          ì ìì ìì±íê¸° â
        </button>
      </div>
    </div>
  )
}
