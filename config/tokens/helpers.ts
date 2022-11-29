import {
  isConvexLPToken,
  isConvexStakedPhantomToken,
  isCurveLPToken,
  isYearnLPToken,
  LPTokenDataI,
  LPTokens,
  lpTokens,
  SupportedToken,
  TradeType
} from '@gearbox-protocol/sdk'

import {
  ETH_ADDRESS,
  TOKENS_WITHOUT_PRICE,
  TokensWithoutPrice,
  UNUSED_TOKENS,
  UnusedTokens
} from './constants'

export const isTokenToSkip = (t: unknown): t is TokensWithoutPrice =>
  typeof t === 'string' && !!TOKENS_WITHOUT_PRICE[t as TokensWithoutPrice]

export const isUnusedToken = (t: unknown): t is UnusedTokens =>
  typeof t === 'string' && !!UNUSED_TOKENS[t as UnusedTokens]

export const unwrapTokenAddress = (
  tokenAddress: string,
  currentTokenData: Record<SupportedToken, string>
) => {
  if (tokenAddress.toLowerCase() === currentTokenData.WETH) {
    return ETH_ADDRESS
  }
  if (tokenAddress.toLowerCase() === currentTokenData.wstETH) {
    return currentTokenData.STETH
  }

  return tokenAddress.toLowerCase()
}

function getYearnTokensOut(tokenInfo: LPTokenDataI) {
  return tokenInfo.lpActions.map((action) => {
    if (action.type === TradeType.YearnWithdraw) return [action.tokenOut]
    return []
  })
}

function getCurveTokensOut(tokenInfo: LPTokenDataI) {
  return tokenInfo.lpActions.map((action) => {
    if (action.type === TradeType.CurveWithdrawLP) {
      return action.tokenOut
    }
    return []
  })
}

function getConvexTokensOut(tokenInfo: LPTokenDataI) {
  return tokenInfo.lpActions.map((action) => {
    if (action.type === TradeType.ConvexWithdrawLP) return [action.tokenOut]
    return []
  })
}

function getConvexStakedPhantomTokensOut(tokenInfo: LPTokenDataI) {
  return tokenInfo.lpActions.map((action) => {
    if (
      action.type === TradeType.ConvexWithdraw ||
      action.type === TradeType.ConvexWithdrawAndUnwrap
    )
      return [action.tokenOut]
    return []
  })
}

function getLPTokensOutByAction(lpTokenSymbol: LPTokens) {
  const tokenInfo = lpTokens[lpTokenSymbol]
  if (isYearnLPToken(lpTokenSymbol)) {
    const tokenInfo = lpTokens[lpTokenSymbol]
    return getYearnTokensOut(tokenInfo)
  }
  if (isCurveLPToken(lpTokenSymbol)) {
    const tokenInfo = lpTokens[lpTokenSymbol]
    return getCurveTokensOut(tokenInfo)
  }
  if (isConvexLPToken(lpTokenSymbol)) {
    return getConvexTokensOut(tokenInfo)
  }
  if (isConvexStakedPhantomToken(lpTokenSymbol)) {
    return getConvexStakedPhantomTokensOut(tokenInfo)
  }
  return []
}

export function getLPTokenOut(lpTokenSymbol: LPTokens) {
  const tokensOut = getLPTokensOutByAction(lpTokenSymbol)
  const flattened = tokensOut.flat(1)
  const set = new Set(flattened)
  const unique = [...set]
  return unique
}
