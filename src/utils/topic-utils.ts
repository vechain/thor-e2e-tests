import { ethers } from 'ethers'

export const addAddressPadding = (address: string): string => {
    return ethers.zeroPadValue(address, 32)
}
