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

    // 네이버 키워드 데이터 포함
    const popularKwData = (stats.popularKeywords || []).slice(0, 10).map(pk => {
      const match = keywords.find(k => k.keyword === pk.kw)
      return {
        keyword: pk.kw,
        vol: pk.vol,
        productCount: match ? match.productCount : 0,
        naverSearch: match ? (match.naverSearchTotal || pk.vol) : pk.vol,
      }
    })

    const autoKeywords = stats.autocompleteKeywords || []

    // ── 공통 시스템 프롬프트 ──
    const systemPrompt = `당신은 쿠팡 신제품 출시 제안서를 작성하는 전문 시장 분석가입니다.

═══ 절대 원칙 ═══
- 데이터에 없는 수치를 창작하지 않습니다. 모든 수치에 [쿠팡 대시보드] 또는 [네이버 키워드] 출처 표기.
- "재검토"라는 단어를 절대 사용하지 마세요.
- <html><head><body> 태그 없이 body 내부 HTML 조각만 출력하세요.
- height 고정 px 금지. overflow:hidden 금지.

데이터 역할 분담:
- 쿠팡 데이터: 실제 판매되는 제품, 가격대, 경쟁 강도, 시장 규모 (거래량)
- 네이버 데이터: 소비자 검색 수요, 관심 키워드, 연관 검색 패턴 (소비자 니즈)

${CLASS_GUIDE}

반드시 각 슬라이드를 SLIDE_START 와 SLIDE_END 로 감쌉니다.`

    // ── 공통 데이터 블록 ──
    const commonData = `카테고리: ${categoryName} / 분석일: ${new Date().toISOString().split('T')[0]}

[Step1 시장규모] 월검색량: ${stats.keywordSearch.toLocaleString()}회 / 작년총검색량: ${stats.keywordSearchLastYear.toLocaleString()}회 / 작년월평균: ${Math.round(stats.keywordSearchLastYear / 12).toLocaleString()}회(참고용, 계절성분석불가) / 월매출: ${(stats.categoryMonthlySales / 100000000).toFixed(1)}억원 / 월판매량: ${stats.categoryMonthlyQty.toLocaleString()}개 / 판정: ${step1Score}/4 ${step1Score >= 3 ? '✅통과' : '⚠️기준미달'}

[Step2 경쟁구조] 1위포화도: ${stats.top1SaturationSales.toFixed(1)}% / 1~3위포화도: ${stats.top3SaturationSales.toFixed(1)}% / 리뷰포화도: ${stats.top3SaturationReview.toFixed(1)}% / 로켓비율: ${stats.rocketRatio.toFixed(1)}% / 전환율: ${avgConversion.toFixed(1)}% / 판정: ${step2Pass ? '✅통과' : '⚠️미통과'}

[최종판정] ${finalVerdict} — ${verdictDetail}`

    // ── 전반부 프롬프트: 슬라이드 1~4 ──
    const promptA = `${commonData}

[상위제품 목록]
${top20.map(p => `${p.rank}위|${p.name}|${p.price.toLocaleString()}원|리뷰${p.reviews.toLocaleString()}|전환율${p.conversion != null ? p.conversion.toFixed(1) + '%' : 'N/A'}|월매출${p.monthlySales != null ? (p.monthlySales / 10000).toFixed(0) + '만' : 'N/A'}|${p.delivery}`).join('\n')}

[인기키워드+교차분석]
${popularKwData.map(k => `${k.keyword}: 검색${k.vol.toLocaleString()}회, 상품명포함${k.productCount}개`).join(' / ')}
자동완성: ${autoKeywords.slice(0, 15).join(', ')}

=== 슬라이드 4장을 작성하세요 ===

[슬라이드 1] 표지
- .cover-kpi 그리드로 핵심 KPI 3개 카드: 월검색량 / 카테고리 월매출 / 월판매량
- 카테고리명을 .heading으로 큰 제목
- 최종판정 배너: "${finalVerdict}" — .callout.${step1Score >= 3 && step2Pass ? 'green' : step1Score >= 3 ? 'blue' : 'yellow'} 스타일로
- 하단에 분석일·데이터 출처 안내

[슬라이드 2] 시장규모 분석
- .kpi-row로 월검색량/월매출/월판매량 수치 카드 (.kpi-val.blue)
- Step1 판정 기준 4개를 .logic 컴포넌트로 통과(✅)/미달(⚠️) 표시
- 중요: 계절성 언급 절대 금지 (월별 데이터 없음)
- .callout.blue로 핵심 인사이트

[슬라이드 3] 경쟁구조 분석
- .kpi-row로 1위포화도/1~3위포화도/로켓비율 수치 카드
- .stat-list로 포화도 바 시각화 (1위/3위/리뷰/전환율)
- 포화도 기준 해설: 50% 미만=진입가능, 50~70%=주의, 70%초과=과포화
- .callout.${step2Pass ? 'green' : 'yellow'}로 경쟁강도 판정 인사이트

[슬라이드 4] 상위 제품 분석
- .tbl-wrap 테이블: 순위/상품명/가격/리뷰/전환율/월매출/배송 전체 표시
- 상위 3위 행은 .tr-hl-b (파랑 강조)
- .callout.blue로 상위 제품의 공통 특징 인사이트 (가격대·배송·리뷰 패턴)

각 슬라이드를 SLIDE_START / SLIDE_END 로 감싸세요.`

    // ── 후반부 프롬프트: 슬라이드 5~7 (네이버 데이터 중심) ──
    const gapLines = topKeywords.map(k =>
      `[${k.grade}] ${k.keyword}: 검색${k.searchVolume.toLocaleString()}회, 상품명포함${k.productCount}개, 기회점수${k.opportunityScore}, ${k.reason}`
    ).join('\n')

    const productGuidance = [
      ...gradeS.slice(0, 5).map(k => `★S등급 ${k.keyword}: 검색${k.searchVolume.toLocaleString()}회, 상품${k.productCount}개`),
      ...gradeA.slice(0, 5).map(k => `○A등급 ${k.keyword}: 검색${k.searchVolume.toLocaleString()}회, 상품${k.productCount}개`),
    ].join('\n')

    const naverConsumerNeedsSummary = `
[네이버 소비자 니즈 분석]
상위 검색 키워드: ${popularKwData.slice(0, 5).map(k => `${k.keyword}(${k.naverSearch.toLocaleString()}회)`).join(', ')}
자동완성 검색 패턴 (소비자의 실제 의도): ${autoKeywords.slice(0, 10).join(', ')}
→ 소비자들이 실제로 찾는 상품의 특징: [자동완성 키워드 분석 필요]

[쿠팡 공급 현황]
${productGuidance}
→ 네이버에서는 검색되지만 쿠팡에는 부족한 제품: [고검색/저공급 키워드 분석]
`

    const promptB = `${commonData}

[키워드 상세 데이터]
${gapLines}

[제품 제안 근거 — 고검색/저공급 키워드]
${productGuidance}
상위5개 평균 판매가: ${avgPrice.toLocaleString()}원

${naverConsumerNeedsSummary}

=== 슬라이드 3장을 작성하세요 ===

[슬라이드 5] 인기 키워드 × 상품 공급 교차분석
- .tbl-wrap 테이블: 키워드명 / 네이버 월검색량 / 쿠팡 상품명 포함 제품 수 / 공급 밀도 평가
- 검색량 높고 제품 수 적은 행은 .tr-hl-g (초록 = 진입 기회)
- 검색량 높고 제품 수 많은 행은 .tr-hl-r (빨강 = 포화)
- .callout.green으로 "이 키워드들이 공백입니다" 핵심 인사이트

[슬라이드 6] S/A등급 키워드 상세 분석
- .tbl-wrap 테이블: 등급배지(.badge.green/.badge.blue) / 키워드 / 검색량 / 상품명포함수 / 기회점수 / 선정이유
- S등급 행 .tr-hl-g, A등급 행 .tr-hl-b
- .g2 그리드로 "S등급이란?" / "A등급이란?" 설명 카드
- .callout.green으로 "이 키워드가 진입 포인트" 인사이트

[슬라이드 7] 이 제품을 출시하면 됩니다 ★★★
이 슬라이드는 제안서의 핵심 결론입니다. 고객사가 "이거 만들면 되겠다"고 확신하게 만드세요.

━━━ 제품 제안 논리: 네이버 수요 + 쿠팡 공급 매칭 ━━━

STEP 1 — 네이버에서 소비자들이 검색하는 니즈 파악
자동완성 키워드를 분석해서, 소비자가 찾는 제품의 특징(소재, 크기, 기능 등)을 파악하세요.
예: 자동완성에 "실리콘", "방수", "10단계" 등장 → 소비자는 "실리콘 방수 제품"을 찾는다

STEP 2 — 쿠팡의 현재 공급 상황 확인
위의 S/A 키워드 중에서, "검색량은 높지만 쿠팡에 제품이 3개 이하"인 키워드 찾기.
예: "바이브레이터" 검색 8,630회 vs 상품 2개만 존재 → 공급 부족

STEP 3 — 네이버 니즈 + 쿠팡 공급 부족 = 제품 기회
네이버 자동완성(소비자 니즈) + 쿠팡 상품 부족(기회) = 제안할 제품의 방향

STEP 4 — 제품 카테고리 검증 (중요!)
이 제품이 단일 카테고리인가? 다른 카테고리 키워드와 섞여 있지는 않은가?
예시 불합격: "마스크"(페이스마스크) + "바이브레이터" = 다른 카테고리 혼용 금지

STEP 5 — 제품명 생성
형식: [소재] + [제품카테고리명] + [핵심특성]
예시: "실리콘 바이브레이터 10단계 진동 방수형"
(네이버 자동완성 + S/A 키워드 조합, 단일 카테고리만 사용)

━━━ 절대 금지 사항 ━━━
✕ 서로 다른 제품 카테고리 키워드를 하나의 제품으로 합치기
✕ 브랜드명(코멧, 텐가) 포함
✕ 마케팅 문구("쉽게 사용", "안전한" 등) 포함
✕ 네이버 검색량이 높지만 쿠팡 실제 거래가 없는 카테고리 외부 제품

━━━ 슬라이드 구성 ━━━
- 상단: "${finalVerdict}" .callout.green 배너 + 근거 한 줄
- 중간: .g2 그리드로 2개 구체적 제품 제안 (.prod-card.featured 사용)
  각 제품 .prod-rows 구성:
  · 타겟키워드: S/A등급 키워드 1개 — 검색 N회(네이버), 상품명 포함 N개(쿠팡) (왜 공백인지 설명)
  · 소비자 니즈: 네이버 자동완성에서 도출한 소비자가 원하는 특징
  · 가격포지션: 상위 평균(${avgPrice.toLocaleString()}원) 대비 추천 구간
  · 소재/스펙: 구체적 소재와 핵심 스펙
  · 차별화포인트: 경쟁 제품에 없는 것 1가지 (간결하게)
- 하단: .steps 3단 액션카드: 1단계(제품 개발·샘플링) → 2단계(로켓배송 등록) → 3단계(타겟 키워드 광고)
- .callout.green으로 최종 메시지

SLIDE_START / SLIDE_END 로 각 슬라이드를 감싸세요.`

    // ── 검증 에이전트 시스템 프롬프트 ──
    const validatorSystem = `당신은 쿠팡 신제품 제안의 품질을 검증하는 전문 평가자입니다.
카테고리: ${categoryName}
목표: 제안된 제품이 실제로 이 카테고리에서 팔릴 수 있는지, 소비자 수요와 맞는지 객관적으로 평가

평가 기준:
1. 이 제품이 ${categoryName} 카테고리에서 실제로 팔리거나 팔릴 수 있는가?
2. 네이버 소비자 니즈와 쿠팡 공급 현황이 매칭되는가?
3. 이 카테고리 고객이 실제로 이 제품을 사겠는가?
4. 제품명이 논리적으로 성립하는가? (카테고리 혼용, 브랜드명 포함, 마케팅 문구 체크)
5. 서로 다른 제품 카테고리 키워드를 결합했는가? (예: 마스크 + 바이브레이터)

평가 규칙:
- 네이버 검색량 높지만 쿠팡 상품 전무/거의 없음 → 카테고리 외부 제품 가능성 → 불합격
- 제품명에 브랜드명 포함 → 즉시 불합격
- 서로 다른 카테고리 키워드 결합 → 즉시 불합격
- 논리적으로 성립하지 않는 조합 → 불합격

마지막 줄에 반드시:
✅ VALIDATION: PASS
또는
❌ VALIDATION: FAIL — 불합격 이유 (한 줄 요약)`

    // ── 검증 프롬프트 ──
    const createValidatorPrompt = (slide7Html: string) => `
아래는 생성된 슬라이드 7(최종 제품 제안)입니다:

===슬라이드 7 시작===
${slide7Html.slice(0, 3000)}
===슬라이드 7 끝===

네이버 소비자 니즈와 쿠팡 공급 현황을 바탕으로, 위 슬라이드의 제품 제안이 위 평가 기준을 충족하는지 검증하세요.
제품명, 카테고리 적합성, 네이버-쿠팡 데이터 매칭, 논리적 성립 여부를 중심으로 평가하세요.`

    // ── 두 호출 병렬 실행 (슬라이드 1~4) ──
    const [rawA, rawB] = await Promise.all([
      callClaude(claudeKey, systemPrompt, promptA),
      callClaude(claudeKey, systemPrompt, promptB),
    ])

    const slidesA = parseSlides(rawA)
    const slidesB = parseSlides(rawB)

    // 슬라이드 5, 6 확보
    const slides56 = slidesB.slice(0, 2)
    let slide7 = slidesB[2] || ''

    // ── 검증 에이전트: 슬라이드 7 검증 및 재생성 루프 ──
    let validationPass = false
    let retryCount = 0
    const maxRetries = 2

    while (!validationPass && retryCount < maxRetries) {
      // 검증
      const validationResult = await callClaude(
        claudeKey,
        validatorSystem,
        createValidatorPrompt(slide7)
      )

      if (validationResult.includes('VALIDATION: PASS')) {
        validationPass = true
        break
      } else {
        retryCount++
        if (retryCount < maxRetries) {
          // 재생성: 더 엄격한 지침으로 다시 생성
          const retryPrompt = `${commonData}

[키워드 상세 데이터]
${gapLines}

[제품 제안 근거 — 고검색/저공급 키워드]
${productGuidance}
상위5개 평균 판매가: ${avgPrice.toLocaleString()}원

${naverConsumerNeedsSummary}

주의: 이전 제안이 검증 실패했습니다.
다음을 반드시 확인하세요:

1. 네이버에서 높은 검색량이지만 쿠팡에는 상품이 없는 키워드는 아닌가?
   → 예: "마스크"는 성인용품과 무관한 검색일 가능성

2. 서로 다른 제품 카테고리 키워드를 합쳤는가?
   → 예: "마스크"(페이스마스크) + "바이브레이터" = 다른 카테고리

3. 단일 카테고리 키워드만 사용했는가?
   → "바이브레이터" 카테고리에서만 제품을 제안해야 함

4. 제품이 실제로 이 카테고리에서 팔릴 수 있는 것인가?

=== 슬라이드 7만 다시 작성하세요 ===
기존 슬라이드 5, 6의 분석을 바탕으로, 더욱 신중하게 제품을 제안하세요.
네이버 소비자 니즈(자동완성 키워드)와 쿠팡 공급 부족이 명확히 일치하는 제품만 제안하세요.

상단: "${finalVerdict}" .callout.green 배너 + 근거 한 줄
중간: .g2 그리드로 2개 제품 제안 (.prod-card.featured 사용)
하단: .steps 3단 액션카드

SLIDE_START / SLIDE_END 로 감싸세요.`

          const retryRaw = await callClaude(claudeKey, systemPrompt, retryPrompt)
          const retrySlides = parseSlides(retryRaw)
          slide7 = retrySlides[0] || slide7
        }
      }
    }

    const finalSlides = [...slidesA, ...slides56, slide7]

    return NextResponse.json({
      slides: finalSlides,
      raw: rawA + '\n\n' + rawB,
      validationPassed: validationPass,
      validationAttempts: retryCount + 1,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
