import {
  AwaitedRes,
  BaseAdapter,
  callRepeater,
  contractParams,
  contractsByAddress,
  CreditAccountData,
  CreditAccountWatcher,
  CreditManagerData,
  CreditManagerWatcher,
  ICreditFacade__factory,
  ICreditFilter__factory,
  ICreditManager,
  ICreditManagerV2__factory,
  ICreditManager__factory,
  IDataCompressor__factory,
  MCall,
  multicall,
  TokenData
} from '@gearbox-protocol/sdk'
import {
  ICreditFacade,
  ICreditFacadeInterface
} from '@gearbox-protocol/sdk/lib/types/@gearbox-protocol/core-v2/contracts/interfaces/ICreditFacade.sol/ICreditFacade'
import { ICreditManagerV2Interface } from '@gearbox-protocol/sdk/lib/types/@gearbox-protocol/core-v2/contracts/interfaces/ICreditManagerV2.sol/ICreditManagerV2'
import {
  ICreditFilter,
  ICreditFilterInterface
} from '@gearbox-protocol/sdk/lib/types/@gearbox-protocol/core-v2/contracts/interfaces/V1/ICreditFilter'
import { ICreditManagerInterface } from '@gearbox-protocol/sdk/lib/types/@gearbox-protocol/core-v2/contracts/interfaces/V1/ICreditManager'
import { TypedEvent } from '@gearbox-protocol/sdk/lib/types/common'
import { BigNumber, utils } from 'ethers'
import { dataCompressorAddress, pathFinder, provider, setupWeb3 } from '.'
import { NULL_ADDRESS } from '../../config'

export const getCAs = async () => {
  if (dataCompressorAddress === '') await setupWeb3()

  // Get all live CMs
  const creditManagers = await CreditManagerWatcher.getV2CreditManagers(
    dataCompressorAddress,
    provider
  )

  // Fetch all CreditAccounts
  const caListCalls = Object.values(creditManagers).map((cm, i) =>
    CreditAccountWatcher.getOpenAccounts(cm, provider)
  )
  // Fetch and Flatten CAList
  const creditAccounts = (await Promise.all(caListCalls)).flat(1)

  // Fetch CA data
  const caData = await CreditAccountWatcher.batchCreditAccountLoad(
    creditAccounts.slice(0, 20),
    dataCompressorAddress,
    provider,
    { chunkSize: creditAccounts.length }
  )

  return { caData, creditManagers }
}

export const fetchCAData = async (hash: string) => {
  if (dataCompressorAddress === '') await setupWeb3()

  // Fetch CA data
  const dataCompressor = IDataCompressor__factory.connect(
    dataCompressorAddress,
    provider
  )
  const cm = hash.split(':')[0]
  const borrower = hash.split(':')[1]
  const data = await dataCompressor.getCreditAccountData(cm, borrower)
  const ca = new CreditAccountData(data)

  return ca
}

export const setupAdapters = async (creditManager: string) => {
  if (!pathFinder || !provider) await setupWeb3()

  // Get all live CMs
  const creditManagers = await CreditManagerWatcher.getV2CreditManagers(
    dataCompressorAddress,
    provider
  )

  const { adapters, address } = creditManagers[creditManager]

  Object.entries(adapters).reduce<Record<string, BaseAdapter>>(
    (acc, [contractAddress, adapterAddress]) => {
      const contractSymbol = contractsByAddress[contractAddress]
      if (!contractSymbol) {
        console.error(
          'core/adapterManagers',
          'Contract not found',
          contractAddress
        )
        return acc
      }

      const params = contractParams[contractSymbol]

      acc[contractAddress] = new BaseAdapter({
        name: params.name,
        adapterInterface: params.type,
        contractAddress,
        adapterAddress,
        contractSymbol,
        creditManager: address
      })

      return acc
    },
    {}
  )
  return
}

// Get populated CreditManager objects
export const getV2CMs = async () => {
  if (dataCompressorAddress === '') await setupWeb3()

  // Get all live CMs
  return await CreditManagerWatcher.getV2CreditManagers(
    dataCompressorAddress,
    provider
  )
}

// Get array of open CA hashes
export const getV2CAs = async (
  creditManagers: Record<string, CreditManagerData>
) => {
  // Fetch all CreditAccounts
  const caListCalls = Object.values(creditManagers).map((cm, i) =>
    CreditAccountWatcher.getOpenAccounts(cm, provider)
  )
  // Fetch and Flatten CAList
  return (await Promise.all(caListCalls)).flat(1)
}

export const getV2CAsTotalValue = async (
  cm: Record<string, CreditManagerData>,
  ca: string[],
  prices: Record<string, BigNumber>,
  tokens: Record<string, TokenData>
) => {
  /// Get CA Address from hash
  const caCalls: Array<MCall<ICreditManagerV2Interface>> = ca.map((hash) => ({
    address: hash.split(':')[0],
    interface: ICreditManagerV2__factory.createInterface(),
    method: 'creditAccounts(address)',
    params: [hash.split(':')[1]]
  }))

  const caList = await callRepeater(() =>
    multicall<Array<AwaitedRes<ICreditManager['creditAccounts']>>>(
      caCalls,
      provider
    )
  )

  const calls: Array<MCall<ICreditFacadeInterface>> = ca.map((hash, i) => ({
    address: cm[hash.split(':')[0]].creditFacade,
    interface: ICreditFacade__factory.createInterface(),
    method: 'calcTotalValue(address)',
    params: [caList[i]]
  }))

  const values = await callRepeater(() =>
    multicall<Array<AwaitedRes<ICreditFacade['calcTotalValue']>>>(
      calls,
      provider
    )
  )

  // Calculate TVL: sum( Expected Liqudity * Underlying Price )
  const caTVL = ca
    .map(
      (hash, i) =>
        parseFloat(
          utils.formatUnits(
            values[i].total,
            tokens[cm[hash.split(':')[0]].underlyingToken.toLowerCase()]
              .decimals
          )
        ) *
        parseFloat(
          utils.formatUnits(
            prices[cm[hash.split(':')[0]].underlyingToken.toLowerCase()],
            8
          )
        )
    )
    .reduce((a, b) => a + b)

  return caTVL
}

