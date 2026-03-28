import { NextRequest, NextResponse } from 'next/server'
import type { ParsedData, ScoredKeyword, KeywordRow } from '@/lib/types'

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

    const { stats, keywordProducts, categoryProducts, categoryFilename } = parsedData
    const categoryName = (() => {
      const match = categoryFilename.match(/(?:keyword|category)_([^_]+)_/)
      return match ? match[1] : categoryFilename.replace('.xlsx', '')
    })()

    // 판정 로직 (지침 v1.0 기준)
    const step1Score = [
      stats.keywordSearch >= 5000,
      (stats.keywordSearchLastYear / 12) / Math.max(stats.keywordSearch, 1) < 2,
      stats.categoryMonthlySales >= 3000000000,
      stats.categoryMonthlyQty >= 50000,
    ].filter(Boolean).length

    const step2Pass = stats.top3SaturationSales < 50 && stats.top1SaturationSales < 35

    const opportunityKeywords = scored.filter(s => s.grade === 'S' || s.grade === 'A')

    let finalVerdict = ''
    if (step1Score >= 3 && step2Pass && opportunityKeywords.length >= 1) {
      finalVerdict = stats.rocketRatio > 80 ? '조건부 추천 (로켓배송 등록 필수)' : '적극 추천'
    } else if (step1Score >= 3 && opportunityKeywords.length >= 1) {
      finalVerdict = '틈새 제안'
    } else {
      finalVerdict = '재검토'
    }

    // 상위 제품 목록 (최대 20개)
    const top20 = keywordProducts.slice(0, 20)
    const top5Avg = top20.slice(0, 5)
    const avgConversion = stats.top5AvgConversion
    const avgPrice = top5Avg.length > 0
      ? Math.round(top5Avg.reduce((s, p) => s + p.price, 0) / top5Avg.length)
      : 0

    // 기회 키워드 상세 (상위 10개)
    const topKeywords = scored.slice(0, 10)
    const gradeS = scored.filter(s => s.grade === 'S')
    const gradeA = scored.filter(s => s.grade === 'A')

    // 인기키워드 + 상품명 교차분석 데이터 (지침 Step 3)
    const popularKwData = (stats.popularKeywords || []).slice(0, 10).map(pk => {
      const match = keywords.find(k => k.keyword === pk.kw)
      return {
        keyword: pk.kw,
        vol: pk.vol,
        productCount: match ? match.productCount : 0,
        naverSearch: match ? (match.naverSearchTotal || null) : null,
      }
    })

    // 자동완성 키워드 분류 (지침 Step 3)
    const autoKeywords = stats.autocompleteKeywords || []

    const SS = 'SLIDE_START'
    const SE = 'SLIDE_END'

    const systemPrompt = `당신은 쿠팡 신제품 출시 제안서를 작성하는 전문 시장 분석가입니다.
고객사(브랜드·제조사)가 쿠팡에 신제품을 출시할지 결정하기 위해 이 제안서를 봅니다.
따라서 반드시 고객사가 납득할 수 있는 수준의 구체적이고 풍부한 내용을 작성해야 합니다.

═══ 제0원칙: 절대적 사실성 ═══
- 데이터에 없는 수치를 창작하거나 추정으로 채우지 않습니다
- 모든 수치 뒤에 반드시 [쿠팡 대시보드] 또는 [키워드 분석 파일] 출처를 명시합니다
- 데이터에 없는 항목은 반드시 "[데이터 없음 — 고객사 확인 필요]" 로 표기합니다

═══ HTML 작성 규칙 ═══
- <html>, <head>, <body> 태그 없이 body 내부 HTML 조각만 출력하세요
- height를 고정 px로 지정하지 마세요. overflow:hidden을 절대 사용하지 마세요
- 내용이 자연스럽게 아래로 늘어나도록 min-height와 padding으로만 여백을 지정합니다

═══ 사용 가능한 CSS 컴포넌트 ═══
아래 컴포넌트를 활용하면 예시 제안서처럼 전문적으로 보입니다:

/* KPI 수치 카드 */
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px;">
  <div style="background:#fff;border:1px solid #E8E6E0;border-radius:12px;padding:20px 22px;">
    <div style="font-size:11px;font-weight:600;color:#9C9A94;margin-bottom:8px;">라벨</div>
    <div style="font-size:28px;font-weight:800;color:#3B82F6;letter-spacing:-.02em;">수치</div>
    <div style="font-size:12px;color:#9C9A94;margin-top:4px;">[출처]</div>
  </div>
</div>

/* 인사이트 callout 박스 */
<div style="border-radius:8px;padding:14px 18px;font-size:13px;line-height:1.7;margin-top:16px;background:#EEF4FF;border-left:3px solid #3B82F6;color:#1E3A6E;">
  <strong>인사이트</strong> — 내용
</div>
<div style="...;background:#ECFDF5;border-left:3px solid #16A34A;color:#14532D;">초록 callout</div>
<div style="...;background:#FFFBEB;border-left:3px solid #D97706;color:#78350F;">노랑 callout</div>
<div style="...;background:#FEF2F2;border-left:3px solid #DC2626;color:#7F1D1D;">빨강 callout</div>

/* 데이터 테이블 */
<div style="border:1px solid #E8E6E0;border-radius:12px;overflow:hidden;">
  <table style="width:100%;border-collapse:collapse;background:#fff;">
    <thead><tr style="background:#F2F1EE;">
      <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#5C5B57;border-bottom:1px solid #E8E6E0;">컬럼</th>
    </tr></thead>
    <tbody><tr style="border-bottom:1px solid #E8E6E0;">
      <td style="padding:11px 14px;font-size:13px;">데이터</td>
    </tr></tbody>
  </table>
</div>

/* 배지 */
<span style="display:inline-flex;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;background:#EEF4FF;color:#3B82F6;">파랑</span>
<span style="...;background:#ECFDF5;color:#16A34A;">초록</span>
<span style="...;background:#FFFBEB;color:#D97706;">노랑</span>
<span style="...;background:#FEF2F2;color:#DC2626;">빨강</span>

/* 2단 그리드 카드 */
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
  <div style="background:#fff;border:1px solid #E8E6E0;border-radius:12px;padding:20px;"></div>
</div>

/* 섹션 레이블 (슬라이드 번호 표시) */
<div style="font-size:12px;font-weight:600;color:#3B82F6;letter-spacing:.04em;text-transform:uppercase;margin-bottom:12px;">S번호 · 제목</div>

/* 메인 제목 */
<h2 style="font-size:clamp(24px,3vw,36px);font-weight:800;letter-spacing:-.03em;margin-bottom:8px;"></h2>

/* 분석 범위 표시 (우측 상단) */
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">
  <div>제목 영역</div>
  <div style="font-size:11px;color:#9C9A94;background:#F2F1EE;padding:4px 10px;border-radius:6px;">분석 범위: ...</div>
</div>

/* 포화도 바 */
<div style="margin-top:8px;">
  <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
    <span style="font-weight:600;">항목명</span><span style="font-weight:700;">XX%</span>
  </div>
  <div style="height:8px;background:#E8E6E0;border-radius:4px;">
    <div style="height:100%;width:XX%;background:#3B82F6;border-radius:4px;"></div>
  </div>
</div>

/* 매출 시나리오 카드 3단 */
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
  <div style="background:#fff;border:1px solid #E8E6E0;border-radius:12px;padding:22px;">
    <div style="font-size:11px;font-weight:700;color:#9C9A94;text-transform:uppercase;margin-bottom:12px;">보수</div>
    <div style="font-size:36px;font-weight:800;color:#9C9A94;letter-spacing:-.02em;margin-bottom:4px;">0.5%</div>
    <div style="font-size:18px;font-weight:700;">○○○만원</div>
  </div>
  <div style="...;background:#FFFBEB;border-color:#FDE68A;"><!-- 중간: 노랑 강조 --></div>
  <div style="...">낙관</div>
</div>

═══ 출력 형식 ═══
반드시 각 슬라이드를 SLIDE_START 와 SLIDE_END 로 감쌉니다.
각 슬라이드는 충분히 상세하게 (데이터 테이블, KPI 카드, callout, 분석 해석 포함) 작성합니다.
슬라이드당 최소 400자 이상의 HTML 내용을 포함합니다.

슬라이드 구성:
S0 커버 — 핵심 KPI 3개 + 최종 판정 결론
S1 시장 규모 — Step1 통과 여부 + 월 검색량/매출 수치 + 계절성 분석
S2 경쟁 구조 — Step2 포화도 + 로켓 비율 + 전환율 + 벤치마크 비교표
S3 상위 제품 분석 — 상위 10~20개 제품 테이블 (순위/상품명/가격/리뷰/전환율/배송)
S4 소비자 탐색 패턴 — 인기키워드 순위표 + 자동완성 패턴 분류 + 검색 의도 해석
S5 공백 분석 — 고검색/저공급 키워드 발굴 + 상품명 포함 제품 수 + 진입 기회
S6 기회 키워드 선별 — S/A등급 키워드 상세 분석 + 기회 점수 근거
S7 제품 방향 제안 — 키워드/형태/가격포지션/상품명 예시 + [데이터 없음] 항목 명시
S8 매출 시나리오 — 보수/중간/낙관 3단 + 전제 조건 + [가정값] 명시
S9 최종 결론 — Step1/2/3 판정 결과표 + 최종 판정 + 다음 액션 제안`

    const userPrompt = `=== 분석 데이터 (쿠팡 대시보드 기반) ===

카테고리: ${categoryName}
분석 범위: 쿠팡 키워드 분석 (상위 ${keywordProducts.length}개 제품)
분석일: ${new Date().toISOString().split('T')[0]}

─── [Step 1] 시장 규모 ───
월 검색량:        ${stats.keywordSearch.toLocaleString()}회 [키워드 분석 파일 · 월 검색량]
작년 총 검색량:   ${stats.keywordSearchLastYear.toLocaleString()}회 [키워드 분석 파일 · 작년 총 검색량]
월평균(작년):     ${Math.round(stats.keywordSearchLastYear / 12).toLocaleString()}회/월 → 계절성 ${(stats.keywordSearchLastYear / 12) / Math.max(stats.keywordSearch, 1) < 2 ? '안정적 (편차 2배 미만)' : '주의 필요 (편차 큼)'}
카테고리 월 매출: ${(stats.categoryMonthlySales / 100000000).toFixed(1)}억원 [쿠팡 대시보드 · 월간 총 매출]
카테고리 월 판매량: ${stats.categoryMonthlyQty.toLocaleString()}개 [쿠팡 대시보드 · 월간 총 판매량]
Step1 판정: ${step1Score}개/4개 기준 통과 → ${step1Score >= 3 ? '✅ 통과' : '⚠️ 재검토'}

─── [Step 2] 경쟁 구조 ───
1위 매출 포화도:    ${stats.top1SaturationSales.toFixed(1)}% [키워드 분석 파일] → 기준(20% 미만 ◎ / 20~35% △ / 35% 초과 ✕): ${stats.top1SaturationSales < 20 ? '◎ 매우낮음' : stats.top1SaturationSales < 35 ? '△ 보통' : '✕ 높음'}
1~3위 매출 포화도:  ${stats.top3SaturationSales.toFixed(1)}% [키워드 분석 파일] → 기준(50% 미만 ◎ / 50~70% △ / 70% 초과 ✕): ${stats.top3SaturationSales < 50 ? '◎ 진입 가능' : stats.top3SaturationSales < 70 ? '△ 주의' : '✕ 과포화'}
1~3위 리뷰 포화도:  ${stats.top3SaturationReview.toFixed(1)}% [키워드 분석 파일] → 기준(40% 미만 ◎ / 40~60% △ / 60% 초과 ✕): ${stats.top3SaturationReview < 40 ? '◎ 낮음' : stats.top3SaturationReview < 60 ? '△ 보통' : '✕ 높음'}
로켓 계열 배송 비율: ${stats.rocketRatio.toFixed(1)}% [쿠팡 대시보드] → ${stats.rocketRatio > 80 ? '⚠️ 80% 초과 — 로켓배송 등록 필수' : '✅ 80% 미만 — 일반 진입 가능'}
상위 5개 평균 전환율: ${avgConversion.toFixed(1)}% [키워드 분석 파일] → 기준(10% 이상 ◎ / 5~9% △ / 5% 미만 ✕): ${avgConversion >= 10 ? '◎ 높음' : avgConversion >= 5 ? '△ 보통' : '✕ 낮음'}
Step2 판정: ${step2Pass ? '✅ 통과 (포화도 기준 충족)' : '⚠️ 미통과 (포화도 기준 초과)'}

─── [Step 3] 공백 분석 ───
인기키워드 + 상품명 교차분석:
${popularKwData.map(k => `  ${k.keyword}: 쿠팡검색량 ${k.vol.toLocaleString()}회${k.naverSearch ? ` / 네이버검색량 ${k.naverSearch.toLocaleString()}회` : ''} → 상품명 포함 제품 ${k.productCount}개`).join('\n')}

자동완성 키워드: ${autoKeywords.slice(0, 15).join(', ')}

기회 키워드 (S등급: ${gradeS.length}개, A등급: ${gradeA.length}개):
${topKeywords.map(k => `  [${k.grade}등급] ${k.keyword} — 검색량 ${k.searchVolume.toLocaleString()}회 / 상품명포함 ${k.productCount}개 / 기회점수 ${k.opportunityScore} / ${k.reason}`).join('\n')}
Step3 판정: ${opportunityKeywords.length >= 1 ? '✅ 빈자리 발견 — 진입 방향 특정 가능' : '⚠️ 빈자리 부족'}

─── 상위 제품 목록 ───
${top20.map(p => `  ${p.rank}위 | ${p.name} | ${p.price.toLocaleString()}원 | 리뷰 ${p.reviews.toLocaleString()}개 | 전환율 ${p.conversion != null ? p.conversion.toFixed(1) + '%' : '[데이터없음]'} | 월매출 ${p.monthlySales != null ? (p.monthlySales / 10000).toFixed(0) + '만원' : '[데이터없음]'} | ${p.delivery}`).join('\n')}

─── 최종 판정 ───
${finalVerdict}
(Step1 ${step1Score}/4 통과 + Step2 ${step2Pass ? '통과' : '미통과'} + 공백키워드 ${opportunityKeywords.length}개)

=== 작성 요청 ===

위 데이터를 기반으로 9개 슬라이드(S0~S8) HTML을 작성하세요.

필수 요구사항:
1. 모든 수치에 [쿠팡 대시보드] 또는 [키워드 분석 파일] 출처 표기
2. 각 슬라이드는 데이터 테이블 또는 KPI 카드를 반드시 포함
3. 각 슬라이드 하단에 파란/초록/노랑 callout 박스로 핵심 인사이트 1~2줄 작성
4. 데이터에 없는 항목은 [데이터 없음 — 고객사 확인 필요] 표기
5. 고객사가 처음 보고도 "이 시장에 진입해야겠다" 또는 "재검토해야겠다"고 납득할 수 있도록
6. 전문 컨설팅 제안서 수준의 어조와 밀도로 작성
7. S5(공백분석) 슬라이드에서는 반드시 인기키워드별 상품명 포함 수를 테이블로 제시

SLIDE_START / SLIDE_END 로 반드시 각 슬라이드를 감싸세요.`

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
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: 'Claude API error: ' + (err.error?.message ?? res.status) }, { status: 400 })
    }

    const data = await res.json()
    const raw = data.content[0]?.text || ''
    const slides: string[] = []
    const parts = raw.split(SS)

    for (let i = 1; i < parts.length; i++) {
      const end = parts[i].indexOf(SE)
      if (end !== -1) {
        let slide = parts[i].substring(0, end).trim()

        // 마크다운 코드블록 태그 제거
        slide = slide.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()

        // 완전한 HTML 문서인 경우 → body 내용만 추출
        if (/<html[\s>]/i.test(slide)) {
          const bodyMatch = slide.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
          if (bodyMatch) slide = bodyMatch[1].trim()
        }

        // 고정 높이/overflow 제거
        slide = slide.replace(/height\s*:\s*\d+px/gi, 'min-height: auto')
        slide = slide.replace(/overflow\s*:\s*hidden/gi, 'overflow: visible')
        slide = slide.replace(/width\s*:\s*1280px/gi, 'width: 100%')

        slides.push(slide)
      }
    }

    return NextResponse.json({ slides, raw })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
