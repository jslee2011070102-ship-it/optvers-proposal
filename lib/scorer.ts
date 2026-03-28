import type { KeywordRow, ScoredKeyword, ParsedData } from './types'

// 상품명에서 해당 키워드 포함 제품 수 카운트
export function countProductsWithKeyword(keyword: string, products: { name: string }[]): number {
  const kw = keyword.toLowerCase().replace(/\s/g, '')
  return products.filter(p => p.name.toLowerCase().replace(/\s/g, '').includes(kw)).length
}

// 기회 점수 계산 (0~100)
// 검색량 높고 상품 수 적을수록 점수 높음
export function calcOpportunityScore(
  searchVolume: number,
  productCount: number,
  totalProducts: number
): number {
  if (searchVolume === 0) return 0

  // 검색량 점수 (0~50점)
  const searchScore = Math.min(50, Math.log10(searchVolume + 1) * 14)

  // 경쟁 낮음 점수 (0~50점)
  const competitionRatio = productCount / Math.max(totalProducts, 1)
  const competitionScore = Math.max(0, 50 - competitionRatio * 200)

  return Math.round(searchScore + competitionScore)
}

// 등급 판정
export function gradeScore(score: number): 'S' | 'A' | 'B' | 'C' {
  if (score >= 75) return 'S'
  if (score >= 55) return 'A'
  if (score >= 35) return 'B'
  return 'C'
}

// 선별 이유 생성
export function makeReason(
  keyword: string,
  searchVolume: number,
  productCount: number,
  grade: 'S' | 'A' | 'B' | 'C'
): string {
  const reasons: string[] = []
  if (searchVolume >= 10000) reasons.push(`검색량 ${searchVolume.toLocaleString()}회로 매우 높음`)
  else if (searchVolume >= 5000) reasons.push(`검색량 ${searchVolume.toLocaleString()}회`)
  else reasons.push(`검색량 ${searchVolume.toLocaleString()}회`)

  if (productCount === 0) reasons.push('상품명 명시 제품 없음 (완전 공백)')
  else if (productCount <= 3) reasons.push(`상품명 포함 ${productCount}개 (키워드 공백)`)
  else reasons.push(`상품명 포함 ${productCount}개`)

  if (grade === 'S') reasons.push('→ 즉시 선점 가능')
  else if (grade === 'A') reasons.push('→ 진입 우위 가능')

  return reasons.join(' · ')
}

// 전체 스코어링 실행
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
