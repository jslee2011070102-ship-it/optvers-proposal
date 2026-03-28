import type { ParsedData, DashboardRow, ProductRow } from './types'

// 숫자 변환 헬퍼
function toNum(v: unknown): number {
  if (v === null || v === undefined || v === '' || v === '-') return 0
  const n = Number(String(v).replace(/[,원%]/g, ''))
  return isNaN(n) ? 0 : n
}
function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '' || v === '-') return null
  const n = Number(String(v).replace(/[,원%]/g, ''))
  return isNaN(n) ? null : n
}

// 배송 방법 정규화
function normalizeDelivery(v: unknown): string {
  const s = String(v || '').trim()
  if (s.includes('로켓직구') || s.includes('로켓프레시')) return '로켓배송'
  if (s.includes('판매자로켓') || s.includes('판매자 로켓')) return '판매자로켓'
  if (s.includes('로켓')) return '로켓배송'
  if (s.includes('국내')) return '국내배송'
  if (s.includes('해외')) return '해외배송'
  return s || '일반배송'
}

// dashBoard 시트 첫 행 읽기
function parseDashboard(rows: Record<string, unknown>[]): DashboardRow {
  const row = rows[0] || {}
  const result: DashboardRow = {}
  for (const [k, v] of Object.entries(row)) {
    result[k] = v as string | number | null
  }
  return result
}

// shoppingList 시트 읽기
function parseProducts(rows: Record<string, unknown>[]): ProductRow[] {
  return rows
    .filter(r => r['순위'] !== undefined && r['상품명'])
    .map(r => ({
      rank: toNum(r['순위']),
      name: String(r['상품명'] || ''),
      delivery: normalizeDelivery(r['배송방법']),
      price: toNum(r['가격']),
      reviews: toNum(r['리뷰 수'] ?? r['리뷰수']),
      monthlyQty: toNumOrNull(r['월 판매량']),
      monthlySales: toNumOrNull(r['월 매출(원)'] ?? r['월 매출']),
      conversion: toNumOrNull(r['전환율(%)'] ?? r['전환율']),
    }))
}

// 인기키워드 파싱 (파일 내 텍스트에서 추출)
function extractPopularKeywords(dashboard: DashboardRow): { kw: string; vol: number }[] {
  // 셀러라이프 dashBoard에는 인기키워드가 별도 컬럼으로 없음
  // → 파일명 기반 카테고리명으로 기본 키워드 제공
  return []
}

// 자동완성 키워드 파싱
function extractAutoComplete(dashboard: DashboardRow): string[] {
  return []
}

// 메인 파서
export async function parseSellerlifeFiles(
  categoryFile: File,
  keywordFile: File
): Promise<ParsedData> {
  // 동적 import (브라우저 환경)
  const XLSX = await import('xlsx')

  async function readWorkbook(file: File) {
    const buf = await file.arrayBuffer()
    return XLSX.read(buf, { type: 'array' })
  }

  const [catWb, kwWb] = await Promise.all([
    readWorkbook(categoryFile),
    readWorkbook(keywordFile),
  ])

  // 카테고리 파일
  const catDb = parseDashboard(
    XLSX.utils.sheet_to_json(catWb.Sheets['dashBoard'] || catWb.Sheets[catWb.SheetNames[0]])
  )
  const catProducts = parseProducts(
    XLSX.utils.sheet_to_json(catWb.Sheets['shoppingList'] || catWb.Sheets[catWb.SheetNames[1]])
  )

  // 키워드 파일
  const kwDb = parseDashboard(
    XLSX.utils.sheet_to_json(kwWb.Sheets['dashBoard'] || kwWb.Sheets[kwWb.SheetNames[0]])
  )
  const kwProducts = parseProducts(
    XLSX.utils.sheet_to_json(kwWb.Sheets['shoppingList'] || kwWb.Sheets[kwWb.SheetNames[1]])
  )

  // 로켓 계열 비율 계산
  const rocketRatio = (() => {
    const r = toNum(kwDb['로켓배송비율'] ?? kwDb['로켓배송 비율'])
    const sr = toNum(kwDb['판매자로켓배송비율'] ?? kwDb['판매자로켓 배송비율'])
    if (r + sr > 0) return r + sr
    // shoppingList에서 직접 계산
    const total = kwProducts.length
    if (total === 0) return 0
    const rocketCount = kwProducts.filter(p =>
      p.delivery === '로켓배송' || p.delivery === '판매자로켓'
    ).length
    return Math.round((rocketCount / total) * 100 * 10) / 10
  })()

  // 상위 5개 평균 전환율
  const top5AvgConversion = (() => {
    const valid = kwProducts.slice(0, 10).filter(p => p.conversion !== null)
    if (valid.length === 0) return 0
    const top5 = valid.slice(0, 5)
    const sum = top5.reduce((a, b) => a + (b.conversion ?? 0), 0)
    return Math.round((sum / top5.length) * 100) / 100
  })()

  // 인기키워드 — shoppingList 상품명 빈도 분석으로 대체
  const popularKeywords: { kw: string; vol: number }[] = (() => {
    // kwDb에서 검색량 관련 컬럼 있으면 추출
    const result: { kw: string; vol: number }[] = []
    const mainKw = String(kwDb['키워드'] || '').trim()
    const mainVol = toNum(kwDb['월 검색량'])
    if (mainKw) result.push({ kw: mainKw, vol: mainVol })
    return result
  })()

  return {
    categoryDashboard: catDb,
    categoryProducts: catProducts,
    keywordDashboard: kwDb,
    keywordProducts: kwProducts,
    categoryFilename: categoryFile.name,
    keywordFilename: keywordFile.name,
    stats: {
      categoryMonthlySales: toNum(catDb['월간 
