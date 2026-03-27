// ìë¬ë¼ì´í íì¼ìì íì±ë ë°ì´í°
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
  // ì¹´íê³ ë¦¬ íì¼
  categoryDashboard: DashboardRow
  categoryProducts: ProductRow[]
  // í¤ìë íì¼
  keywordDashboard: DashboardRow
  keywordProducts: ProductRow[]
  // íì¼ëª (ì¹´íê³ ë¦¬ ì¶ì¶ì©)
  categoryFilename: string
  keywordFilename: string
  // í¸ì ìì¹
  stats: {
    categoryMonthlySales: number      // ì¹´íê³ ë¦¬ ì ë§¤ì¶
    categoryMonthlyQty: number        // ì¹´íê³ ë¦¬ ì íë§¤ë
    keywordMonthlySales: number       // í¤ìë ì ë§¤ì¶
    keywordSearch: number             // ì ê²ìë
    keywordSearchLastYear: number     // ìë ì´ ê²ìë
    top1SaturationSales: number       // 1ì ë§¤ì¶ í¬íë
    top3SaturationSales: number       // 1-3ì ë§¤ì¶ í¬íë
    top3SaturationReview: number      // 1-3ì ë¦¬ë·° í¬íë
    rocketRatio: number               // ë¡ì¼ ê³ì´ ë°°ì¡ ë¹ì¨
    top5AvgConversion: number         // ìì 5ê° íê·  ì íì¨
    popularKeywords: { kw: string; vol: number }[]   // ì¸ê¸°í¤ìë
    autocompleteKeywords: string[]    // ìëìì± í¤ìë
  }
}

// ë¤ì´ë² API + ìë¬ë¼ì´í ê²ìë ì¡°í©
export interface KeywordRow {
  keyword: string
  naverSearchPC: number | null
  naverSearchMobile: number | null
  naverSearchTotal: number | null
  coupangSearch: number | null       // ìë¬ë¼ì´íìì ì½ì ì¿ í¡ ê²ìë
  productCount: number               // ìíëª í¬í¨ ì í ì
  competition: 'low' | 'medium' | 'high'
  source: 'sellerlife' | 'naver'
}

// ê¸°í í¤ìë ì¤ì½ì´ë§
export interface ScoredKeyword {
  keyword: string
  searchVolume: number               // ê²ìë (ë¤ì´ë² or ì¿ í¡)
  productCount: number               // ê²½ì ì í ì
  saturationScore: number            // í¬íë (ë®ììë¡ ì¢ì)
  opportunityScore: number           // ê¸°í ì ì (ëììë¡ ì¢ì, 0~100)
  grade: 'S' | 'A' | 'B' | 'C'
  reason: string                     // ì ë³ ì´ì 
}
