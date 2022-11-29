import {
  decimals,
  keyToLowercase,
  LPTokenDataI,
  lpTokens,
  objectEntries,
  SupportedToken,
  supportedTokens,
  swapKeyValue,
  TokenData,
  tokenDataByNetwork
} from '@gearbox-protocol/sdk'

import { CHAIN_TYPE } from '..'
import {
  FARM_TOKEN_SYMBOLS,
  FarmToken,
  getDSTWETHData,
  TokensWithoutPrice
} from './constants'
import { isTokenToSkip, isUnusedToken } from './helpers'

const unusedFiltered = Object.fromEntries(
  Object.entries(tokenDataByNetwork[CHAIN_TYPE]).filter(
    ([key]) => !isUnusedToken(key)
  )
) as Record<SupportedToken, string>

export const currentTokenDataCore = swapKeyValue(
  keyToLowercase(swapKeyValue(unusedFiltered))
)

const dstwethData = getDSTWETHData(currentTokenDataCore)
export const tokenDataListCore = objectEntries(currentTokenDataCore).reduce<
  Record<string, TokenData>
>((acc, [tokenSymbol, addr]) => {
  const data = supportedTokens[tokenSymbol]

  if (addr) {
    acc[addr] = new TokenData({
      ...data,
      addr,
      decimals: decimals[tokenSymbol]
    })
  }

  return {
    ...acc,
    [dstwethData.address]: dstwethData
  }
}, {})

export const priceTokenAddressesCore = objectEntries(
  currentTokenDataCore
).reduce<Record<Exclude<SupportedToken, TokensWithoutPrice>, string>>(
  (acc, [tokenSymbol, addr]) => {
    if (!isTokenToSkip(tokenSymbol)) {
      acc[tokenSymbol] = addr
    }
    return acc
  },
  {} as Record<Exclude<SupportedToken, TokensWithoutPrice>, string>
)

export const lpTokenDataListCore = Object.values(lpTokens).reduce<
  Record<string, LPTokenDataI>
>((acc, token) => {
  const tokenAddress = currentTokenDataCore[token.symbol]

  if (tokenAddress) acc[tokenAddress] = token

  return acc
}, {})

export const farmTokensCore = Object.fromEntries(
  objectEntries(FARM_TOKEN_SYMBOLS).map(([lpToken, underlying]) => [
    lpToken,
    underlying.map((s) => currentTokenDataCore[s])
  ])
) as Record<FarmToken, Array<string>>
