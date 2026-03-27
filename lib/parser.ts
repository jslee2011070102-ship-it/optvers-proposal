import type { ParsedData, DashboardRow, ProductRow } from './types'

// ì«ì ë³í í¬í¼
function toNum(v: unknown): number {
  if (v === null || v === undefined || v === '' || v === '-') return 0
  const n = Number(String(v).replace(/[,ì%]/g, ''))
  return isNaN(n) ? 0 : n
}
function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '' || v === '-') return null
  const n = Number(String(v).replace(/[,ì%]/g, ''))
  return isNaN(n) ? null : n
}

// ë°°ì¡ ë°©ë² ì ê·í
function normalizeDelivery(v: unknown): string {
  const s = String(v || '').trim()
  if (s.includes('ë¡ì¼ì§êµ¬') || s.includes('ë¡ì¼íë ì')) return 'ë¡ì¼ë°°ì¡'
  if (s.includes('íë§¤ìë¡ì¼') || s.includes('íë§¤ì ë¡ì¼')) return 'íë§¤ìë¡ì¼'
  if (s.includes('ë¡ì¼')) return 'ë¡ì¼ë°°ì¡'
  if (s.includes('êµ­ë´')) return 'êµ­ë´ë°°ì¡'
  if (s.includes('í´ì¸')) return 'í´ì¸ë°°ì¡'
  return s || 'ì¼ë°ë°°ì¡'
}

// dashBoard ìí¸ ì²« í ì½ê¸°
function parseDashboard(rows: Record<string, unknown>[]): DashboardRow {
  const row = rows[0] || {}
  const result: DashboardRow = {}
  for (const [k, v] of Object.entries(row)) {
    result[k] = v as string | number | null
  }
  return result
}

// shoppingList ìí¸ ì½ê¸°
function parseProducts(rows: Record<string, unknown>[]): ProductRow[] {
  return rows
    .filter(r => r['ìì'] !== undefined && r['ìíëª'])
    .map(r => ({
      rank: toNum(r['ìì']),
      name: String(r['ìíëª'] || ''),
      delivery: normalizeDelivery(r['ë°°ì¡ë°©ë²']),
      price: toNum(r['ê°ê²©']),
      reviews: toNum(r['ë¦¬ë·° ì'] ?? r['ë¦¬ë·°ì']),
      monthlyQty: toNumOrNull(r['ì íë§¤ë']),
      monthlySales: toNumOrNull(r['ì ë§¤ì¶(ì)'] ?? r['ì ë§¤ì¶']),
      conversion: toNumOrNull(r['ì íì¨(%)'] ?? r['ì íì¨']),
    }))
}

// ì¸ê¸°í¤ìë íì± (íì¼ ë´ íì¤í¸ìì ì¶ì¶)
function extractPopularKeywords(dashboard: DashboardRow): { kw: string; vol: number }[] {
  // ìë¬ë¼ì´í dashBoardìë ì¸ê¸°í¤ìëê° ë³ë ì»¬ë¼ì¼ë¡ ìì
  // â íì¼ëª ê¸°ë° ì¹´íê³ ë¦¬ëªì¼ë¡ ê¸°ë³¸ í¤ìë ì ê³µ
  return []
}

// ìëìì± í¤ìë íì±
function extractAutoComplete(dashboard: DashboardRow): string[] {
  return []
}

// ë©ì¸ íì
export async function parseSellerlifeFiles(
  categoryFile: File,
  keywordFile: File
): Promise<ParsedData> {
  // ëì  import (ë¸ë¼ì°ì  íê²½)
  const XLSX = await import('xlsx')

  async function readWorkbook(file: File) {
    const buf = await file.arrayBuffer()
    return XLSX.read(buf, { type: 'array' })
  }

  const [catWb, kwWb] = await Promise.all([
    readWorkbook(categoryFile),
    readWorkbook(keywordFile),
  ])

  // ì¹´íê³ ë¦¬ íì¼
  const catDb = parseDashboard(
    XLSX.utils.sheet_to_json(catWb.Sheets['dashBoard'] || catWb.Sheets[catWb.SheetNames[0]])
  )
  const catProducts = parseProducts(
    XLSX.utils.sheet_to_json(catWb.Sheets['shoppingList'] || catWb.Sheets[catWb.SheetNames[1]])
  )

  // í¤ìë íì¼
  const kwDb = parseDashboard(
    XLSX.utils.sheet_to_json(kwWb.Sheets['dashBoard'] || kwWb.Sheets[kwWb.SheetNames[0]])
  )
  const kwProducts = parseProducts(
    XLSX.utils.sheet_to_json(kwWb.Sheets['shoppingList'] || kwWb.Sheets[kwWb.SheetNames[1]])
  )

  // ë¡ì¼ ê³ì´ ë¹ì¨ ê³ì°
  const rocketRatio = (() => {
    const r = toNum(kwDb['ë¡ì¼ë°°ì¡ë¹ì¨'] ?? kwDb['ë¡ì¼ë°°ì¡ ë¹ì¨'])
    const sr = toNum(kwDb['íë§¤ìë¡ì¼ë°°ì¡ë¹ì¨'] ?? kwDb['íë§¤ìë¡ì¼ ë°°ì¡ë¹ì¨'])
    if (r + sr > 0) return r + sr
    // shoppingListìì ì§ì  ê³ì°
    const total = kwProducts.length
    if (total === 0) return 0
    const rocketCount = kwProducts.filter(p =>
      p.delivery === 'ë¡ì¼ë°°ì¡' || p.delivery === 'íë§¤ìë¡ì¼'
    ).length
    return Math.round((rocketCount / total) * 100 * 10) / 10
  })()

  // ìì 5ê° íê·  ì íì¨
  const top5AvgConversion = (() => {
    const valid = kwProducts.slice(0, 10).filter(p => p.conversion !== null)
    if (valid.length === 0) return 0
    const top5 = valid.slice(0, 5)
    const sum = top5.reduce((a, b) => a + (b.conversion ?? 0), 0)
    return Math.round((sum / top5.length) * 100) / 100
  })()

  // ì¸ê¸°í¤ìë â shoppingList ìíëª ë¹ë ë¶ìì¼ë¡ ëì²´
  const popularKeywords: { kw: string; vol: number }[] = (() => {
    // kwDbìì ê²ìë ê´ë ¨ ì»¬ë¼ ìì¼ë©´ ì¶ì¶
    const result: { kw: string; vol: number }[] = []
    const mainKw = String(kwDb['í¤ìë'] || '').trim()
    const mainVol = toNum(kwDb['ì ê²ìë'])
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
      categoryMonthlySales: toNum(catDb['ìê° 
