import { NextRequest, NextResponse } from 'next/server'
import { CLASS_GUIDE } from '@/lib/slide-styles'
import type { ParsedData, ScoredKeyword, KeywordRow } from '@/lib/types'

// 슬라이드 파싱 공통 함수
function parseSlides(raw: string): string[] {
  const SS = 'SLIDE_START'
  const SE = 'SLIDE_END'
  const slides: string[] = []
  const parts = raw.split(SS)
  for (let i = 1; i < parts.length; i++) {
    const end = parts[i].indexOf(SE)
    if (end !== -1) {
      let slide = parts[i].substring(0, end).trim()
      slide = slide.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
      if (/<html[\s>]/i.test(slide)) {
        const bodyMatch = slide.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
        if (bodyMatch) slide = bodyMatch[1].trim()
      }
      slide = slide.replace(/height\s*:\s*\d+px/gi, 'min-height: auto')
      slide = slide.replace(/overflow\s*:\s*hidden/gi, 'overflow: visible')
      slide = slide.replace(/width\s*:\s*1280px/gi, 'width: 100%')
      slides.push(slide)
    }
  }
  return slides
}

// Claude API 호출 공통 함수
async function callClaude(claudeKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': claudeKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!res.ok) {
    let errMsg = 'Claude API error: ' + res.status
    try {
      const errBody = await res.text()
      const errJson = JSON.parse(errBody)
      errMsg = 'Claude API error: ' + (errJson.error?.message ?? errBody.slice(0, 200))
    } catch {}
    throw new Error(errMsg)
  }
  const data = await res.json()
  return data.content[0]?.text || ''
}

