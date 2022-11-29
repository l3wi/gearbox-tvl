import {
  currentTokenDataCore,
  ethData,
  ETH_ADDRESS,
  getDWETHData,
  getWETHData,
  tokenDataListCore
} from '../../config/tokens'

export const tokenListWithEth = () => {
  const tokenList = tokenDataListCore
  const currentTOkens = currentTokenDataCore

  const dwethData = getDWETHData(currentTOkens)
  const wethData = getWETHData(currentTOkens)

  return {
    ...tokenList,
    [wethData.address]: wethData,
    [ETH_ADDRESS]: ethData,
    [dwethData.address]: dwethData
  }
}
