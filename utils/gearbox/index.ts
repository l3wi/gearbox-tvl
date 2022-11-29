import { IAddressProvider__factory, PathFinder } from '@gearbox-protocol/sdk'

import { providers, ethers } from 'ethers'

import { ADDRESS_PROVIDER, CHAIN_TYPE } from '../../config'
import {
  getV1CAs,
  getV2CAs,
  getV2CAsTotalValue,
  getV2CMs
} from './creditAccounts'
import { getPoolTVL } from './pools'
import { getPrices, getPriceTokens } from './prices'
import { tokenListWithEth } from './tokens'

export * from './pools'
export * from './prices'
export * from './creditAccounts'

export let provider: providers.Provider = ethers.getDefaultProvider()

export let dataCompressorAddress: string = ''
export let priceOracleAddress: string = ''
export let pathFinder: PathFinder | null = null

export const setupWeb3 = async () => {
  if (process.env.ALCHEMY_KEY) {
    provider = new providers.AlchemyProvider(
      'homestead',
      process.env.ALCHEMY_KEY
    )
  }

  // Get addresses
  const addressProvider = IAddressProvider__factory.connect(
    ADDRESS_PROVIDER,
    provider
  )
  dataCompressorAddress = await addressProvider.getDataCompressor()
  priceOracleAddress = await addressProvider.getPriceOracle()

  const patherFinderAddress = await addressProvider.getLeveragedActions()
  pathFinder = new PathFinder(patherFinderAddress, provider, CHAIN_TYPE)
  return
}

export const getProtocolTVL = async () => {
  // Setup Prices & Tokens
  const prices = await getPrices()
  const tokensList = tokenListWithEth()

  // Pools TVL in USD
  const poolsUSD = await getPoolTVL(tokensList, prices)

  // V2 CreditAccounts TVL in USD
  const cm = await getV2CMs()
  const ca = await getV2CAs(cm)
  const v2USD = await getV2CAsTotalValue(cm, ca, prices, tokensList)

  // V1 CreditAccounts TVL
  const v1USD = await getV1CAs(prices, tokensList)

  return {
    tvl: poolsUSD + v2USD + v1USD,
    pool: poolsUSD,
    v2CA: v2USD,
    v1CA: v1USD
  }
}
