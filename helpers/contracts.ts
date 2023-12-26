import {VIP180__factory} from "../typechain-types"
import {ethers} from "hardhat"


export const contractAddresses = {
  VTHO: "0x0000000000000000000000000000456e65726779"
}

export const contracts = {
  get VTHO() {
    return VIP180__factory.connect(contractAddresses.VTHO, ethers.provider)
  }
}
