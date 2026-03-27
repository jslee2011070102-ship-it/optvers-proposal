import type { KeywordRow, ScoredKeyword, ParsedData } from './types'

// ìíëªìì í´ë¹ í¤ìë í¬í¨ ì í ì ì¹´ì´í¸
export function countProductsWithKeyword(keyword: string, products: { name: string }[]): number {
  const kw = keyword.toLowerCase().replace(/\s/g, '')
  return products.filter(p => p.name.toLowerCase().replace(/\s/g, '').includes(kw)).length
}

// ê¸°í ì ì ê³ì° (0~100)
// ê²ìë ëê³  ìí ì ì ììë¡ ì ì ëì
export function calcOpportunityScore(
  searchVolume: number,
  productCount: number,
  totalProducts: number
): number {
  if (searchVolume === 0) return 0

  // ê²ìë ì ì (0~50ì )
  const searchScore = Math.min(50, Math.log10(searchVolume + 1) * 14)

  // ê²½ì ë®ì ì ì (0~50ì )
  const competitionRatio = productCount / Math.max(totalProducts, 1)
  const competitionScore = Math.max(0, 50 - competitionRatio * 200)

  return Math.round(searchScore + competitionScore)
}

// ë±ê¸ íì 
export function gradeScore(score: number): 'S' | 'A' | 'B' | 'C' {
  if (score >= 75) return 'S'
  if (score >= 55) return 'A'
  if (score >= 35) return 'B'
  return 'C'
}

// ì ë³ ì´ì  ìì±
export function makeReason(
  keyword: string,
  searchVolume: number,
  productCount: number,
  grade: 'S' | 'A' | 'B' | 'C'
): string {
  const reasons: string[] = []
  if (searchVolume >= 10000) reasons.push(`ê²ìë ${searchVolume.toLocaleString()}íë¡ ë§¤ì° ëì`)
  else if (searchVolume >= 5000) reasons.push(`ê²ìë ${searchVolume.toLocaleString()}í`)
  else reasons.push(`ê²ìë ${searchVolume.toLocaleString()}í`)

  if (productCount === 0) reasons.push('ìíëª ëªì ì í ìì (ìì  ê³µë°±)')
  else if (productCount <= 3) reasons.push(`ìíëª í¬í¨ ${productCount}ê° (í¤ìë ê³µë°±)`)
  else reasons.push(`ìíëª í¬í¨ ${productCount}ê°`)

  if (grade === 'S') reasons.push('â ì¦ì ì ì  ê°ë¥')
  else if (grade === 'A') reasons.push('â ì§ì ì°ì ê°ë¥')

  return reasons.join(' Â· ')
}

// ì ì²´ ì¤ì½ì´ë§ ì¤í
export function scoreKeywords(
  keywords: KeywordRow[],
  parsedData: ParsedData
): ScoredKeyword[] {
  const totalProducts = parsedData.keywordProducts.length

  return keywords
    .map(kw => {
      const searchVolume = kw.naverSearchTotal ?? kw.coupangSearch ?? 0
      const productCount = kw.productCount
      const opportunityScore = calcOpportunityScore(searchVolume, productCount, totalProducts)
      const grade = gradeScore(opportunityScore)
      const saturationScore = totalProducts > 0
        ? Math.round((productCount / totalProducts) * 100)
        : 0

      return {
        keyword: kw.keyword,
        searchVolume,
        productCount,
        saturationScore,
        opportunityScore,
        grade,
        reason: makeReason(kw.keyword, searchVolume, productCount, grade),
      }
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
}