export async function POST(req: NextRequest) {
  try {
    const { parsedData, keywords, scored } = await req.json() as {
      parsedData: ParsedData
      keywords: KeywordRow[]
      scored: ScoredKeyword[]
    }
    const claudeKey = process.env.ANTHROPIC_API_KEY
    if (!claudeKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
    }

    const { stats, keywordProducts, categoryFilename } = parsedData
    const categoryName = (() => {
      const match = categoryFilename.match(/(?:keyword|category)_([^_]+)_/)
      return match ? match[1] : categoryFilename.replace('.xlsx', '')
    })()

    // 판정 로직
    const step1Score = [
      stats.keywordSearch >= 5000,
      (stats.keywordSearchLastYear / 12) / Math.max(stats.keywordSearch, 1) < 2,
      stats.categoryMonthlySales >= 3000000000,
      stats.categoryMonthlyQty >= 50000,
    ].filter(Boolean).length

    const step2Pass = stats.top3SaturationSales < 50 && stats.top1SaturationSales < 35
    const opportunityKeywords = scored.filter(s => s.grade === 'S' || s.grade === 'A')

    let finalVerdict = ''
    let verdictDetail = ''
    if (step1Score >= 3 && step2Pass && opportunityKeywords.length >= 1) {
      finalVerdict = stats.rocketRatio > 80 ? '조건부 추천' : '적극 추천'
      verdictDetail = stats.rocketRatio > 80
        ? '로켓배송 등록을 전제로 진입을 추천합니다'
        : '시장 규모·경쟁 구조·공백 키워드 3가지 조건을 모두 충족합니다'
    } else if (step1Score >= 3 && opportunityKeywords.length >= 1) {
      finalVerdict = '틈새 진입 가능'
      verdictDetail = '경쟁이 있으나 특정 키워드 공백을 공략하면 진입 여지가 있습니다'
    } else {
      finalVerdict = '전제 조건 충족 시 진입 가능'
      verdictDetail = '시장 규모 또는 포화도 조건이 현재 기준치에 미달하나, 아래 제품 방향으로 차별화하면 틈새 진입이 가능합니다'
    }

    const top20 = keywordProducts.slice(0, 20)
    const top5Avg = top20.slice(0, 5)
    const avgConversion = stats.top5AvgConversion
    const avgPrice = top5Avg.length > 0
      ? Math.round(top5Avg.reduce((s, p) => s + p.price, 0) / top5Avg.length) : 0

    const topKeywords = scored.slice(0, 10)
    const gradeS = scored.filter(s => s.grade === 'S')
    const gradeA = scored.filter(s => s.grade === 'A')

    const popularKwData = (stats.popularKeywords || []).slice(0, 10).map(pk => {
      const match = keywords.find(k => k.keyword === pk.kw)
      return {
        keyword: pk.kw,
        vol: pk.vol,
        productCount: match ? match.productCount : 0,
        naverSearch: match ? (match.naverSearchTotal || null) : null,
      }
    })

    const autoKeywords = stats.autocompleteKeywords || []

    // ── 공통 시스템 프롬프트 ──
    const systemPrompt = `당신은 쿠팡 신제품 출시 제안서를 작성하는 전문 시장 분석가입니다.

═══ 절대 원칙 ═══
- 데이터에 없는 수치를 창작하지 않습니다. 모든 수치에 [쿠팡 대시보드] 또는 [키워드 분석 파일] 출처 표기.
- "재검토"라는 단어를 절대 사용하지 마세요.
- <html><head><body> 태그 없이 body 내부 HTML 조각만 출력하세요.
- height 고정 px 금지. overflow:hidden 금지.

${CLASS_GUIDE}

반드시 각 슬라이드를 SLIDE_START 와 SLIDE_END 로 감쌉니다.`

    // ── 공통 데이터 블록 ──
    const commonData = `카테고리: ${categoryName} / 분석일: ${new Date().toISOString().split('T')[0]}

[Step1 시장규모] 월검색량: ${stats.keywordSearch.toLocaleString()}회 / 작년총검색량: ${stats.keywordSearchLastYear.toLocaleString()}회 / 작년월평균: ${Math.round(stats.keywordSearchLastYear / 12).toLocaleString()}회(참고용, 계절성분석불가) / 월매출: ${(stats.categoryMonthlySales / 100000000).toFixed(1)}억원 / 월판매량: ${stats.categoryMonthlyQty.toLocaleString()}개 / 판정: ${step1Score}/4 ${step1Score >= 3 ? '✅통과' : '⚠️기준미달'}

[Step2 경쟁구조] 1위포화도: ${stats.top1SaturationSales.toFixed(1)}% / 1~3위포화도: ${stats.top3SaturationSales.toFixed(1)}% / 리뷰포화도: ${stats.top3SaturationReview.toFixed(1)}% / 로켓비율: ${stats.rocketRatio.toFixed(1)}% / 전환율: ${avgConversion.toFixed(1)}% / 판정: ${step2Pass ? '✅통과' : '⚠️미통과'}

[최종판정] ${finalVerdict} — ${verdictDetail}`

    // ── 전반부 프롬프트: S0~S4 ──
    const promptA = `${commonData}

[상위제품 목록]
${top20.map(p => `${p.rank}위|${p.name}|${p.price.toLocaleString()}원|리뷰${p.reviews.toLocaleString()}|전환율${p.conversion != null ? p.conversion.toFixed(1) + '%' : 'N/A'}|월매출${p.monthlySales != null ? (p.monthlySales / 10000).toFixed(0) + '만' : 'N/A'}|${p.delivery}`).join('\n')}

[인기키워드+교차분석]
${popularKwData.map(k => `${k.keyword}: 검색${k.vol.toLocaleString()}회, 상품명포함${k.productCount}개`).join(' / ')}
자동완성: ${autoKeywords.slice(0, 15).join(', ')}

=== S0~S4 슬라이드 4장을 작성하세요 ===
S0: 커버 — 카테고리명, 핵심KPI 3개(월검색량/월매출/월판매량), 최종판정(${finalVerdict}) 배너
S1: 시장규모 — Step1 판정표 + 수치카드 + 인사이트 callout (계절성 언급 절대 금지 — 데이터없음)
S2: 경쟁구조 — 포화도/로켓비율/전환율 수치카드 + 포화도바 시각화 + 경쟁강도 해석
S3: 상위제품분석 — 상위10~20개 제품 전체 테이블 (순위/상품명/가격/리뷰/전환율/월매출/배송)
S4: 소비자탐색패턴 — 인기키워드 순위표 + 자동완성 패턴분류 + 검색의도 해석

각 슬라이드마다 하단에 callout 박스로 핵심 인사이트 1~2줄.
SLIDE_START / SLIDE_END 로 각 슬라이드를 감싸세요.`

    // ── 후반부 프롬프트: S5~S9 ──
    const gapLines = topKeywords.map(k =>
      `[${k.grade}] ${k.keyword}: 검색${k.searchVolume.toLocaleString()}회, 상품명포함${k.productCount}개, 기회점수${k.opportunityScore}, ${k.reason}`
    ).join('\n')

    const s7guidance = `
공백키워드→제품제안:
${gradeS.slice(0, 5).map(k => `★S등급 ${k.keyword}: 검색${k.searchVolume.toLocaleString()}회, 상품${k.productCount}개 → 이 키워드를 상품명에 포함한 제품을 제안`).join('\n')}
${gradeA.slice(0, 5).map(k => `○A등급 ${k.keyword}: 검색${k.searchVolume.toLocaleString()}회, 상품${k.productCount}개`).join('\n')}
상위5평균가: ${avgPrice.toLocaleString()}원`

    const promptB = `${commonData}

[기회키워드 상세]
${gapLines}
${s7guidance}

=== S5~S9 슬라이드 5장을 작성하세요 ===
S5: 공백분석 — 인기키워드×상품명포함수 테이블 (고검색/저공급 강조) + 진입기회 해석
S6: 기회키워드선별 — S/A등급 키워드 상세표 (검색량/상품수/기회점수/이유) + 등급 배지
S7: 제품방향제안 — 2~3개 구체적 제품 각각: {제품방향한줄 / 타겟키워드(공백N개) / 가격포지션 / 상품명예시1~2개}
S8: 매출시나리오 — 보수(시장점유0.5%)/중간(1%)/낙관(2%) 3단 카드 + 전제조건 + [가정값]표기
S9: 최종결론 — ${finalVerdict} 배너 + Step1/2/3 체크리스트 + 진입전제조건 + 다음액션 3단계

S7은 "이 제품을 만들면 되겠다"는 확신을 주는 수준으로 구체적으로 작성하세요.
S9는 반드시 다음 액션 체크리스트로 마무리하세요.
SLIDE_START / SLIDE_END 로 각 슬라이드를 감싸세요.`

    // ── 두 호출 병렬 실행 ──
    const [rawA, rawB] = await Promise.all([
      callClaude(claudeKey, systemPrompt, promptA),
      callClaude(claudeKey, systemPrompt, promptB),
    ])

    const slidesA = parseSlides(rawA)
    const slidesB = parseSlides(rawB)
    const slides = [...slidesA, ...slidesB]

    return NextResponse.json({ slides, raw: rawA + '\n\n' + rawB })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
