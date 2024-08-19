import { contractAddresses } from './contracts/addresses'
import { interfaces } from './contracts/hardhat'
import { secp256k1, Transaction, TransactionBody } from '@vechain/sdk-core'
import { testEnv } from './test-env'
import { ThorWallet } from './wallet'

// The funding amounts are not scaled, so `0x1` equals 1 wei
export type FundingAmounts = {
    vet?: number | string | bigint | undefined
    vtho?: number | string | bigint | undefined
}

export const fundingAmounts = {
    tinyVetTinyVtho: { vet: '0x1', vtho: '0x1' },
    tinyVetNoVtho: { vet: '0x1', vtho: '0x0' },
    tinyVetBigVtho: { vet: '0x1', vtho: 1000e18 },
    noVetBigVtho: { vet: '0x0', vtho: 1000e18 },
    noVetMassiveVtho: { vet: '0x0', vtho: 10000e18 },
    noVetSmallVtho: { vet: '0x0', vtho: 5e18 },
    noVetTinyVtho: { vet: '0x0', vtho: '0x1' },
}

export const randomFunder = () => {
    const randomIndex = Math.floor(Math.random() * testEnv.keys.length)
    return testEnv.keys[randomIndex]
}

export const funder = (index: number) => {
    return testEnv.keys[index]
}

const hexAmount = (amount?: number | string | bigint | undefined) => {
    if (amount === undefined) {
        return '0x0'
    }

    if (typeof amount === 'number') {
        return amount.toString(16)
    }

    if (typeof amount === 'bigint') {
        return amount.toString(16)
    }

    if (amount.startsWith('0x')) {
        return amount
    }

    return BigInt(amount).toString(16)
}

const parseAmount = (amount?: number | string | bigint | undefined) => {
    const hex = hexAmount(amount)

    if (hex.startsWith('0x')) {
        return hex
    }

    return `0x${hex}`
}

/**
 * Fund an account using the faucet. VET and VTHO will be sent to the account
 * @param account to sent to
 * @param amounts to send
 * @param wallet to use for funding
 */
export const fundAccount = async (
    account: string,
    amounts: FundingAmounts,
    wallet?: ThorWallet,
) => {
    if (!wallet) {
        wallet = new ThorWallet(Buffer.from(randomFunder(), 'hex'))
    }

    const clauses = []
    const vetAmount = parseAmount(amounts.vet)
    if (vetAmount !== '0x0' && vetAmount !== '0') {
        clauses.push({
            to: account,
            value: vetAmount,
            data: '0x',
        })
    }

    const vthoAmount = parseAmount(amounts.vtho)
    if (vthoAmount !== '0x0' && vthoAmount !== '0') {
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
