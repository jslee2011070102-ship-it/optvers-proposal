'use client'

import { useState } from 'react'
import StepUpload from '@/components/StepUpload'
import StepKeyword from '@/components/StepKeyword'
import StepScore from '@/components/StepScore'
import StepProposal from '@/components/StepProposal'
import type { ParsedData, KeywordRow, ScoredKeyword } from '@/lib/types'

const STEPS = ['파일 업로드', '키워드 분석', '기회 선별', '제안서 생성']

export default function Home() {
  const [step, setStep] = useState(0)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [keywords, setKeywords] = useState<KeywordRow[]>([])
  const [scored, setScored] = useState<ScoredKeyword[]>([])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* 헤더 */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(248,247,244,.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: '56px'
      }}>
        <div style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '-.02em' }}>
          optvers<span style={{ color: 'var(--blue)' }}>.ai</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
          쿠팡 신제품 제안서 생성기
        </div>
      </header>

      <main style={{ paddingTop: '56px' }}>
        {/* 스텝 인디케이터 */}
        <div style={{
          maxWidth: '640px', margin: '0 auto',
          padding: '40px 24px 0'
        }}>
          <div className="step-indicator">
            {STEPS.map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div className={`step-dot ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: i === step ? 'var(--blue)' : i < step ? 'var(--green)' : 'var(--text3)', whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`step-line ${i < step ? 'done' : ''}`} style={{ marginBottom: '20px', marginLeft: '4px', marginRight: '4px' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 콘텐츠 */}
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px 80px' }}>
          {step === 0 && (
            <StepUpload
              onComplete={(data) => {
                setParsedData(data)
                setStep(1)
              }}
            />
          )}
          {step === 1 && parsedData && (
            <StepKeyword
              parsedData={parsedData}
              onComplete={(kws) => {
                setKeywords(kws)
                setStep(2)
              }}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && parsedData && (
            <StepScore
              parsedData={parsedData}
              keywords={keywords}
              onComplete={(s) => {
                setScored(s)
                setStep(3)
              }}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && parsedData && (
            <StepProposal
              parsedData={parsedData}
              keywords={keywords}
              scored={scored}
              onBack={() => setStep(2)}
            />
          )}
        </div>
      </main>
    </div>
  )
}
