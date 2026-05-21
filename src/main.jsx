import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'

const isQRPage = new URLSearchParams(window.location.search).get('qr') === '1'

const App    = lazy(() => import('./App.jsx'))
const QRGen  = lazy(() => import('./QRGen.jsx'))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div style={{ background: '#000', minHeight: '100vh' }} />}>
      {isQRPage ? <QRGen /> : <App />}
    </Suspense>
  </React.StrictMode>
)
