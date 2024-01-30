import { sendClauses } from './transactions'
import { contractAddresses } from './contracts/addresses'
import { interfaces } from './contracts/hardhat'
import { secp256k1, Transaction } from 'thor-devkit' // import { faucetAccounts } from './constants'
import faucetAccounts from './faucet-accounts.json'

const FAUCET_AMOUNT = '0x65536000000000000000000'

/**
 * Fund an account using the faucet. VET and VTHO will be sent to the account
 * @param account
 */
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

/**
 * Delegate a transaction using the faucet
 * @param transaction - The transaction to delegate
 * @param senderAddress - The address of the sender
 *
 * @returns {Transaction, Buffer} - The updated transaction and the delegate signature
 */
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
