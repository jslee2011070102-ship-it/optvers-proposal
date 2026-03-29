// 예시 제안서 CSS — 이 파일을 수정하면 모든 슬라이드 디자인이 바뀝니다
export const SLIDE_CSS = `
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
:root{
  --bg:#F8F7F4;--surface:#FFFFFF;--surface2:#F2F1EE;--border:#E8E6E0;
  --text:#191917;--text2:#5C5B57;--text3:#9C9A94;
  --blue:#3B82F6;--blue-bg:#EEF4FF;
  --green:#16A34A;--green-bg:#ECFDF5;
  --yellow:#D97706;--yellow-bg:#FFFBEB;
  --red:#DC2626;--red-bg:#FEF2F2;
  --sans:'Noto Sans KR',sans-serif;
  --radius:12px;--radius-sm:8px;
  --shadow:0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
  --shadow-md:0 4px 12px rgba(0,0,0,.08),0 2px 4px rgba(0,0,0,.04);
}
body{background:var(--bg);color:var(--text);font-family:var(--sans);-webkit-font-smoothing:antialiased;font-size:15px;line-height:1.6;}
.sec-label{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--blue);letter-spacing:.04em;text-transform:uppercase;margin-bottom:16px;}
.sec-label::before{content:'';width:16px;height:2px;background:var(--blue);display:block;}
.heading{font-size:clamp(26px,3.5vw,38px);font-weight:800;line-height:1.2;letter-spacing:-.03em;color:var(--text);margin-bottom:10px;}
.heading .hi{color:var(--blue);}.heading .hi-g{color:var(--green);}
.subhead{font-size:15px;color:var(--text2);line-height:1.7;margin-bottom:36px;max-width:600px;}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;box-shadow:var(--shadow);}
.card+.card{margin-top:12px;}
.kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:32px;}
.kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px 22px;box-shadow:var(--shadow);}
.kpi-label{font-size:12px;font-weight:600;color:var(--text3);margin-bottom:8px;letter-spacing:.02em;}
.kpi-val{font-size:clamp(22px,2.5vw,30px);font-weight:800;color:var(--text);letter-spacing:-.03em;line-height:1.1;margin-bottom:4px;}
.kpi-val.blue{color:var(--blue);}.kpi-val.green{color:var(--green);}
.kpi-sub{font-size:12px;color:var(--text3);}
.div{border:none;border-top:1px solid var(--border);margin:32px 0;}
.tbl-wrap{border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow);}
table{width:100%;border-collapse:collapse;background:var(--surface);}
thead th{background:var(--surface2);color:var(--text2);font-size:11px;font-weight:700;padding:10px 14px;text-align:left;letter-spacing:.04em;border-bottom:1px solid var(--border);white-space:nowrap;}
tbody td{padding:11px 14px;border-bottom:1px solid var(--border);font-size:13px;color:var(--text);vertical-align:middle;}
tbody tr:last-child td{border-bottom:none;}
tbody tr:hover td{background:#FAFAF8;}
.tr-hl-y td{background:var(--yellow-bg);}.tr-hl-g td{background:var(--green-bg);}.tr-hl-b td{background:var(--blue-bg);}.tr-hl-r td{background:var(--red-bg);}
td.mono,th.mono{font-variant-numeric:tabular-nums;font-weight:600;}
.rk{display:inline-block;width:22px;height:22px;border-radius:6px;background:var(--surface2);color:var(--text3);font-size:11px;font-weight:700;text-align:center;line-height:22px;}
.rk.top{background:var(--text);color:#fff;}
.up{color:var(--green);font-size:12px;font-weight:700;}.dn{color:var(--red);font-size:12px;font-weight:700;}
.pname{font-size:12px;color:var(--text);line-height:1.5;max-width:300px;}
.badge{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;margin-left:6px;vertical-align:middle;white-space:nowrap;}
.badge.blue{background:var(--blue-bg);color:var(--blue);}.badge.green{background:var(--green-bg);color:var(--green);}
.badge.yellow{background:var(--yellow-bg);color:var(--yellow);}.badge.red{background:var(--red-bg);color:var(--red);}
.chip{display:inline-flex;align-items:center;padding:5px 12px;border-radius:20px;border:1.5px solid var(--border);background:var(--surface);font-size:13px;font-weight:600;color:var(--text2);margin:3px;}
.chip.blue{background:var(--blue-bg);border-color:var(--blue);color:var(--blue);}
.chip.green{background:var(--green-bg);border-color:var(--green);color:var(--green);}
.chip.yellow{background:var(--yellow-bg);border-color:var(--yellow);color:var(--yellow);}
.callout{border-radius:var(--radius-sm);padding:14px 18px;font-size:13px;line-height:1.7;margin-top:12px;}
.callout.blue{background:var(--blue-bg);border-left:3px solid var(--blue);color:#1E3A6E;}
.callout.green{background:var(--green-bg);border-left:3px solid var(--green);color:#14532D;}
.callout.yellow{background:var(--yellow-bg);border-left:3px solid var(--yellow);color:#78350F;}
.callout.red{background:var(--red-bg);border-left:3px solid var(--red);color:#7F1D1D;}
.callout strong{font-weight:700;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
.stat-list{display:flex;flex-direction:column;gap:10px;margin-top:16px;}
.stat-row{display:flex;align-items:center;gap:10px;}
.stat-name{font-size:12px;font-weight:600;color:var(--text2);min-width:120px;}
.stat-bar{flex:1;height:8px;background:var(--surface2);border-radius:4px;overflow:hidden;}
.stat-fill{height:100%;border-radius:4px;background:var(--blue);}
.stat-fill.green{background:var(--green);}.stat-fill.yellow{background:#F59E0B;}.stat-fill.gray{background:#C4C2BC;}
.stat-val{font-size:12px;font-weight:700;color:var(--text);min-width:60px;text-align:right;}
.num-card{display:flex;gap:18px;align-items:flex-start;}
.num-badge{flex-shrink:0;width:36px;height:36px;border-radius:10px;background:var(--text);color:#fff;font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;}
.num-badge.blue{background:var(--blue);}.num-badge.green{background:var(--green);}
.num-body h4{font-size:16px;font-weight:700;margin-bottom:4px;}
.num-body p{font-size:13px;color:var(--text2);line-height:1.7;}
.logic{display:flex;flex-direction:column;gap:0;}
.logic-item{display:flex;gap:0;border:1px solid var(--border);margin-top:-1px;}
.logic-item:first-child{border-radius:var(--radius) var(--radius) 0 0;}
.logic-item:last-child{border-radius:0 0 var(--radius) var(--radius);}
.logic-label{width:52px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:var(--text2);background:var(--surface2);border-right:1px solid var(--border);}
.logic-label.blue{background:var(--blue-bg);color:var(--blue);}.logic-label.green{background:var(--green-bg);color:var(--green);}
.logic-body{padding:16px 20px;background:var(--surface);}
.logic-body h4{font-size:14px;font-weight:700;margin-bottom:4px;}
.logic-body p{font-size:13px;color:var(--text2);line-height:1.6;}
.scenarios{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
.scenario{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:22px;}
.scenario.mid{background:var(--yellow-bg);border-color:#FDE68A;}
.sc-label{font-size:11px;font-weight:700;color:var(--text3);letter-spacing:.04em;text-transform:uppercase;margin-bottom:12px;}
.sc-pct{font-size:40px;font-weight:800;letter-spacing:-.03em;line-height:1;margin-bottom:6px;color:var(--text3);}
.scenario.mid .sc-pct{color:var(--yellow);}
.sc-won{font-size:20px;font-weight:800;letter-spacing:-.02em;margin-bottom:4px;}
.sc-sub{font-size:12px;color:var(--text3);}
.steps{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
.step{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;}
.step-n{font-size:28px;font-weight:800;color:var(--border);margin-bottom:10px;line-height:1;}
.step.on .step-n{color:var(--blue);}
.step h4{font-size:14px;font-weight:700;margin-bottom:6px;}
.step p{font-size:12px;color:var(--text2);line-height:1.7;}
.prod-card{background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius);padding:24px;}
.prod-card.featured{border-color:var(--green);background:var(--green-bg);}
.prod-tag{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:var(--green);color:#fff;margin-bottom:14px;}
.prod-name{font-size:22px;font-weight:800;letter-spacing:-.03em;line-height:1.3;margin-bottom:18px;}
.prod-rows{display:flex;flex-direction:column;gap:0;border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;background:var(--surface);}
.prod-row{display:flex;border-bottom:1px solid var(--border);}
.prod-row:last-child{border-bottom:none;}
.prod-k{width:80px;flex-shrink:0;padding:10px 14px;font-size:11px;font-weight:700;color:var(--text3);background:var(--surface2);border-right:1px solid var(--border);}
.prod-v{padding:10px 14px;font-size:13px;font-weight:600;color:var(--text);}
.cover-kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:40px;}
.ckpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:22px 24px;box-shadow:var(--shadow);}
.ckpi-l{font-size:11px;font-weight:600;color:var(--text3);margin-bottom:8px;letter-spacing:.03em;}
.ckpi-v{font-size:clamp(18px,2vw,26px);font-weight:800;color:var(--text);margin-bottom:4px;letter-spacing:-.02em;}
.ckpi-v.blue{color:var(--blue);}.ckpi-v.green{color:var(--green);}
.ckpi-s{font-size:12px;color:var(--text3);}
.cover-tag{display:inline-flex;align-items:center;gap:8px;margin-top:24px;padding:8px 16px;background:var(--yellow-bg);border:1px solid #FDE68A;border-radius:20px;font-size:13px;font-weight:600;color:var(--text2);}
.cover-tag span{color:var(--yellow);font-weight:700;}
.key-row{background:var(--blue-bg) !important;}
.slide-inner{max-width:900px;margin:0 auto;padding:40px 32px;}
@media(max-width:760px){
  .kpi-row,.g2,.g3,.scenarios,.steps{grid-template-columns:1fr;}
  .cover-kpi{grid-template-columns:1fr;}
  .slide-inner{padding:24px 20px;}
}
`

