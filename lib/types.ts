// 셀러라이프 파일에서 파싱된 데이터
export interface DashboardRow {
  [key: string]: string | number | null
}

export interface ProductRow {
  rank: number
  name: string
  delivery: string
  price: number
  reviews: number
  monthlyQty: number | null
  monthlySales: number | null
  conversion: number | null
}

export interface ParsedData {
  // 카테고리 파일
  categoryDashboard: DashboardRow
  categoryProducts: ProductRow[]
  // 키워드 파일
  keywordDashboard: DashboardRow
  keywordProducts: ProductRow[]
  // 파일명 (카테고리 추출용)
  categoryFilename: string
  keywordFilename: string
  // 편의 수치
  stats: {
    categoryMonthlySales: number      // 카테고리 월 매출
    categoryMonthlyQty: number        // 카테고리 월 판매량
    keywordMonthlySales: number       // 키워드 월 매출
    keywordSearch: number             // 월 검색량
    keywordSearchLastYear: number     // 작년 총 검색량
    top1SaturationSales: number       // 1위 매출 포화도
    top3SaturationSales: number       // 1-3위 매출 포화도
    top3SaturationReview: number      // 1-3위 리뷰 포화도
    rocketRatio: number               // 로켓 계열 배송 비율
    top5AvgConversion: number         // 상위 5개 평균 전환율
    popularKeywords: { kw: string; vol: number }[]   // 인기키워드
    autocompleteKeywords: string[]    // 자동완성 키워드
  }
}

// 네이버 API + 셀러라이프 검색량 조합
export interface KeywordRow {
  keyword: string
  naverSearchPC: number | null
  naverSearchMobile: number | null
  naverSearchTotal: number | null
  coupangSearch: number | null       // 셀러라이프에서 읽은 쿠팡 검색량
  productCount: number               // 상품명 포함 제품 수
  competition: 'low' | 'medium' | 'high'
  source: 'sellerlife' | 'naver'
}

// 기회 키워드 스코어링
export interface ScoredKeyword {
  keyword: string
  searchVolume: number               // 검색량 (네이버 or 쿠팡)
  productCount: number               // 경쟁 제품 수
  saturationScore: number            // 포화도 (낮을수록 좋음)
  opportunityScore: number           // 기회 점수 (높을수록 좋음, 0~100)
  grade: 'S' | 'A' | 'B' | 'C'
  reason: string                     // 선별 이유
}
