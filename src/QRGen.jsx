// src/QRGen.jsx
//
// This page is for YOU (the merchant) — not the payer.
// Visit yoursite.vercel.app?qr=1 to see and download the QR codes.
//
// The QR encodes Trust Wallet deeplinks:
//   BSC:  https://link.trustwallet.com/open_url?coin_id=20000714&url=YOUR_SITE
//   ETH:  https://link.trustwallet.com/open_url?coin_id=60&url=YOUR_SITE
//
// When a payer scans this QR inside Trust Wallet's scanner,
// Trust Wallet opens YOUR_SITE in its built-in DApp browser directly.

import { useState, useEffect } from 'react'
import { CHAINS } from './config.js'

// Trust Wallet coin IDs
const TW_COIN_IDS = {
  bsc:      '20000714',
  ethereum: '60',
}

async function generateQR(url) {
  // Use the qrcode library via CDN since we removed it from package.json
  // We'll use a free QR API instead — no library needed
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}&bgcolor=05080f&color=4fffb0&margin=2`
}

export default function QRGen() {
  const [chain, setChain]     = useState('bsc')
  const [qrUrl, setQrUrl]     = useState('')
  const [deeplink, setDeeplink] = useState('')
  const [copied, setCopied]   = useState(false)

  const siteUrl = window.location.origin

  useEffect(() => {
    const coinId = TW_COIN_IDS[chain]
    const payUrl = `${siteUrl}?chain=${chain}`
    const link   = `https://link.trustwallet.com/open_url?coin_id=${coinId}&url=${encodeURIComponent(payUrl)}`
    setDeeplink(link)
    generateQR(link).then(setQrUrl)
  }, [chain, siteUrl])

  const copyLink = () => {
    navigator.clipboard.writeText(deeplink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#05080f',
      color: '#e2e8f0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      gap: 24,
      maxWidth: 480,
      margin: '0 auto',
    }}>
      <div style={{ fontSize: 13, color: '#4fffb0', letterSpacing: '0.15em' }}>
        MERCHANT QR GENERATOR
      </div>

      <div style={{ fontSize: 24, fontWeight: 700, textAlign: 'center' }}>
        Your Payment QR
      </div>

      <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 1.6 }}>
        Share this QR with anyone. When scanned inside Trust Wallet,
        it opens your payment page directly in their DApp browser.
      </p>

      {/* Chain selector */}
      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        {Object.entries(CHAINS).map(([key, c]) => (
          <button
            key={key}
            onClick={() => setChain(key)}
            style={{
              flex: 1,
              background: chain === key ? '#4fffb022' : '#0d1117',
              border: `1px solid ${chain === key ? '#4fffb0' : '#1f2937'}`,
              borderRadius: 12,
              padding: '12px 8px',
              color: chain === key ? '#4fffb0' : '#6b7280',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 20 }}>{c.icon}</span>
            <span>{c.label}</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>{c.usdt.symbol}</span>
          </button>
        ))}
      </div>

      {/* QR image */}
      {qrUrl && (
        <div style={{
          background: '#05080f',
          border: '1px solid #1f2937',
          borderRadius: 16,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          width: '100%',
        }}>
          <img
            src={qrUrl}
            alt="Payment QR"
            style={{
              width: 240,
              height: 240,
              borderRadius: 8,
            }}
          />
          <div style={{
            fontSize: 12,
            color: '#4db8ff',
            fontFamily: 'monospace',
            textAlign: 'center',
          }}>
            {CHAINS[chain].label} · USDT
          </div>

          {/* Download */}
          <a
            href={qrUrl}
            download={`payment-qr-${chain}.png`}
            target="_blank"
            rel="noreferrer"
            style={{
              width: '100%',
              background: '#4fffb0',
              border: 'none',
              borderRadius: 10,
              padding: '13px 0',
              fontSize: 14,
              fontWeight: 700,
              color: '#020810',
              cursor: 'pointer',
              textAlign: 'center',
              textDecoration: 'none',
              display: 'block',
            }}
          >
            ↓ Download QR
          </a>
        </div>
      )}

      {/* Deeplink */}
      <div style={{
        width: '100%',
        background: '#0d1117',
        border: '1px solid #1f2937',
        borderRadius: 12,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
          DEEPLINK URL
        </div>
        <div style={{
          fontSize: 11,
          color: '#e2e8f0',
          fontFamily: 'monospace',
          wordBreak: 'break-all',
          lineHeight: 1.5,
        }}>
          {deeplink}
        </div>
        <button
          onClick={copyLink}
          style={{
            background: 'transparent',
            border: '1px solid #1f2937',
            borderRadius: 8,
            padding: '8px 0',
            color: copied ? '#4fffb0' : '#6b7280',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          {copied ? '✓ Copied' : 'Copy Link'}
        </button>
      </div>

      <div style={{
        fontSize: 12,
        color: '#374151',
        textAlign: 'center',
        lineHeight: 1.6,
        fontFamily: 'monospace',
      }}>
        To access this page: {siteUrl}?qr=1
      </div>
    </div>
  )
    }
            
