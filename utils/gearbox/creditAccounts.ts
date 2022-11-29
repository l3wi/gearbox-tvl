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
  ICreditManager,
  ICreditManagerV2__factory,
  ICreditManager__factory,
  IDataCompressor__factory,
  MCall,
  multicall
} from '@gearbox-protocol/sdk'
import {
  ICreditFacade,
  ICreditFacadeInterface
} from '@gearbox-protocol/sdk/lib/types/@gearbox-protocol/core-v2/contracts/interfaces/ICreditFacade.sol/ICreditFacade'
import { ICreditManagerV2Interface } from '@gearbox-protocol/sdk/lib/types/@gearbox-protocol/core-v2/contracts/interfaces/ICreditManagerV2.sol/ICreditManagerV2'
import { TypedEvent } from '@gearbox-protocol/sdk/lib/types/common'
import { BigNumber, utils } from 'ethers'
import { dataCompressorAddress, pathFinder, provider, setupWeb3 } from '.'

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
  ca: string[]
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

  let totalValue = values.reduce(
    (partialSum, a) => partialSum.add(a[0]),
    BigNumber.from('0')
  )
  return parseFloat(utils.formatUnits(totalValue, 18))
}

// export const estimateCALiquidation = async (
//   cf: string,
//   borrower: string,
//   to: string,
//   skipTokenMask: number,
//   convertWETH: boolean,
//   calls: MultiCallStruct[]
// ) => {
//   const creditFacade = ICreditFacade__factory.connect(cf, provider)

//   const gas = await creditFacade.estimateGas.liquidateCreditAccount(
//     borrower,
//     to,
//     skipTokenMask,
//     convertWETH,
//     calls
//   )
//   console.log(gas)
//   return gas
// }

export const getV1CAs = async () => {
  // As per
  const v1CMAddresses = [
    '0x777e23a2acb2fcbb35f6ccf98272d03c722ba6eb',
    '0x2664cc24cbad28749b3dd6fc97a6b402484de527',
    '0x968f9a68a98819e2e6bb910466e191a7b6cf02f0',
    '0xC38478B0A4bAFE964C3526EEFF534d70E1E09017'
  ]

  const calls = v1CMAddresses.map((cm) => getOpenV1CAs(cm))
  return (await Promise.all(calls)).flat(1)
}

export const getV1CMs = (addresses: string[]) => {}

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
