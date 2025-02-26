import { DynFeeTransaction } from '../../../../../src/dyn-fee-transaction'
import { Clause, Address, VET, Units, Hex } from '@vechain/sdk-core'
import { ThorWallet } from '../../../../../src/wallet'
import { getBlockRef } from '../../../../../src/utils/block-utils'
import { Client } from '../../../../../src/thor-client'
import { generateNonce } from '../../../../../src/transactions'

/**
 * @group api
 * @group transactions
 * @group fork
 */
const buildTx = async (clauses, options) => {
    const bestBlockRef = await getBlockRef('best')
    const genesisBlock = await Client.raw.getBlock('0')

    if (!genesisBlock.success || !genesisBlock.body?.id) {
        throw new Error('Could not get best block')
    }

    return new DynFeeTransaction({
        blockRef: bestBlockRef,
        expiration: 1000,
        clauses: clauses,
        maxPriorityFeePerGas: options.maxPriorityFeePerGas ?? 10,
        maxFeePerGas: options.maxFeePerGas ?? 10_000_000_000_000,
        gas: 1_000_000,
        dependsOn: options?.dependsOn ?? null,
        nonce: generateNonce(),
        chainTag: parseInt(genesisBlock.body.id.slice(-2), 16),
    })
}

describe('POST /transactions', () => {
    it.e2eTest(
        'should reject a transaction with not enough maxFeePerGas to cover for the baseFee',
        ['solo', 'default-private'],
        async () => {
            const wallet = ThorWallet.withFunds()

            const clause = Clause.transferVET(
                wallet.address,
                VET.of(1, Units.wei),
            )

            const bestBlk = await Client.raw.getBlock('best')
            expect(bestBlk.success).toBeTruthy()

            const baseFee = bestBlk.body?.baseFee
            const tx = await wallet.signTransaction(
                await buildTx([clause], { maxFeePerGas: baseFee - 1 }),
            )

            const hex = Hex.of(tx.encoded)

            const res = await Client.raw.sendTransaction({
                raw: hex.toString(),
            })

            const expectedErrMsg =
                'tx rejected: max fee per gas is less than block base fee'
            expect(res.success).toBeFalsy()
            expect(res.httpMessage.trimEnd()).toBe(expectedErrMsg)
        },
    )

    it.e2eTest(
        'should reject a transaction with maxPriorityFeePerGas lower then maxFeePerGas',
        ['solo', 'default-private'],
        async () => {
            const wallet = ThorWallet.withFunds()

            const clause = Clause.transferVET(
                wallet.address,
                VET.of(1, Units.wei),
            )

            const bestBlk = await Client.raw.getBlock('best')
            expect(bestBlk.success).toBeTruthy()

            const baseFee = bestBlk.body?.baseFee
            const tx = await wallet.signTransaction(
                await buildTx([clause], {
                    maxPriorityFeePerGas: baseFee * 10,
                    maxFeePerGas: baseFee,
                }),
            )

            const hex = Hex.of(tx.encoded)

            const res = await Client.raw.sendTransaction({
                raw: hex.toString(),
            })

            const expectedErrMsg =
                'tx rejected: max fee per gas (10000000000000) must be greater than max priority fee per gas (100000000000000)'
            expect(res.success).toBeFalsy()
            expect(res.httpMessage.trimEnd()).toBe(expectedErrMsg)
        },
    )
})
