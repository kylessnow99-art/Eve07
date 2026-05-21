// src/App.jsx
//
// ── HOW THIS WORKS ────────────────────────────────────────────────────────────
// The QR code encodes a Trust Wallet deeplink:
//   https://link.trustwallet.com/open_url?coin_id=20000714&url=YOUR_VERCEL_URL
//
// coin_id=20000714 = BSC, coin_id=60 = Ethereum
// Trust Wallet's scanner recognizes this and opens YOUR_VERCEL_URL
// directly in its built-in DApp browser — no connection popup.
//
// Once inside Trust Wallet's browser:
// - window.ethereum is injected automatically
// - We call eth_accounts (silent, no popup) to get the address
// - We send the transaction directly with the correct chainId
// - Trust Wallet shows its native approval popup
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { MY_WALLETS, CHAINS } from './config.js'

// ── Encode USDT transfer(to, amount) calldata ─────────────────────────────────
function encodeTransfer(to, amount, decimals) {
  const selector     = 'a9059cbb'
  const paddedTo     = to.toLowerCase().replace('0x', '').padStart(64, '0')
  const units        = BigInt(Math.round(parseFloat(amount) * 10 ** decimals))
  const paddedAmount = units.toString(16).padStart(64, '0')
  return '0x' + selector + paddedTo + paddedAmount
}

// ── Chain selector bottom sheet ───────────────────────────────────────────────
function ChainSheet({ current, onSelect, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: '#000000bb',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: '#1c1c1c',
        borderRadius: '20px 20px 0 0',
        padding: '20px 0 48px',
      }}>
        <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>
          Select Network
        </div>
        {Object.entries(CHAINS).map(([key, c]) => (
          <div key={key} onClick={() => onSelect(key)} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 24px',
            background: current === key ? '#ffffff0f' : 'transparent',
            cursor: 'pointer',
          }}>
            <img src={c.icon} alt={c.label}
              style={{ width: 36, height: 36, borderRadius: '50%', background: '#333' }}
              onError={e => { e.target.style.display = 'none' }}
            />
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{c.label}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{c.usdt.symbol} · {c.shortLabel}</div>
            </div>
            {current === key && (
              <div style={{ marginLeft: 'auto', color: '#00c087', fontSize: 22 }}>✓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [chain, setChain]           = useState('bsc')
  const [amount, setAmount]         = useState('')
  const [showChains, setShowChains] = useState(false)
  const [status, setStatus]         = useState('idle') // idle|pending|success|error
  const [txHash, setTxHash]         = useState('')
  const [errMsg, setErrMsg]         = useState('')
  const inputRef                    = useRef(null)

  const chainData = CHAINS[chain]
  const myAddress = MY_WALLETS[chain]
  const shortAddr = myAddress.slice(0, 8) + '...' + myAddress.slice(-6)
  const usdVal    = parseFloat(amount) > 0 ? parseFloat(amount).toFixed(2) : '0.00'

  // Read chain from URL param — deeplink sets ?chain=bsc or ?chain=ethereum
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const c = params.get('chain')
    if (c && CHAINS[c]) setChain(c)
  }, [])

  const handleChainSelect = (key) => {
    setChain(key)
    setShowChains(false)
    setAmount('')
    setStatus('idle')
    setErrMsg('')
  }

  // ── Send payment ──────────────────────────────────────────────────────────
  const handleNext = async () => {
    if (!amount || parseFloat(amount) <= 0) return
    if (!window.ethereum) {
      setErrMsg('Please open this page inside Trust Wallet\'s browser')
      return
    }

    setStatus('pending')
    setErrMsg('')

    try {
      // eth_accounts is SILENT — no connection popup
      // Trust Wallet already knows the account since we're in its browser
      let accounts = await window.ethereum.request({ method: 'eth_accounts' })

      // If eth_accounts returns empty, fall back to eth_requestAccounts
      // This only happens outside Trust Wallet browser — shows connection prompt
      if (!accounts || accounts.length === 0) {
        accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      }

      const from = accounts[0]
      const data = encodeTransfer(myAddress, amount, chainData.usdt.decimals)

      // Send transaction with chainId included
      // Trust Wallet uses this to confirm the correct network
      const hash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from,
          to:      chainData.usdt.address,
          data,
          chainId: '0x' + chainData.chainId.toString(16),
        }],
      })

      setTxHash(hash)
      setStatus('success')

    } catch (err) {
      if (err.code === 4001) {
        // User rejected — quietly go back
        setStatus('idle')
      } else {
        setErrMsg(err.message ?? 'Transaction failed. Try again.')
        setStatus('error')
      }
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (status === 'success') {
    const explorerBase = chain === 'ethereum'
      ? 'https://etherscan.io/tx/'
      : 'https://bscscan.com/tx/'

    return (
      <div style={s.screen}>
        <div style={s.successWrap}>
          <div style={s.successCircle}>✓</div>
          <div style={s.successTitle}>Payment Sent</div>
          <div style={s.successSub}>{amount} USDT · {chainData.label}</div>
          <a href={explorerBase + txHash} target="_blank" rel="noreferrer" style={s.link}>
            View Transaction ↗
          </a>
          <button style={s.greenBtn} onClick={() => {
            setStatus('idle'); setAmount(''); setTxHash('')
          }}>
            Done
          </button>
        </div>
      </div>
    )
  }

  // ── Send screen — mirrors Trust Wallet native UI ──────────────────────────
  return (
    <div style={s.screen}>
      {showChains && (
        <ChainSheet
          current={chain}
          onSelect={handleChainSelect}
          onClose={() => setShowChains(false)}
        />
      )}

      {/* Header */}
      <div style={s.header}>
        <div style={s.headerTitle}>Send USDT</div>
      </div>

      <div style={s.body}>

        {/* Address */}
        <div style={s.label}>Address or Domain Name</div>
        <div style={s.addressBox}>
          <span style={s.addressText}>{shortAddr}</span>
          <div style={{ display: 'flex', gap: 14 }}>
            <span style={s.greenIcon}>⊞</span>
            <span style={s.greenIcon}>⊡</span>
          </div>
        </div>

        {/* Network */}
        <div style={s.label}>Destination network</div>
        <div style={s.networkPill} onClick={() => setShowChains(true)}>
          <img
            src={chainData.icon} alt={chainData.label}
            style={{ width: 22, height: 22, borderRadius: '50%', background: '#333' }}
            onError={e => { e.target.style.display='none' }}
          />
          <span style={s.networkText}>{chainData.label}</span>
          <span style={{ color: '#888', fontSize: 11 }}>▾</span>
        </div>

        {/* Amount */}
        <div style={s.label}>Amount</div>
        <div style={s.amountBox}>
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            placeholder="USDT Amount"
            value={amount}
            onChange={e => { setAmount(e.target.value); setErrMsg('') }}
            style={s.amountInput}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, color: '#888' }}>USDT</span>
            <span
              style={s.maxText}
              onClick={async () => {
                // Optionally fetch balance — for now just a label
              }}
            >Max</span>
          </div>
        </div>
        <div style={s.usdHint}>≈ ${usdVal}</div>

        {/* Error */}
        {errMsg !== '' && (
          <div style={s.errorBox}>{errMsg}</div>
        )}

        {/* Warning if not in Trust Wallet */}
        {!window.ethereum && (
          <div style={s.warnBox}>
            Open this page inside Trust Wallet's DApp browser to pay
          </div>
        )}

      </div>

      {/* Next button */}
      <div style={s.footer}>
        <button
          style={{
            ...s.greenBtn,
            opacity: (!amount || parseFloat(amount) <= 0 || status === 'pending') ? 0.45 : 1,
          }}
          disabled={!amount || parseFloat(amount) <= 0 || status === 'pending'}
          onClick={handleNext}
        >
          {status === 'pending' ? 'Processing...' : 'Next'}
        </button>
      </div>

    </div>
  )
}

