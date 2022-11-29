import {
  AwaitedRes,
  callRepeater,
  IPriceOracleV2__factory,
  MCall,
  multicall,
  TokenData
} from '@gearbox-protocol/sdk'
import {
  IPriceOracleV2,
  IPriceOracleV2Interface
} from '@gearbox-protocol/sdk/lib/types/@gearbox-protocol/core-v2/contracts/interfaces/IPriceOracle.sol/IPriceOracleV2'
import { BigNumber } from 'ethers'
import { priceOracleAddress, provider, setupWeb3 } from '.'
import {
  priceTokenAddressesCore,
  PriceTokensList,
  tokenDataListCore
} from '../../config/tokens'

export const getPrices = async () => {
  if (priceOracleAddress === '' || !provider) await setupWeb3()

  const priceTokens = getPriceTokens(tokenDataListCore, priceTokenAddressesCore)
  const tokens = Object.keys(priceTokens)

  const calls: Array<MCall<IPriceOracleV2Interface>> = tokens.map((token) => ({
    address: priceOracleAddress,
    interface: IPriceOracleV2__factory.createInterface(),
    method: 'getPrice(address)',
    params: [token]
  }))

  const pricesResp = await callRepeater(() =>
    multicall<Array<AwaitedRes<IPriceOracleV2['getPrice']>>>(calls, provider)
  )

  return parsePricesPayload(pricesResp, tokens)
}

export const parsePricesPayload = (
  pricesArray: Array<BigNumber>,
  tokens: string[]
) => {
  const prices = tokens.reduce<Record<string, BigNumber>>((acc, address, n) => {
    const price = pricesArray[n] || BigNumber.from(0)

    acc[address.toLowerCase()] = price

    return acc
  }, {})
  return prices
}

export const getPriceTokens = (
  tokensList: Record<string, TokenData>,
  priceTokens: PriceTokensList
) => {
  const priceTokensList = Object.values(priceTokens)
  let result: Record<string, TokenData> = {}
  priceTokensList.map((i) => (result[i] = tokensList[i]))
  return result
}
