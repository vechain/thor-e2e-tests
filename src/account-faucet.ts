import { contractAddresses } from './contracts/addresses'
import { interfaces } from './contracts/hardhat'
import { secp256k1, Transaction, TransactionBody } from '@vechain/sdk-core'
import faucetAccounts from './faucet-accounts.json'
import { ThorWallet } from './wallet'
import { unitsUtils } from '@vechain/sdk-core'

const FAUCET_AMOUNT = unitsUtils.parseVET((10_000).toString())
const FAUCET_AMOUNT_HEX = `0x${FAUCET_AMOUNT.toString(16)}`

const randomFunder = () => {
    const randomIndex = Math.floor(Math.random() * faucetAccounts.length)
    return faucetAccounts[randomIndex].privateKey
}

/**
 * Fund an account using the faucet. VET and VTHO will be sent to the account
 * @param account
 */
const fundAccount = async (account: string) => {
    const fundingAccount = randomFunder()
    const wallet = new ThorWallet(Buffer.from(fundingAccount, 'hex'))

    const receipt = await wallet.sendClauses(
        [
            {
                to: account,
                value: FAUCET_AMOUNT_HEX,
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
 * @param txBody - The transaction to delegate
 * @param senderAddress - The address of the sender
 *
 * @returns {Transaction, Buffer} - The updated transaction and the delegate signature
 */
export const delegateTx = (txBody: TransactionBody, senderAddress: string) => {
    txBody.reserved = { features: 1 }

    const transaction = new Transaction(txBody)

    const randomIndex = Math.floor(Math.random() * faucetAccounts.length)
    const fundingAccount = faucetAccounts[randomIndex]

    const encoded = transaction.getSignatureHash(senderAddress)

    const signature = secp256k1.sign(
        encoded,
        Buffer.from(fundingAccount.privateKey, 'hex'),
    )

    return {
        transaction,
        signature,
    }
}

export { randomFunder, fundAccount, FAUCET_AMOUNT_HEX }
