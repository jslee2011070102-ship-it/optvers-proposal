'use client'

import { useState, useRef } from 'react'
import { parseSellerlifeFiles } from '@/lib/parser'
import type { ParsedData } from '@/lib/types'

interface Props {
  onComplete: (data: ParsedData) => void
}

export default function StepUpload({ onComplete }: Props) {
  const [catFile, setCatFile] = useState<File | null>(null)
  const [kwFile, setKwFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [catDrag, setCatDrag] = useState(false)
  const [kwDrag, setKwDrag] = useState(false)

  const catRef = useRef<HTMLInputElement>(null)
  const kwRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent, type: 'cat' | 'kw') => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (!f || (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls'))) return
    if (type === 'cat') { setCatFile(f); setCatDrag(false) }
    else { setKwFile(f); setKwDrag(false) }
  }

  const handleAnalyze = async () => {
    if (!catFile || !kwFile) return
    setLoading(true)
    setError('')
    try {
      const data = await parseSellerlifeFiles(catFile, kwFile)
      onComplete(data)
    } catch (e) {
      setError(`파싱 오류: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--blue)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
          STEP 1 · 파일 업로드
        </div>
        <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, letterSpacing: '-.03em', marginBottom: '8px' }}>
          셀러라이프 파일 2개를 올려주세요
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.7 }}>
          셀러라이프에서 다운받은 카테고리 분석 파일과 키워드 분석 파일을 드래그하거나 클릭해서 업로드하세요.
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        {/* 통합 파일 업로드 */}
        <div
          className={`drop-zone ${catFile && kwFile ? 'done' : ''} ${catDrag || kwDrag ? 'drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setCatDrag(true) }}
          onDragLeave={() => setCatDrag(false)}
          onDrop={e => {
            e.preventDefault()
            const files = Array.from(e.dataTransfer.files)
            files.forEach(f => {
              if (f.name.includes('category')) setCatFile(f)
              else if (f.name.includes('keyword')) setKwFile(f)
            })
            setCatDrag(false)
            setKwDrag(false)
          }}
          onClick={() => catRef.current?.click()}
          style={{ textAlign: 'center', padding: '40px 20px' }}
        >
          <input
            ref={catRef} type="file" accept=".xlsx,.xls"
            style={{ display: 'none' }}
            multiple
            onChange={e => {
              const files = Array.from(e.target.files || [])
              files.forEach(f => {
                if (f.name.includes('category')) setCatFile(f)
                else if (f.name.includes('keyword')) setKwFile(f)
              })
            }}
          />
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>
            {catFile && kwFile ? '✅' : '📁'}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: 'var(--text2)' }}>
            셀러라이프 파일 2개를 여기에 드래그하세요
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '12px' }}>
            또는 클릭해서 선택
          </div>
          {catFile && (
            <div style={{ fontSize: '12px', color: 'var(--green)', marginBottom: '4px' }}>
              ✓ 카테고리: {catFile.name}
            </div>
          )}
          {kwFile && (
            <div style={{ fontSize: '12px', color: 'var(--green)' }}>
              ✓ 키워드: {kwFile.name}
            </div>
          )}
          {(!catFile || !kwFile) && (
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '12px' }}>
              필요: sellerlife-coupang-category_*.xlsx, sellerlife-coupang-keyword_*.xlsx
            </div>
          )}
        </div>
      </div>

      {/* 셀러라이프 사용 안내 */}
      <div className="card" style={{ marginBottom: '24px', background: '#EEF4FF', border: '1px solid #BFDBFE' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--blue)', marginBottom: '10px' }}>
          📌 셀러라이프 파일 받는 방법
        </div>
        <ol style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 2, paddingLeft: '16px' }}>
          <li><a href="https://www.sellerlife.co.kr" target="_blank" style={{ color: 'var(--blue)' }}>sellerlife.co.kr</a> 접속 → 쿠팡 분석</li>
          <li>카테고리 분석 → 원하는 카테고리 선택 → 엑셀 다운로드</li>
          <li>키워드 분석 → 원하는 키워드 입력 → 엑셀 다운로드</li>
          <li>위 두 파일을 여기에 업로드</li>
        </ol>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '13px', color: '#DC2626', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <button
        className="btn-primary"
        style={{ width: '100%', justifyContent: 'center' }}
        disabled={!catFile || !kwFile || loading}
        onClick={handleAnalyze}
      >
        {loading ? '⏳ 파일 분석 중...' : '파일 분석하기 →'}
      </button>
    </div>
  )
}
