import dotenv from 'dotenv'
dotenv.config()

import { getProtocolTVL, getV1CAs } from './utils/gearbox'

const f = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
})

const main = async () => {
  const tvl = await getProtocolTVL()
  console.log('V2 Pool TVL: ', f.format(tvl.pool))
  console.log('V2 CA TVL: ', f.format(tvl.v2CA))
  console.log('V1 CA TVL: ', f.format(tvl.v1CA))
  console.log('Total TVL: ', f.format(tvl.tvl))
}

main()
