import {
  AwaitedRes,
  callRepeater,
  IDataCompressor__factory,
  IPoolService__factory,
  MCall,
  multicall,
  TokenData
} from '@gearbox-protocol/sdk'
import {
  IPoolService,
  IPoolServiceInterface
} from '@gearbox-protocol/sdk/lib/types/@gearbox-protocol/core-v2/contracts/interfaces/IPoolService.sol/IPoolService'
import { BigNumber, utils } from 'ethers'
import { dataCompressorAddress, provider, setupWeb3 } from '.'

export const getPoolTVL = async (
  tokens: Record<string, TokenData>,
  prices: Record<string, BigNumber>
) => {
  if (dataCompressorAddress === '' || !provider) await setupWeb3()

  // Fetch CA data
  const dataCompressor = IDataCompressor__factory.connect(
    dataCompressorAddress,
    provider
  )
  // Fetch Pools
  const pools = await dataCompressor.getPoolsList()

  // Setup expectedLiquidity() calls
  const calls: Array<MCall<IPoolServiceInterface>> = pools.map((pool) => ({
    address: pool.addr,
    interface: IPoolService__factory.createInterface(),
    method: 'expectedLiquidity()',
    params: []
  }))

  // Execute MultiCalls
  const values = await callRepeater(() =>
    multicall<Array<AwaitedRes<IPoolService['expectedLiquidity']>>>(
      calls,
      provider
    )
  )

  // Calculate TVL: sum( Expected Liqudity * Underlying Price )
  const poolTVL = pools
    .map(
      (pool, i) =>
        parseFloat(
          utils.formatUnits(
            values[i],
            tokens[pool.underlying.toLowerCase()].decimals
          )
        ) *
        parseFloat(utils.formatUnits(prices[pool.underlying.toLowerCase()], 8))
    )
    .reduce((a, b) => a + b)

  return poolTVL
}
