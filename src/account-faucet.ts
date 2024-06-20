import { contractAddresses } from './contracts/addresses'
import { interfaces } from './contracts/hardhat'
import { secp256k1, Transaction, TransactionBody } from '@vechain/sdk-core'
import { testEnv } from './test-env'
import { ThorWallet } from './wallet'

// The funding amounts are not scaled, so `0x1` equals 1 wei
type FundingAmounts = {
    vet: number | string
    vtho: number | string
}

const randomFunder = () => {
    const randomIndex = Math.floor(Math.random() * testEnv.keys.length)
    return new ThorWallet(Buffer.from(testEnv.keys[randomIndex], 'hex'))
}

const parseAmount = (amount: number | string): number => {
    if (typeof amount === 'number') {
        return amount
    }

    return parseInt(amount)
} /**
 * Fund an account using the faucet. VET and VTHO will be sent to the account
 * @param account
 */

const fundAccount = async (account: string, amounts: FundingAmounts) => {
    const wallet = randomFunder()

    const clauses = []
    const vetAmount = parseAmount(amounts.vet)
    if (vetAmount > 0) {
        clauses.push({
            to: account,
            value: vetAmount,
            data: '0x',
        })
    }

    const vthoAmount = parseAmount(amounts.vtho)
    if (vthoAmount > 0) {
        clauses.push({
            to: contractAddresses.energy,
            value: '0x0',
            data: interfaces.energy.encodeFunctionData('transfer', [
                account,
                vthoAmount,
            ]),
        })
    }

    const receipt = await wallet.sendClauses(clauses, true)

    return { receipt, vet: vetAmount, vtho: vthoAmount }
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

    const signature = secp256k1.sign(encoded, fundingAccount.privateKey)

    return {
        transaction,
        signature,
    }
}

export { randomFunder, fundAccount, FundingAmounts }
