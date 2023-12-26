import {contractAddresses, contracts} from "./contracts"

export const fungible = {
  balanceOf: (address: string): Connex.VM.Clause => {
    return {
      to: contractAddresses.VTHO,
      value: 0,
      data: contracts.VTHO.interface.encodeFunctionData("balanceOf", [address])
    }
  }
}
