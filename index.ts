import dotenv from 'dotenv'
dotenv.config()

import { getProtocolTVL } from './utils/gearbox'

const main = async () => {
  const tvl = await getProtocolTVL()
  console.log('Pool TVL: ', tvl.pool)
  console.log('V2 CA TVL: ', tvl.v2CA)
  console.log('Total TVL: ', tvl.tvl)
}

main()
