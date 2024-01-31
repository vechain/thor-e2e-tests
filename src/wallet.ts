import { address, secp256k1 } from 'thor-devkit'
import { fundAccount } from './account-faucet'
import { ethers } from 'hardhat'

export type EmptyAccount = ReturnType<typeof generateEmptyWallet>
export type FundedAccount = Awaited<ReturnType<typeof generateWalletWithFunds>>
export type EthersSigner = Awaited<ReturnType<typeof ethers.getSigner>>

export const generateAddress = () => {
    return generateEmptyWallet().address
}

export const generateAddresses = (count: number) => {
    return Array.from({ length: count }, () => generateEmptyWallet().address)
}

export const generateEmptyWallet = () => {
    const privateKey = secp256k1.generatePrivateKey()
    const publicKey = secp256k1.derivePublicKey(privateKey)
    const addr = address.fromPublicKey(publicKey)

    return {
        privateKey: privateKey.toString('hex'),
        address: addr,
    }
}

export const generateWalletWithFunds = async () => {
    const wallet = generateEmptyWallet()
    const receipt = await fundAccount(wallet.address)

    return {
        ...wallet,
        ...receipt,
    }
}

export const randomEthersSigner = async (): Promise<EthersSigner> => {
    const wallet = await ethers.getSigners()

    const randomIndex = Math.floor(Math.random() * wallet.length)

    return wallet[randomIndex]
}
