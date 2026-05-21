// src/config.js

// Your receiving wallet addresses
export const MY_WALLETS = {
  bsc:      '0x32D35Edd6B3A9De3D63b7592446B199ac5877d1D',
  ethereum: '0x32D35Edd6B3A9De3D63b7592446B199ac5877d1D',
}

// Chain + USDT config
export const CHAINS = {
  bsc: {
    label:       'BNB Smart Chain',
    shortLabel:  'BSC',
    chainId:     56,
    symbol:      'USDT',
    icon:        'https://assets.trustwallet.com/blockchains/smartchain/info/logo.png',
    usdt: {
      address:  '0x55d398326f99059fF775485246999027B3197955',
      decimals: 18,
      symbol:   'USDT',
    },
  },
  ethereum: {
    label:       'Ethereum',
    shortLabel:  'ETH',
    chainId:     1,
    symbol:      'USDT',
    icon:        'https://assets.trustwallet.com/blockchains/ethereum/info/logo.png',
    usdt: {
      address:  '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
      symbol:   'USDT',
    },
  },
}
