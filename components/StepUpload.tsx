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
      setError(`íì± ì¤ë¥: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--blue)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
          STEP 1 Â· íì¼ ìë¡ë
        </div>
        <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, letterSpacing: '-.03em', marginBottom: '8px' }}>
          ìë¬ë¼ì´í íì¼ 2ê°ë¥¼ ì¬ë ¤ì£¼ì¸ì
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.7 }}>
          ìë¬ë¼ì´íìì ë¤ì´ë°ì ì¹´íê³ ë¦¬ ë¶ì íì¼ê³¼ í¤ìë ë¶ì íì¼ì ëëê·¸íê±°ë í´ë¦­í´ì ìë¡ëíì¸ì.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* ì¹´íê³ ë¦¬ íì¼ */}
        <div
          className={`drop-zone ${catFile ? 'done' : ''} ${catDrag ? 'drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setCatDrag(true) }}
          onDragLeave={() => setCatDrag(false)}
          onDrop={e => handleDrop(e, 'cat')}
          onClick={() => catRef.current?.click()}
        >
          <input
            ref={catRef} type="file" accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) setCatFile(f) }}
          />
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>
            {catFile ? 'â' : 'ð'}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px', color: 'var(--text2)' }}>
            ì¹´íê³ ë¦¬ ë¶ì íì¼
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '8px' }}>
            sellerlife-coupang-category_*.xlsx
          </div>
          {catFile && (
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--green)', wordBreak: 'break-all' }}>
              {catFile.name}
            </div>
          )}
        </div>

        {/* í¤ìë íì¼ */}
        <div
          className={`drop-zone ${kwFile ? 'done' : ''} ${kwDrag ? 'drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setKwDrag(true) }}
          onDragLeave={() => setKwDrag(false)}
          onDrop={e => handleDrop(e, 'kw')}
          onClick={() => kwRef.current?.click()}
        >
          <input
            ref={kwRef} type="file" accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) setKwFile(f) }}
          />
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>
            {kwFile ? 'â' : 'ð'}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px', color: 'var(--text2)' }}>
            í¤ìë ë¶ì íì¼
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '8px' }}>
            sellerlife-coupang-keyword_*.xlsx
          </div>
          {kwFile && (
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--green)', wordBreak: 'break-all' }}>
              {kwFile.name}
            </div>
          )}
        </div>
      </div>

      {/* ìë¬ë¼ì´í ì¬ì© ìë´ */}
      <div className="card" style={{ marginBottom: '24px', background: '#EEF4FF', border: '1px solid #BFDBFE' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--blue)', marginBottom: '10px' }}>
          ð ìë¬ë¼ì´í íì¼ ë°ë ë°©ë²
        </div>
        <ol style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 2, paddingLeft: '16px' }}>
          <li><a href="https://www.sellerlife.co.kr" target="_blank" style={{ color: 'var(--blue)' }}>sellerlife.co.kr</a> ì ì â ì¿ í¡ ë¶ì</li>
          <li>ì¹´íê³ ë¦¬ ë¶ì â ìíë ì¹´íê³ ë¦¬ ì í â ìì ë¤ì´ë¡ë</li>
          <li>í¤ìë ë¶ì â ìíë í¤ìë ìë ¥ â ìì ë¤ì´ë¡ë</li>
          <li>ì ë íì¼ì ì¬ê¸°ì ìë¡ë</li>
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
        {loading ? 'â³ íì¼ ë¶ì ì¤...' : 'íì¼ ë¶ìíê¸° â'}
      </button>
    </div>
  )
}