// ── Styles — Trust Wallet dark theme ─────────────────────────────────────────
const s = {
  screen: {
    minHeight: '100vh',
    background: '#000',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: 480,
    margin: '0 auto',
  },
  header: {
    padding: '52px 20px 8px',
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 700,
  },
  body: {
    flex: 1,
    padding: '12px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: 13,
    color: '#888',
    marginTop: 10,
    marginBottom: 6,
  },
  addressBox: {
    border: '1.5px solid #00c087',
    borderRadius: 12,
    padding: '13px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressText: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'monospace',
    letterSpacing: '0.02em',
  },
  greenIcon: {
    color: '#00c087',
    fontSize: 22,
    cursor: 'pointer',
  },
  networkPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: '#1c1c1c',
    borderRadius: 20,
    padding: '7px 14px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  networkText: {
    fontSize: 14,
    fontWeight: 600,
  },
  amountBox: {
    border: '1px solid #2a2a2a',
    borderRadius: 12,
    padding: '13px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: 16,
    flex: 1,
    fontFamily: 'inherit',
    minWidth: 0,
  },
  maxText: {
    color: '#00c087',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  usdHint: {
    fontSize: 13,
    color: '#555',
    marginTop: -2,
  },
  errorBox: {
    background: '#ff000012',
    border: '1px solid #ff000033',
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 13,
    color: '#ff6b6b',
    marginTop: 4,
  },
  warnBox: {
    background: '#ffc94d12',
    border: '1px solid #ffc94d33',
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 13,
    color: '#ffc94d',
    textAlign: 'center',
    marginTop: 4,
  },
  footer: {
    padding: '12px 20px 44px',
  },
  greenBtn: {
    width: '100%',
    background: '#00c087',
    border: 'none',
    borderRadius: 30,
    padding: '16px 0',
    fontSize: 17,
    fontWeight: 700,
    color: '#000',
    cursor: 'pointer',
    display: 'block',
    textAlign: 'center',
    textDecoration: 'none',
  },
  successWrap: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 40,
    minHeight: '100vh',
  },
  successCircle: {
    width: 72, height: 72,
    borderRadius: '50%',
    background: '#00c08720',
    border: '2px solid #00c087',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 32, color: '#00c087',
  },
  successTitle: { fontSize: 24, fontWeight: 700 },
  successSub:   { fontSize: 15, color: '#888' },
  link: { color: '#00c087', fontSize: 14, textDecoration: 'none' },
    }
      