// As per https://dev.gearbox.fi/docs/documentation/deployments/deployed-contracts/
const v1CMAddresses = [
  '0x777e23a2acb2fcbb35f6ccf98272d03c722ba6eb',
  '0x2664cc24cbad28749b3dd6fc97a6b402484de527',
  '0x968f9a68a98819e2e6bb910466e191a7b6cf02f0',
  '0xC38478B0A4bAFE964C3526EEFF534d70E1E09017'
]

export const getV1CAs = async (
  prices: Record<string, BigNumber>,
  tokens: Record<string, TokenData>
) => {
  if (dataCompressorAddress === '') await setupWeb3()

  const v1CMData = await Promise.all(
    v1CMAddresses.map((cm) => getCreditManagerData(cm))
  )

  const calls = v1CMAddresses.map((cm) => getOpenV1CAs(cm))
  const V1Borrowers = (await Promise.all(calls)).flat(1)

  /// Get CA Address from hash
  const caCalls: Array<MCall<ICreditManagerInterface>> = V1Borrowers.map(
    (hash) => ({
      address: hash.split(':')[0],
      interface: ICreditManager__factory.createInterface(),
      method: 'creditAccounts(address)',
      params: [hash.split(':')[1]]
    })
  )

  const caList = await callRepeater(() =>
    multicall<Array<AwaitedRes<ICreditManager['creditAccounts']>>>(
      caCalls,
      provider
    )
  )

  // Collect open CA addresses & their CreditFilters
  let caValueCallData: any = []
  caList.map((a, i) => {
    if (a !== NULL_ADDRESS) {
      caValueCallData.push({
        a,
        cm: v1CMAddresses.findIndex(
          (item) =>
            item.toLowerCase() === V1Borrowers[i].split(':')[0].toLowerCase()
        )
      })
    }
  })

  // Get TVL from V1 CAs
  const valueCalls: Array<MCall<ICreditFilterInterface>> = caValueCallData.map(
    (obj) => ({
      address: v1CMData[obj.cm].creditFilter,
      interface: ICreditFilter__factory.createInterface(),
      method: 'calcTotalValue(address)',
      params: [obj.a]
    })
  )

  const values = await callRepeater(() =>
    multicall<Array<AwaitedRes<ICreditFilter['calcTotalValue']>>>(
      valueCalls,
      provider
    )
  )

  const caTVL = caValueCallData
    .map(
      (obj, i) =>
        parseFloat(
          utils.formatUnits(
            values[i],
            tokens[v1CMData[obj.cm].underlying.toLowerCase()].decimals
          )
        ) *
        parseFloat(
          utils.formatUnits(
            prices[v1CMData[obj.cm].underlying.toLowerCase()],
            8
          )
        )
    )
    .reduce((a, b) => a + b)

  return caTVL
}

export const getCreditManagerData = async (addresse: string) => {
  const cm = ICreditManager__factory.connect(addresse, provider)
  const creditFilter = await cm.creditFilter()
  const underlying = await cm.underlyingToken()
  return { creditFilter, underlying }
}

interface CMEvent {
  time: number
  address: string
  operation: 'add' | 'delete'
}

export const getOpenV1CAs = async (creditManagerAddress: string) => {
  const eventsByDate: Array<CMEvent> = []
  const accounts: Set<string> = new Set<string>()

  const addToEvents = (
    e: TypedEvent,
    address: string,
    operation: 'add' | 'delete'
  ) => {
    eventsByDate.push({
      time: e.blockNumber * 100000 + e.logIndex,
      address,
      operation
    })
  }

  const cm = ICreditManager__factory.connect(creditManagerAddress, provider)

  const topics = {
    OpenCreditAccount: cm.interface.getEventTopic('OpenCreditAccount'),
    CloseCreditAccount: cm.interface.getEventTopic('CloseCreditAccount'),
    RepayCreditAccount: cm.interface.getEventTopic('RepayCreditAccount'),
    LiquidateCreditAccount: cm.interface.getEventTopic(
      'LiquidateCreditAccount'
    ),
    TransferAccount: cm.interface.getEventTopic('TransferAccount')
  }

  const logs = await cm.queryFilter(
    {
      address: creditManagerAddress,
      topics: [Object.values(topics)]
    },
    undefined
  )

  logs.forEach((log) => {
    const e = cm.interface.parseLog(log)

    switch (log.topics[0]) {
      case topics.OpenCreditAccount:
        addToEvents(log, e.args.onBehalfOf, 'add')
        break
      case topics.CloseCreditAccount:
      case topics.LiquidateCreditAccount:
      case topics.RepayCreditAccount:
        addToEvents(log, e.args.borrower, 'delete')
        break
      case topics.TransferAccount:
        addToEvents(log, e.args.oldOwner, 'delete')
        addToEvents(log, log.args.newOwner, 'add')
        break
    }
  })
  eventsByDate
    .sort((a, b) => {
      return a.time > b.time ? 1 : -1
    })
    .forEach((e) => {
      if (e.operation === 'add') {
        accounts.add(e.address)
      } else {
        accounts.delete(e.address)
      }
    })

  return Array.from(accounts.values()).map((borrower) =>
    CreditAccountData.hash(creditManagerAddress, borrower)
  )
}
