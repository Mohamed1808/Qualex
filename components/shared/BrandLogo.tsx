'use client'

import { useState } from 'react'

/**
 * Drive Finance brand logo.
 *
 * Drop the real logo file into /public/brand/ as `drive-logo.svg`
 * (preferred) or `drive-logo.png`. Update LOGO_SRC if you use a
 * different name/extension. Until the file exists, a clean indigo
 * "drive" wordmark fallback renders automatically.
 */
const LOGO_SRC = '/brand/drive-logo.svg'

const BRAND = '#5757e6'

interface BrandLogoProps {
  /** 'mark' = compact symbol only; 'full' = full logo/wordmark */
  variant?: 'mark' | 'full'
  /** pixel height of the logo */
  height?: number
  className?: string
}

export default function BrandLogo({ variant = 'full', height = 28, className = '' }: BrandLogoProps) {
  const [failed, setFailed] = useState(false)

  if (!failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={LOGO_SRC}
        alt="Drive Finance"
        height={height}
        style={{ height, width: 'auto' }}
        className={className}
        onError={() => setFailed(true)}
      />
    )
  }

  // Fallback: indigo wordmark / mark
  if (variant === 'mark') {
    return (
      <div
        className={`flex items-center justify-center rounded-lg ${className}`}
        style={{ width: height, height, backgroundColor: BRAND }}
        aria-label="Drive Finance"
      >
        <span className="text-white font-bold" style={{ fontSize: height * 0.5 }}>
          d
        </span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`} aria-label="Drive Finance">
      <div
        className="flex items-center justify-center rounded-lg"
        style={{ width: height, height, backgroundColor: BRAND }}
      >
        <span className="text-white font-bold" style={{ fontSize: height * 0.5 }}>
          d
        </span>
      </div>
      <span
        className="font-bold tracking-tight lowercase"
        style={{ fontSize: height * 0.62, color: BRAND }}
      >
        drive
        <span className="text-white">finance</span>
      </span>
    </div>
  )
}
