import { ethers } from 'ethers'

export const addAddressPadding = (address) => {
    return ethers.zeroPadValue(address, 32)
}

export const addUintPadding = (amount) => {
    const bn = BigInt(amount)
    return bn.toString(16).padStart(64, '0')
}
