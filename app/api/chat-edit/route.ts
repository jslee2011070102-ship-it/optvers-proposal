import { NextRequest, NextResponse } from 'next/server'
import { CLASS_GUIDE } from '@/lib/slide-styles'
import type { ParsedData, ScoredKeyword } from '@/lib/types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

async function callClaude(claudeKey: string, system: string, messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': claudeKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      temperature: 0,
      system,
      messages,
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.status.toString())
    throw new Error('Claude API error: ' + err.slice(0, 200))
  }
  const data = await res.json()
  return data.content[0]?.text || ''
}

export async function POST(req: NextRequest) {
  try {
    const { messages, slides, parsedData, scored } = await req.json() as {
      messages: ChatMessage[]
      slides: string[]
      parsedData: ParsedData
      scored: ScoredKeyword[]
    }

    const claudeKey = process.env.ANTHROPIC_API_KEY
    if (!claudeKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
    }

    const categoryName = (() => {
      const match = parsedData.categoryFilename.match(/(?:keyword|category)_([^_]+)_/)
      return match ? match[1] : parsedData.categoryFilename.replace('.xlsx', '')
    })()

    const { stats } = parsedData
    const gradeS = scored.filter(s => s.grade === 'S')
    const gradeA = scored.filter(s => s.grade === 'A')
    const userRequest = messages[messages.length - 1]?.content || ''

    // ── 1단계: 분석 응답 (무엇을 어떻게 바꿀지) ──
    const analysisSystem = `당신은 쿠팡 제안서 편집 어시스턴트입니다.
카테고리: ${categoryName}
현재 슬라이드 수: ${slides.length}개 (S0~S${slides.length - 1})

슬라이드 목록:
${slides.map((s, i) => `슬라이드${i}(S${i}): ${s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)}...`).join('\n')}

S등급 키워드: ${gradeS.map(k => k.keyword).join(', ') || '없음'}
A등급 키워드: ${gradeA.map(k => k.keyword).join(', ') || '없음'}
월검색량: ${stats.keywordSearch.toLocaleString()}회 / 월매출: ${(stats.categoryMonthlySales / 100000000).toFixed(1)}억원

사용자 요청에 대해:
1. 어떤 변경을 할 것인지 한국어로 설명합니다 (2~3문장)
2. 어느 슬라이드를 수정/추가할지 명시합니다
3. 마지막 줄에 반드시 아래 형식으로 액션을 출력합니다:
   ACTION: update_slide:N  (기존 슬라이드 N 수정, N은 0부터 시작)
   ACTION: add_slide  (새 슬라이드 추가)
   ACTION: info_only  (슬라이드 변경 없이 정보 제공만)

데이터에 없는 수치를 만들지 마세요.`

    const reply = await callClaude(claudeKey, analysisSystem, messages.map(m => ({ role: m.role, content: m.content })))

    // ── 2단계: 액션 파싱 → HTML 생성 ──
    const actionMatch = reply.match(/ACTION:\s*(update_slide:(\d+)|add_slide|info_only)/)
    const replyText = reply.replace(/ACTION:.*/g, '').trim()

    if (!actionMatch || actionMatch[1] === 'info_only') {
      return NextResponse.json({ reply: replyText, slides: [] })
    }

    const isAdd = actionMatch[1] === 'add_slide'
    const slideIdx = isAdd ? slides.length : parseInt(actionMatch[2] ?? '0', 10)
    const currentHtml = !isAdd && slideIdx < slides.length ? slides[slideIdx] : ''

    // HTML 생성 프롬프트
    const htmlSystem = `당신은 쿠팡 제안서 슬라이드를 HTML로 작성하는 전문가입니다.
카테고리: ${categoryName}
월검색량: ${stats.keywordSearch.toLocaleString()}회 / 월매출: ${(stats.categoryMonthlySales / 100000000).toFixed(1)}억원
S등급 키워드: ${gradeS.map(k => `${k.keyword}(검색${k.searchVolume.toLocaleString()}회,상품${k.productCount}개)`).join(', ') || '없음'}
A등급 키워드: ${gradeA.map(k => `${k.keyword}(검색${k.searchVolume.toLocaleString()}회,상품${k.productCount}개)`).join(', ') || '없음'}

${CLASS_GUIDE}

규칙: body 내부 HTML 조각만 출력. <html><head><body> 태그 없음. height 고정 px 금지. overflow:hidden 금지.
데이터에 없는 수치를 만들지 마세요. 없는 항목은 [데이터 없음] 표기.`

    const htmlPrompt = isAdd
      ? `사용자 요청: "${userRequest}"
기존 슬라이드들의 맥락을 이어서, 위 요청에 맞는 새 슬라이드 HTML을 작성하세요.
전문 제안서 수준으로 구체적으로 작성하고, 하단에 callout 박스로 핵심 인사이트를 포함하세요.
HTML 조각만 출력하세요.`
      : `사용자 요청: "${userRequest}"

현재 슬라이드${slideIdx} HTML:
${currentHtml.slice(0, 3000)}

위 요청에 맞게 슬라이드를 수정한 새 HTML을 작성하세요.
전문 제안서 수준으로 구체적으로 작성하고, 하단에 callout 박스로 핵심 인사이트를 포함하세요.
HTML 조각만 출력하세요.`

    const newHtml = await callClaude(claudeKey, htmlSystem, [{ role: 'user', content: htmlPrompt }])

    // HTML 정리
    let cleanHtml = newHtml
      .replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
    if (/<html[\s>]/i.test(cleanHtml)) {
      const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
      if (bodyMatch) cleanHtml = bodyMatch[1].trim()
    }
    cleanHtml = cleanHtml
      .replace(/height\s*:\s*\d+px/gi, 'min-height: auto')
      .replace(/overflow\s*:\s*hidden/gi, 'overflow: visible')
      .replace(/width\s*:\s*1280px/gi, 'width: 100%')

    // 슬라이드 배열 업데이트
    const updatedSlides = [...slides]
    if (isAdd) {
      updatedSlides.push(cleanHtml)
    } else {
      updatedSlides[slideIdx] = cleanHtml
    }

    const slideDesc = isAdd
      ? `✅ 새 슬라이드(S${updatedSlides.length - 1})가 추가되었습니다.`
      : `✅ S${slideIdx} 슬라이드가 업데이트되었습니다.`

    return NextResponse.json({
      reply: replyText + '\n\n' + slideDesc,
      slides: updatedSlides,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
