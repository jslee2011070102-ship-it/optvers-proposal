import { NextRequest, NextResponse } from 'next/server'
import type { ParsedData, ScoredKeyword } from '@/lib/types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
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

    const { stats } = parsedData
    const categoryName = (() => {
      const match = parsedData.categoryFilename.match(/(?:keyword|category)_([^_]+)_/)
      return match ? match[1] : parsedData.categoryFilename.replace('.xlsx', '')
    })()

    const gradeS = scored.filter(s => s.grade === 'S')
    const gradeA = scored.filter(s => s.grade === 'A')

    const systemPrompt = `당신은 쿠팡 신제품 출시 제안서를 작성하는 전문 시장 분석가입니다.
현재 제안서 슬라이드가 이미 생성되어 있으며, 사용자의 수정 요청에 응답합니다.

분석 대상 카테고리: ${categoryName}
카테고리 월 매출: ${(stats.categoryMonthlySales / 100000000).toFixed(1)}억원
키워드 월 검색량: ${stats.keywordSearch.toLocaleString()}회
S등급 기회 키워드: ${gradeS.map(k => k.keyword).join(', ') || '없음'}
A등급 기회 키워드: ${gradeA.map(k => k.keyword).join(', ') || '없음'}

현재 슬라이드 수: ${slides.length}개

현재 슬라이드 내용 요약:
${slides.map((s, i) => `슬라이드 ${i+1}: ${s.substring(0, 200).replace(/<[^>]+>/g, ' ').trim()}...`).join('\n')}

사용자가 수정 요청을 하면:
1. 어떤 슬라이드를 어떻게 바꿀지 명확히 설명합니다
2. 특정 슬라이드를 수정해야 할 경우, 반드시 아래 형식으로 수정된 HTML을 제공합니다:
   SLIDE_UPDATE:번호:SLIDE_UPDATE_START
   (슬라이드 HTML)
   SLIDE_UPDATE_END
   번호는 0부터 시작합니다 (슬라이드 1 = 번호 0)
3. 데이터에 없는 수치를 만들어내지 않습니다
4. HTML 작성 시: height 고정 금지, overflow:hidden 금지, body/html 태그 없이 body 내부만 출력

수정 요청이 아닌 질문이면 설명으로만 답합니다.`

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
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: 'Claude API error: ' + (err.error?.message ?? res.status) }, { status: 400 })
    }

    const data = await res.json()
    const raw = data.content[0]?.text || ''

    // 슬라이드 업데이트 파싱
    const updatedSlides = [...slides]
    let hasUpdate = false
    const updatePattern = /SLIDE_UPDATE:(\d+):SLIDE_UPDATE_START([\s\S]*?)SLIDE_UPDATE_END/g
    let match
    while ((match = updatePattern.exec(raw)) !== null) {
      const idx = parseInt(match[1], 10)
      let html = match[2].trim()
      // 정리
      html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
      if (/<html[\s>]/i.test(html)) {
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
        if (bodyMatch) html = bodyMatch[1].trim()
      }
      html = html.replace(/height\s*:\s*\d+px/gi, 'min-height: auto')
      html = html.replace(/overflow\s*:\s*hidden/gi, 'overflow: visible')
      html = html.replace(/width\s*:\s*1280px/gi, 'width: 100%')
      if (idx >= 0 && idx < updatedSlides.length) {
        updatedSlides[idx] = html
        hasUpdate = true
      }
    }

    // 응답에서 SLIDE_UPDATE 블록 제거 후 사용자에게 표시
    const reply = raw.replace(/SLIDE_UPDATE:\d+:SLIDE_UPDATE_START[\s\S]*?SLIDE_UPDATE_END/g, '').trim()

    return NextResponse.json({
      reply,
      slides: hasUpdate ? updatedSlides : [],
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
