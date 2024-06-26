import { contractAddresses } from './contracts/addresses'
import { interfaces } from './contracts/hardhat'
import { secp256k1, Transaction, TransactionBody } from '@vechain/sdk-core'
import { testEnv } from './test-env'
import { ThorWallet } from './wallet'
import { unitsUtils } from '@vechain/sdk-core'

const FAUCET_AMOUNT = unitsUtils.parseVET((10_000).toString())
const FAUCET_AMOUNT_HEX = `0x${FAUCET_AMOUNT.toString(16)}`

const randomFunder = () => {
    const randomIndex = Math.floor(Math.random() * testEnv.keys.length)
    return testEnv.keys[randomIndex]
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
 */
export const delegateTx = (txBody: TransactionBody, senderAddress: string) => {
    txBody.reserved = { features: 1 }

    const transaction = new Transaction(txBody)

    const fundingAccount = randomFunder()

    const encoded = transaction.getSignatureHash(senderAddress)

    const signature = secp256k1.sign(
        encoded,
        Buffer.from(fundingAccount, 'hex'),
    )

    return {
        transaction,
        signature,
    }
}

export { randomFunder, fundAccount, FAUCET_AMOUNT_HEX }
