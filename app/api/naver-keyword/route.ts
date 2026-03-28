import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

function makeSignature(timestamp: string, method: string, uri: string, secretKey: string) {
  const message = `${timestamp}.${method}.${uri}`
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64')
}

export async function POST(req: NextRequest) {
  try {
    const { keywords, customerId: bodyCustomerId, apiKey: bodyApiKey, secretKey: bodySecretKey } = await req.json()

    // 환경변수에서 먼저 읽고, 없으면 요청 본문에서 읽기
    const customerId = process.env.NAVER_CUSTOMER_ID || bodyCustomerId
    const apiKey = process.env.NAVER_API_KEY || bodyApiKey
    const secretKey = process.env.NAVER_SECRET_KEY || bodySecretKey

    if (!customerId || !apiKey || !secretKey) {
      return NextResponse.json({ error: 'API 키가 없습니다 (환경변수 설정 또는 요청에 포함 필요)' }, { status: 400 })
    }
    if (!keywords || keywords.length === 0) {
      return NextResponse.json({ error: '키워드가 없습니다' }, { status: 400 })
    }

    const timestamp = String(Date.now())
    const method = 'GET'
    const uri = '/keywordstool'
    const signature = makeSignature(timestamp, method, uri, secretKey)

    // 네이버 검색광고 API는 키워드 5개씩 배치 처리
    const results: Record<string, { pc: number; mobile: number }> = {}
    const batches: string[][] = []
    for (let i = 0; i < keywords.length; i += 5) {
      batches.push(keywords.slice(i, i + 5))
    }

    for (const batch of batches) {
      const params = new URLSearchParams()
      batch.forEach(kw => params.append('hintKeywords', kw))
      params.set('showDetail', '1')

      const res = await fetch(
        `https://api.naver.com/keywordstool?${params.toString()}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Timestamp': timestamp,
            'X-API-KEY': apiKey,
            'X-Customer': customerId,
            'X-Signature': signature,
          },
        }
      )

      if (!res.ok) {
        const err = await res.text()
        return NextResponse.json({ error: `네이버 API 오류: ${err}` }, { status: 400 })
      }

      const data = await res.json()
      const list = data.keywordList || []

      for (const item of list) {
        const kw = item.relKeyword
        if (kw && batch.includes(kw)) {
          results[kw] = {
            pc: item.monthlyPcQcCnt === '< 10' ? 5 : Number(item.monthlyPcQcCnt) || 0,
            mobile: item.monthlyMobileQcCnt === '< 10' ? 5 : Number(item.monthlyMobileQcCnt) || 0,
          }
        }
      }
    }

    return NextResponse.json({ results })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
