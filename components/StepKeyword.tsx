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
  const [naverLoading, setNaverLoading] = useState(false)
  const [naverError, setNaverError] = useState('')
  const [naverFetched, setNaverFetched] = useState(false)
  const [keywords, setKeywords] = useState<KeywordRow[]>([])

  // 셀러라이프 파일에서 인기키워드 기반으로 기본 키워드 리스트 생성
  useEffect(() => {
    const baseKeywords = buildBaseKeywords()
    setKeywords(baseKeywords)
  }, [parsedData])

  // 컴포넌트 로드 시 자동으로 네이버 API에서 검색량 가져오기
  useEffect(() => {
    if (keywords.length > 0 && !naverFetched) {
      fetchNaverKeywords()
    }
  }, [keywords, naverFetched])

  function buildBaseKeywords(): KeywordRow[] {
    const mainKw = String(keywordDashboard['키워드'] || '').trim()
    const mainVol = Number(keywordDashboard['월 검색량']) || 0

    // 셀러라이프 상품명 분석으로 연관 키워드 추출
    const kwFreq: Record<string, number> = {}
    const stopWords = new Set(['강아지', '고양이', '반려', '동물', '펫', '1개', '2개', '세트', '정', 'g', 'ml', 'kg', '100g', '30정', '60정'])

    for (const p of keywordProducts) {
      // 상품명에서 명사 추출 (간단한 방식)
      const parts = p.name.split(/[\s,·/]+/)
      for (const part of parts) {
        const clean = part.replace(/[^가-힣a-zA-Z0-9]/g, '').trim()
        if (clean.length >= 2 && clean.length <= 10 && !stopWords.has(clean)) {
          kwFreq[clean] = (kwFreq[clean] || 0) + 1
        }
      }
    }

    // 빈도 높은 키워드 → 실제 상품명 포함 카운트
    const sortedKws = Object.entries(kwFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([kw]) => kw)

    const rows: KeywordRow[] = []

    // 메인 키워드
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

    // 연관 키워드 (상품명에서 추출)
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
    setNaverLoading(true)
    setNaverError('')

    try {
      const kwList = keywords.map(k => k.keyword).slice(0, 30)
      const res = await fetch('/api/naver-keyword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: kwList,
          // 환경변수가 설정되어 있으면 사용, 없으면 null 전송
          // 서버에서 환경변수 우선 사용
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        // API 키가 없으면 오류, 있으면 성공
        if (data.error && data.error.includes('API 키')) {
          setNaverError('네이버 API 키가 설정되지 않았습니다. .env.local 파일에 설정 후 재실행하세요.')
          setNaverFetched(true)
          return
        }
        setNaverError(data.error || '네이버 API 오류')
        setNaverFetched(true)
        return
      }

      // 검색량 업데이트
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
      setNaverFetched(true)
    } catch (e) {
      setNaverError(String(e))
      setNaverFetched(true)
    } finally {
      setNaverLoading(false)
    }
  }

  const totalSearch = keywords.reduce((sum, k) => sum + (k.naverSearchTotal ?? k.coupangSearch ?? 0), 0)

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--blue)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
          STEP 2 · 키워드 분석
        </div>
        <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, letterSpacing: '-.03em', marginBottom: '8px' }}>
          키워드별 검색량을 확인합니다
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.7 }}>
          셀러라이프 파일에서 {keywords.length}개 키워드를 추출했습니다.
          네이버 광고 API를 연결하면 정확한 검색량을 가져올 수 있습니다.
        </p>
      </div>

      {/* 셀러라이프 기본 현황 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '24px' }}>
        <div className="card">
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text3)', marginBottom: '6px', letterSpacing: '.04em' }}>쿠팡 월 검색량</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--blue)' }}>{stats.keywordSearch.toLocaleString()}</div>
          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>회/월</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text3)', marginBottom: '6px', letterSpacing: '.04em' }}>작년 총 검색량</div>
          <div style={{ fontSize: '26px', fontWeight: 800 }}>{stats.keywordSearchLastYear.toLocaleString()}</div>
          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>회/년</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text3)', marginBottom: '6px', letterSpacing: '.04em' }}>추출 키워드 수</div>
          <div style={{ fontSize: '26px', fontWeight: 800 }}>{keywords.length}</div>
          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>개</div>
        </div>
      </div>

      {/* 네이버 API 자동 연결 상태 */}
      <div className="card" style={{ marginBottom: '24px', background: naverError ? '#FEF2F2' : naverFetched ? '#F0FDF4' : '#EEF4FF', border: `1px solid ${naverError ? '#FECACA' : naverFetched ? '#BBFF99' : '#BFDBFE'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ fontSize: '18px' }}>
            {naverLoading ? '⏳' : naverError ? '⚠️' : naverFetched ? '✅' : '🔄'}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>
              {naverLoading ? '네이버 API 검색량 가져오는 중...' : naverError ? '네이버 API 연결 안함' : naverFetched ? '네이버 API 연결 완료' : '네이버 API 자동 연결 중...'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
              {naverError ? '셀러라이프 검색량으로 분석을 진행합니다' : naverFetched ? 'PC+모바일 정확한 검색량이 적용되었습니다' : '네이버 광고 API에서 정확한 검색량을 가져옵니다'}
            </div>
          </div>
        </div>

        {naverError && (
          <div style={{ fontSize: '12px', color: '#DC2626', padding: '8px 12px', background: '#FFF5F5', borderRadius: '6px', marginTop: '8px' }}>
            <strong>설정 필요:</strong> .env.local 파일에 NAVER_CUSTOMER_ID, NAVER_API_KEY, NAVER_SECRET_KEY를 설정하세요.
            <a href="https://searchad.naver.com" target="_blank" style={{ display: 'block', marginTop: '4px', color: 'var(--blue)' }}>
              → 네이버 검색광고에서 API 키 발급받기
            </a>
          </div>
        )}
      </div>

      {/* 키워드 테이블 */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text2)', marginBottom: '16px' }}>
          키워드 목록 ({keywords.length}개)
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>키워드</th>
                <th>검색량 (월)</th>
                <th>상품명 포함</th>
                <th>출처</th>
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
                          {vol.toLocaleString()}회
                        </span>
                      ) : <span style={{ color: 'var(--text3)' }}>—</span>}
                    </td>
                    <td>
                      <span className={`badge ${kw.productCount === 0 ? 'badge-green' : kw.productCount <= 5 ? 'badge-yellow' : 'badge-gray'}`}>
                        {kw.productCount}개
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${kw.source === 'naver' ? 'badge-blue' : 'badge-gray'}`}>
                        {kw.source === 'naver' ? '네이버' : '셀러라이프'}
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
          ← 이전
        </button>
        <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onComplete(keywords)}>
          기회 키워드 선별하기 →
        </button>
      </div>
    </div>
  )
}
