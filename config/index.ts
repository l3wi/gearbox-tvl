import { NetworkType } from '@gearbox-protocol/sdk'

export const IS_TEST_NETWORK = false
export const CHAIN_TYPE: NetworkType = 'Mainnet'

export const STARTING_BLOCK = 15833466

export const ADDRESS_PROVIDER =
  process.env.ADDRESS_PROVIDER || '0xcF64698AFF7E5f27A11dff868AF228653ba53be0'
export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'
