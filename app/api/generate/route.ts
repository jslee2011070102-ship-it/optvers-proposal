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
    const { stats, keywordProducts, categoryFilename } = parsedData
    const topOpportunities = scored.filter(s => s.grade === 'S' || s.grade === 'A').slice(0, 5)
    const top10Products = keywordProducts.slice(0, 10)
    const categoryName = (() => {
      const match = categoryFilename.match(/(?:keyword|category)_([^_]+)_/)
      return match ? match[1] : categoryFilename.replace('.xlsx', '')
    })()

    // 포화도 벤치마크 정보
    const saturationRate = stats.top3SaturationSales || 0
    let saturationLevel = ''
    if (saturationRate < 20) {
      saturationLevel = '매우 낮음 (강력히 추천) ✨'
    } else if (saturationRate < 30) {
      saturationLevel = '중간 (진입 가능) ⭐'
    } else if (saturationRate < 50) {
      saturationLevel = '높음 (경쟁 심함) ⚠️'
    } else {
      saturationLevel = '매우 높음 (재검토 필요) ❌'
    }

    const SS = 'SLIDE_START'
    const SE = 'SLIDE_END'
    const systemPrompt = [
      '당신은 쿠팡 신제품 출시 제안서를 자동 생성하는 전문 분석가입니다.',
      '제0원칙: 절대적 사실성',
      '- 데이터에 없는 수치는 창작하지 않습니다',
      '- 모든 수치에 [출처] 를 명시합니다',
      '- 분석 범위를 명확히 표기합니다',
      '출력 형식: 반드시 각 슬라이드를 ' + SS + ' 와 ' + SE + ' 로 감쌉니다.',
      '중요: 각 슬라이드는 <html>, <head>, <body> 태그 없이 body 내부 HTML 조각만 출력하세요.',
      '중요: height를 고정px로 지정하지 마세요. overflow:hidden을 사용하지 마세요.',
      '중요: 내용이 자연스럽게 아래로 늘어나도록 min-height와 padding으로만 여백을 지정하세요.',
      '10개 슬라이드: S0커버 S1시장규모 S2경쟁구조 S3탐색패턴 S4~S6공백분석 S7제품방향 S8매출시나리오 S9결론',
      '배경 #F8F7F4, 강조 #3B82F6, 카드 border-radius:12px',
    ].join('\n')
    const userPrompt = [
      '=== 분석 데이터 ===',
      '',
      '카테고리: ' + categoryName,
      '분석 범위: 쿠팡 키워드 분석 (상위 ' + keywordProducts.length + '개 제품)',
      '분석일: ' + new Date().toISOString().split('T')[0],
      '',
      '[Step 1] 시장 규모',
      '- 월 검색량: ' + (stats.keywordSearch || 0).toLocaleString() + '회 [쿠팡 대시보드]',
      '- 월간 총 매출: ' + (stats.categoryMonthlySales / 100000000).toFixed(1) + '억 원 [쿠팡 대시보드]',
      '',
      '[Step 2] 경쟁 분석',
      '- 1~3위 포화도: ' + saturationRate.toFixed(1) + '% = ' + saturationLevel + ' [쿠팡 대시보드]',
      '- 포화도 벤치마크: 0-20%=매우낮음, 20-30%=중간, 30-50%=높음, 50%+=매우높음',
      '',
      '[Step 3] 기회 키워드',
      '- 발견된 기회 키워드: ' + (topOpportunities.slice(0, 3).map(o => o.keyword).join(', ') || '분석 중') + '',
      '- (모두 상위 경쟁사에서 언급되는 키워드로, 검색 수요 있음)',
      '',
      '=== 요청사항 ===',
      '',
      '위 데이터를 기반으로 10개 슬라이드 HTML 생성:',
      '1. 분석 범위를 명확히 표기',
      '2. 포화도 해석에 벤치마크 포함',
      '3. 기회 키워드 근거 명시',
      '4. 최종 판정은 명확하게 (적극 추천/조건부/재검토)',
      '5. 불필요한 섹션은 제외',
      '',
      'SLIDE_START / SLIDE_END 로 반드시 감싸세요.',
    ].join('\n')

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': claudeKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 10000, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
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

        // 마크다운 코드블록 태그 제거 (```html ... ```)
        slide = slide.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()

        // 완전한 HTML 문서로 생성된 경우 → <body> 내용만 추출
        if (/<html[\s>]/i.test(slide)) {
          const bodyMatch = slide.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
          if (bodyMatch) slide = bodyMatch[1].trim()
        }

        // 고정 height(720px 등)와 overflow:hidden 제거 → 스크롤 가능하게
        slide = slide.replace(/height\s*:\s*\d+px/gi, 'min-height: auto')
        slide = slide.replace(/overflow\s*:\s*hidden/gi, 'overflow: visible')
        // width 고정도 제거 (1280px 등)
        slide = slide.replace(/width\s*:\s*1280px/gi, 'width: 100%')

        slides.push(slide)
      }
    }
    return NextResponse.json({ slides, raw })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