// 슬라이드 HTML에 사용할 수 있는 CSS 클래스 목록 (Claude 프롬프트용)
export const CLASS_GUIDE = `
═══ 사용 가능한 CSS 클래스 (인라인 스타일 금지 — 반드시 클래스 사용) ═══

레이아웃:
  .slide-inner   — 슬라이드 최대폭 900px 컨테이너 (최상위 래퍼로 사용)
  .g2            — 2열 그리드 (gap:12px)
  .g3            — 3열 그리드 (gap:12px)
  .div           — 구분선 (margin:32px 0)

타이포그래피:
  .sec-label     — 슬라이드 번호/제목 레이블 (파랑, 앞에 선 장식)
  .heading       — 대제목 (38px bold)
  .heading .hi   — 파랑 강조 텍스트
  .heading .hi-g — 초록 강조 텍스트
  .subhead       — 소제목/설명 (15px)

카드·KPI:
  .card          — 기본 카드 (흰 배경, 테두리, 그림자)
  .kpi-row       — 3열 KPI 그리드 (margin-bottom:32px)
  .kpi           — 개별 KPI 카드
  .kpi-label     — KPI 라벨 (회색 소문자)
  .kpi-val       — KPI 수치 (큰 볼드)
  .kpi-val.blue  — 파랑 수치
  .kpi-val.green — 초록 수치
  .kpi-sub       — KPI 보조 설명

커버:
  .cover-kpi     — 커버 KPI 그리드
  .ckpi          — 커버 KPI 카드
  .ckpi-l / .ckpi-v / .ckpi-s — 커버 KPI 라벨/수치/설명
  .cover-tag     — 커버 하단 태그 칩

테이블:
  .tbl-wrap      — 테이블 외부 래퍼 (radius + shadow)
  table/thead th/tbody td — 자동 스타일
  .tr-hl-y / .tr-hl-g / .tr-hl-b / .tr-hl-r — 행 하이라이트 (노랑/초록/파랑/빨강)
  .key-row       — 파랑 강조 행
  .rk / .rk.top  — 순위 배지 (top=검정)
  .pname         — 상품명 셀
  .mono          — 숫자 셀
  .up / .dn      — 상승/하락 표시

배지·칩:
  .badge.blue / .green / .yellow / .red
  .chip / .chip.blue / .green / .yellow

콜아웃 (인사이트 박스):
  .callout.blue / .green / .yellow / .red

통계 바:
  .stat-list / .stat-row / .stat-name / .stat-bar
  .stat-fill / .stat-fill.green / .yellow / .gray
  .stat-val

번호 카드:
  .num-card / .num-badge / .num-badge.blue / .green
  .num-body h4 / .num-body p

로직 단계:
  .logic / .logic-item / .logic-label / .logic-label.blue / .green
  .logic-body h4 / .logic-body p

매출 시나리오:
  .scenarios / .scenario / .scenario.mid (노랑 강조)
  .sc-label / .sc-pct / .sc-won / .sc-sub

스텝 카드:
  .steps / .step / .step.on / .step-n / .step h4 / .step p

제품 카드:
  .prod-card / .prod-card.featured (초록 강조)
  .prod-tag / .prod-name
  .prod-rows / .prod-row / .prod-k / .prod-v
`
