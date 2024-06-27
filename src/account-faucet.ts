import { contractAddresses } from './contracts/addresses'
import { interfaces } from './contracts/hardhat'
import { secp256k1, Transaction, TransactionBody } from '@vechain/sdk-core'
import { testEnv } from './test-env'
import { ThorWallet } from './wallet'
import { unitsUtils } from '@vechain/sdk-core'

const FAUCET_AMOUNT = unitsUtils.parseVET((10_000).toString())
const FAUCET_AMOUNT_HEX = `0x${FAUCET_AMOUNT.toString(16)}`

// The funding amounts are not scaled, so `0x1` equals 1 wei
type FundingAmounts = {
    vet: number | string
    vtho: number | string
}

const fundingAmounts = {
    tinyVetTinyVtho: { vet: '0x1', vtho: '0x1' },
    tinyVetNoVtho: { vet: '0x1', vtho: '0x0' },
    tinyVetBigVtho: { vet: '0x1', vtho: 1000e18 },
    noVetBigVtho: { vet: '0x0', vtho: 1000e18 },
    noVetMassiveVtho: { vet: '0x0', vtho: 10000e18 },
    noVetSmallVtho: { vet: '0x0', vtho: 5e18 },
    noVetTinyVtho: { vet: '0x0', vtho: '0x1' },
}

const randomFunder = () => {
    const randomIndex = Math.floor(Math.random() * testEnv.keys.length)
    return testEnv.keys[randomIndex]
}

const parseAmount = (amount: number | string): number => {
    if (typeof amount === 'number') {
        return amount
    }

    return parseInt(amount)
}

/**
 * Fund an account using the faucet. VET and VTHO will be sent to the account
 * @param account
 */
const fundAccount = async (account: string, amounts: FundingAmounts) => {
    const key = randomFunder()
    const wallet = new ThorWallet(Buffer.from(key, 'hex'))

    const clauses = []
    const vetAmount = parseAmount(amounts.vet)
    if (vetAmount > 0) {
        clauses.push({
            to: account,
            value: vetAmount.toString(16),
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
                BigInt(vthoAmount),
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

    const signature = secp256k1.sign(
        encoded,
        Buffer.from(fundingAccount, 'hex'),
    )

    return {
        transaction,
        signature,
    }
}

export {
    randomFunder,
    fundAccount,
    FAUCET_AMOUNT_HEX,
    fundingAmounts,
    FundingAmounts,
}
