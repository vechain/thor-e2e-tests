import { address, secp256k1 } from 'thor-devkit'
import { fundAccount } from './account-faucet'

export type Wallet = {
    privateKey: string
    address: string
}

export type EmptyAccount = ReturnType<typeof generateEmptyWallet>
export type FundedAccount = Awaited<ReturnType<typeof generateWalletWithFunds>>

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
