'use client'

import { useState, useEffect } from 'react'
import { countProductsWithKeyword } from '@/lib/scorer'
import type { ParsedData, KeywordRow } from '@/lib/types'

interface Props {
  parsedData: ParsedData
  onComplete: (keywords: KeywordRow[]) => void
  onBack: () => void
}

export default function StepKeyword({ parsedData, onComplete, onBack }: Props) {
  const { stats, keywordProducts, keywordDashboard } = parsedData
  const [naverCustomerId, setNaverCustomerId] = useState('')
  const [naverApiKey, setNaverApiKey] = useState('')
  const [naverSecretKey, setNaverSecretKey] = useState('')
  const [naverLoading, setNaverLoading] = useState(false)
  const [naverError, setNaverError] = useState('')
  const [keywords, setKeywords] = useState<KeywordRow[]>([])

  // ìë¬ë¼ì´í íì¼ìì ì¸ê¸°í¤ìë ê¸°ë°ì¼ë¡ ê¸°ë³¸ í¤ìë ë¦¬ì¤í¸ ìì±
  useEffect(() => {
    const baseKeywords = buildBaseKeywords()
    setKeywords(baseKeywords)
  }, [parsedData])

  function buildBaseKeywords(): KeywordRow[] {
    const mainKw = String(keywordDashboard['í¤ìë'] || '').trim()
    const mainVol = Number(keywordDashboard['ì ê²ìë']) || 0

    // ìë¬ë¼ì´í ìíëª ë¶ìì¼ë¡ ì°ê´ í¤ìë ì¶ì¶
    const kwFreq: Record<string, number> = {}
    const stopWords = new Set(['ê°ìì§', 'ê³ ìì´', 'ë°ë ¤', 'ëë¬¼', 'í«', '1ê°', '2ê°', 'ì¸í¸', 'ì ', 'g', 'ml', 'kg', '100g', '30ì ', '60ì '])

    for (const p of keywordProducts) {
      // ìíëªìì ëªì¬ ì¶ì¶ (ê°ë¨í ë°©ì)
      const parts = p.name.split(/[\s,Â·/]+/)
      for (const part of parts) {
        const clean = part.replace(/[^ê°-í£a-zA-Z0-9]/g, '').trim()
        if (clean.length >= 2 && clean.length <= 10 && !stopWords.has(clean)) {
          kwFreq[clean] = (kwFreq[clean] || 0) + 1
        }
      }
    }

    // ë¹ë ëì í¤ìë â ì¤ì  ìíëª í¬í¨ ì¹´ì´í¸
    const sortedKws = Object.entries(kwFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([kw]) => kw)

    const rows: KeywordRow[] = []

    // ë©ì¸ í¤ìë
    if (mainKw) {
      rows.push({
        keyword: mainKw,
        naverSearchPC: null,
        naverSearchMobile: null,
        naverSearchTotal: null,
        coupangSearch: mainVol,
        productCount: countProductsWithKeyword(mainKw, keywordProducts),
        competition: mainVol > 10000 ? 'high' : mainVol > 3000 ? 'medium' : 'low',
        source: 'sellerlife',
      })
    }

    // ì°ê´ í¤ìë (ìíëªìì ì¶ì¶)
    for (const kw of sortedKws) {
      if (kw === mainKw) continue
      const count = countProductsWithKeyword(kw, keywordProducts)
      rows.push({
        keyword: kw,
        naverSearchPC: null,
        naverSearchMobile: null,
        naverSearchTotal: null,
        coupangSearch: null,
        productCount: count,
        competition: 'medium',
        source: 'sellerlife',
      })
    }

    return rows
  }

  async function fetchNaverKeywords() {
    if (!naverCustomerId || !naverApiKey || !naverSecretKey) {
      setNaverError('ë¤ì´ë² API í¤ 3ê°ì§ë¥¼ ëª¨ë ìë ¥í´ì£¼ì¸ì')
      return
    }

    setNaverLoading(true)
    setNaverError('')

    try {
      const kwList = keywords.map(k => k.keyword).slice(0, 30)
      const res = await fetch('/api/naver-keyword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: kwList,
          customerId: naverCustomerId,
          apiKey: naverApiKey,
          secretKey: naverSecretKey,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        setNaverError(data.error || 'ë¤ì´ë² API ì¤ë¥')
        return
      }

      // ê²ìë ìë°ì´í¸
      setKeywords(prev => prev.map(kw => {
        const naverData = data.results[kw.keyword]
        if (!naverData) return kw
        return {
          ...kw,
          naverSearchPC: naverData.pc,
          naverSearchMobile: naverData.mobile,
          naverSearchTotal: naverData.pc + naverData.mobile,
          source: 'naver' as const,
        }
      }))
    } catch (e) {
      setNaverError(String(e))
    } finally {
      setNaverLoading(false)
    }
  }

  const totalSearch = keywords.reduce((sum, k) => sum + (k.naverSearchTotal ?? k.coupangSearch ?? 0), 0)

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--blue)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
          STEP 2 Â· í¤ìë ë¶ì
        </div>
        <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, letterSpacing: '-.03em', marginBottom: '8px' }}>
          í¤ìëë³ ê²ìëì íì¸í©ëë¤
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.7 }}>
          ìë¬ë¼ì´í íì¼ìì {keywords.length}ê° í¤ìëë¥¼ ì¶ì¶íìµëë¤.
          ë¤ì´ë² ê´ê³  APIë¥¼ ì°ê²°íë©´ ì íí ê²ìëì ê°ì ¸ì¬ ì ììµëë¤.
        </p>
      </div>

      {/* ìë¬ë¼ì´í ê¸°ë³¸ íí© */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '24px' }}>
        <div className="card">
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text3)', marginBottom: '6px', letterSpacing: '.04em' }}>ì¿ í¡ ì ê²ìë</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--blue)' }}>{stats.keywordSearch.toLocaleString()}</div>
          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>í/ì</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text3)', marginBottom: '6px', letterSpacing: '.04em' }}>ìë ì´ ê²ìë</div>
          <div style={{ fontSize: '26px', fontWeight: 800 }}>{stats.keywordSearchLastYear.toLocaleString()}</div>
          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>í/ë</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text3)', marginBottom: '6px', letterSpacing: '.04em' }}>ì¶ì¶ í¤ìë ì</div>
          <div style={{ fontSize: '26px', fontWeight: 800 }}>{keywords.length}</div>
          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>ê°</div>
        </div>
      </div>

      {/* ë¤ì´ë² API ì°ê²° */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
              ë¤ì´ë² ê´ê³  API ì°ê²° <span className="badge badge-gray" style={{ marginLeft: '8px' }}>ì íì¬í­</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
              ì°ê²°íë©´ PC+ëª¨ë°ì¼ ì íí ê²ìëì ê°ì ¸ìµëë¤
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: '4px' }}>CUSTOMER ID</label>
            <input
              type="text" placeholder="ì«ì ID"
              value={naverCustomerId}
              onChange={e => setNaverCustomerId(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', background: 'var(--bg)', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: '4px' }}>ì¡ì¸ì¤ ë¼ì´ì ì¤</label>
            <input
              type="password" placeholder="ì¡ì¸ì¤ ë¼ì´ì ì¤"
              value={naverApiKey}
              onChange={e => setNaverApiKey(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', background: 'var(--bg)', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: '4px' }}>ë¹ë°í¤</label>
            <input
              type="password" placeholder="ë¹ë°í¤"
              value={naverSecretKey}
              onChange={e => setNaverSecretKey(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', background: 'var(--bg)', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn-blue" style={{ padding: '8px 20px', fontSize: '13px' }} onClick={fetchNaverKeywords} disabled={naverLoading}>
            {naverLoading ? 'â³ ê°ì ¸ì¤ë ì¤...' : 'ê²ìë ê°ì ¸ì¤ê¸°'}
          </button>
          <a href="https://searchad.naver.com" target="_blank" style={{ fontSize: '12px', color: 'var(--blue)', textDecoration: 'none' }}>
            â API í¤ ë°ê¸ë°ê¸°
          </a>
        </div>
        {naverError && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#DC2626', padding: '8px 12px', background: '#FEF2F2', borderRadius: '6px' }}>
            {naverError}
          </div>
        )}
      </div>

      {/* í¤ìë íì´ë¸ */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text2)', marginBottom: '16px' }}>
          í¤ìë ëª©ë¡ ({keywords.length}ê°)
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>í¤ìë</th>
                <th>ê²ìë (ì)</th>
                <th>ìíëª í¬í¨</th>
                <th>ì¶ì²</th>
              </tr>
            </thead>
            <tbody>
              {keywords.slice(0, 30).map((kw, i) => {
                const vol = kw.naverSearchTotal ?? kw.coupangSearch ?? 0
                return (
                  <tr key={i}>
                    <td><strong>{kw.keyword}</strong></td>
                    <td className="mono">
                      {vol > 0 ? (
                        <span style={{ color: vol >= 5000 ? 'var(--blue)' : vol >= 1000 ? 'var(--text)' : 'var(--text3)' }}>
                          {vol.toLocaleString()}í
                        </span>
                      ) : <span style={{ color: 'var(--text3)' }}>â</span>}
                    </td>
                    <td>
                      <span className={`badge ${kw.productCount === 0 ? 'badge-green' : kw.productCount <= 5 ? 'badge-yellow' : 'badge-gray'}`}>
                        {kw.productCount}ê°
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${kw.source === 'naver' ? 'badge-blue' : 'badge-gray'}`}>
                        {kw.source === 'naver' ? 'ë¤ì´ë²' : 'ìë¬ë¼ì´í'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="btn-primary" style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }} onClick={onBack}>
          â ì´ì 
        </button>
        <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onComplete(keywords)}>
          ê¸°í í¤ìë ì ë³íê¸° â
        </button>
      </div>
    </div>
  )
}
