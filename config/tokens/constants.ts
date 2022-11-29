import {
  decimals,
  LPTokens,
  SupportedToken,
  supportedTokens,
  TokenData
} from '@gearbox-protocol/sdk'

export type UnusedTokens = Extract<
  SupportedToken,
  '1INCH' | 'AAVE' | 'COMP' | 'DPI' | 'FEI' | 'LINK' | 'UNI' | 'YFI'
>

export const UNUSED_TOKENS: Record<UnusedTokens | 'deploy me', true> = {
  '1INCH': true,
  AAVE: true,
  COMP: true,
  DPI: true,
  FEI: true,
  LINK: true,
  UNI: true,
  YFI: true,
  'deploy me': true
}

export type TokensWithoutPrice = Extract<
  SupportedToken,
  'dDAI' | 'dUSDC' | 'dWBTC' | 'dWETH' | 'GEAR' | 'dwstETH' | UnusedTokens
>

export const TOKENS_WITHOUT_PRICE: Record<TokensWithoutPrice, true> = {
  '1INCH': true,
  AAVE: true,
  COMP: true,
  DPI: true,
  FEI: true,
  LINK: true,
  UNI: true,
  YFI: true,
  dDAI: true,
  dUSDC: true,
  dWBTC: true,
  dWETH: true,
  dwstETH: true,
  GEAR: true
}

export type UndepositableTokens = Extract<SupportedToken, 'LDO' | 'LQTY'>

export const UNDEPOSITABLE_TOKENS: Record<UndepositableTokens, true> = {
  LDO: true,
  LQTY: true
}

export type FarmToken = LPTokens | 'STETH'

export const FARM_TOKEN_SYMBOLS: Record<FarmToken, Array<SupportedToken>> = {
  '3Crv': ['DAI', 'USDC', 'USDT'],
  crvFRAX: ['USDC', 'FRAX'],
  steCRV: ['STETH', 'WETH'],
  FRAX3CRV: ['DAI', 'USDC', 'USDT', 'FRAX'],
  LUSD3CRV: ['DAI', 'USDC', 'USDT', 'LUSD'],
  crvPlain3andSUSD: ['DAI', 'USDC', 'USDT', 'sUSD'],
  gusd3CRV: ['DAI', 'USDC', 'USDT', 'GUSD'],
  cvx3Crv: ['DAI', 'USDC', 'USDT'],
  cvxcrvFRAX: ['USDC', 'FRAX'],
  cvxsteCRV: ['STETH', 'WETH'],
  cvxFRAX3CRV: ['DAI', 'USDC', 'USDT', 'FRAX'],
  cvxLUSD3CRV: ['DAI', 'USDC', 'USDT', 'LUSD'],
  cvxcrvPlain3andSUSD: ['DAI', 'USDC', 'USDT', 'sUSD'],
  cvxgusd3CRV: ['DAI', 'USDC', 'USDT', 'GUSD'],
  stkcvx3Crv: ['STETH', 'WETH'],
  stkcvxFRAX3CRV: ['DAI', 'USDC', 'USDT', 'FRAX'],
  stkcvxgusd3CRV: ['DAI'],
  stkcvxsteCRV: ['STETH', 'WETH'],
  stkcvxcrvPlain3andSUSD: ['DAI'],
  stkcvxLUSD3CRV: ['DAI', 'USDC', 'USDT', 'LUSD'],
  stkcvxcrvFRAX: ['USDC', 'FRAX'],
  yvDAI: ['DAI'],
  yvUSDC: ['USDC'],
  yvWETH: ['WETH'],
  yvWBTC: ['WBTC'],
  yvCurve_stETH: ['STETH', 'WETH'],
  yvCurve_FRAX: ['DAI', 'USDC', 'USDT', 'FRAX'],
  STETH: ['WETH']
}

export type PriceTokensList = Record<
  Exclude<SupportedToken, TokensWithoutPrice>,
  string
>

export const ETH_ADDRESS = '0x0'.toLowerCase()

export const ethData = new TokenData(
  {
    ...supportedTokens.WETH,
    addr: ETH_ADDRESS,
    symbol: 'ETH',
    decimals: decimals.WETH
  },
  {}
)

export const getDSTWETHData = (
  currentTokenData: Record<SupportedToken, string>
) =>
  new TokenData(
    {
      symbol: supportedTokens.wstETH.symbol,
      addr: currentTokenData.dwstETH,
      decimals: decimals.dwstETH
    },
    { [supportedTokens.wstETH.symbol]: supportedTokens.dwstETH.symbol }
  )

export const getDWETHData = (
  currentTokenData: Record<SupportedToken, string>
) =>
  new TokenData(
    {
      ...supportedTokens.dWETH,
      addr: currentTokenData.dWETH,
      decimals: decimals.dWETH
    },
    {}
  )

export const getWETHData = (currentTokenData: Record<SupportedToken, string>) =>
  new TokenData(
    {
      ...supportedTokens.WETH,
      addr: currentTokenData.WETH,
      decimals: decimals.WETH
    },
    {}
  )
