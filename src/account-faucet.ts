import { sendClauses } from './transactions'
import { contractAddresses } from './contracts/addresses'
import { interfaces } from './contracts/hardhat'
import { secp256k1, Transaction } from 'thor-devkit'
import { faucetAccounts } from './constants'

const FAUCET_AMOUNT = '0x65536000000000000000000'

const fundAccount = async (account: string) => {
    const randomIndex = Math.floor(Math.random() * faucetAccounts.length)
    const fundingAccount = faucetAccounts[randomIndex]

    const receipt = await sendClauses(
        [
            {
                to: account,
                value: FAUCET_AMOUNT,
                data: '0x',
            },
            {
                to: contractAddresses.energy,
                value: '0x0',
                data: interfaces.energy.encodeFunctionData('transfer', [
                    account,
                    FAUCET_AMOUNT,
                ]),
            },
        ],
        fundingAccount.privateKey,
        true,
    )

    return { receipt, amount: FAUCET_AMOUNT }
}

export const delegateTx = (transaction: Transaction, senderAddress: string) => {
    transaction.body.reserved = { features: 1 }

    const randomIndex = Math.floor(Math.random() * faucetAccounts.length)
    const fundingAccount = faucetAccounts[randomIndex]

    const encoded = transaction.signingHash(senderAddress)

    const signature = secp256k1.sign(
        encoded,
        Buffer.from(fundingAccount.privateKey, 'hex'),
    )

    return {
        transaction,
        signature,
    }
}

export { fundAccount, FAUCET_AMOUNT }
