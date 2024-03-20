import { ethers } from 'ethers'

export const addAddressPadding = (address: string): string => {
    return ethers.zeroPadValue(address, 32)
}

export const addUintPadding = (amount: number | bigint): string => {
    const bn = BigInt(amount)
    return bn.toString(16).padStart(64, '0')
}
