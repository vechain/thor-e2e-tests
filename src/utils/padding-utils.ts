import { ethers } from 'ethers'

export const addAddressPadding = (address: string): string => {
    return ethers.zeroPadValue(address, 32)
}

export const addUintPadding = (amount: number): string => {
    const bn = BigInt(amount)
    return `0x${bn.toString(16).padStart(64, '0')}`
}
