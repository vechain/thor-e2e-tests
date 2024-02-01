import { contractAddresses } from './contracts/addresses'
import { interfaces } from './contracts/hardhat'
import { secp256k1, Transaction } from 'thor-devkit' // import { faucetAccounts } from './constants'
import faucetAccounts from './faucet-accounts.json'
import { ThorWallet } from './wallet'

const FAUCET_AMOUNT = '0x65536000000000000000000'

/**
 * Fund an account using the faucet. VET and VTHO will be sent to the account
 * @param account
 */
const fundAccount = async (account: string) => {
    const randomIndex = Math.floor(Math.random() * faucetAccounts.length)
    const fundingAccount = faucetAccounts[randomIndex]

    const wallet = new ThorWallet(Buffer.from(fundingAccount.privateKey, 'hex'))

    const receipt = await wallet.sendClauses(
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
        true,
    )

    return { receipt, amount: FAUCET_AMOUNT }
}

/**
 * Delegate a transaction using the faucet
 * @param transaction - The transaction to delegate
 * @param senderAddress - The address of the sender
 *
 * @returns {Transaction, Buffer} - The updated transaction and the delegate signature
 */
export const delegateTx = (txBody: Transaction.Body, senderAddress: string) => {
    txBody.reserved = { features: 1 }

    const transaction = new Transaction(txBody)

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
