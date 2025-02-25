import { Eip1559Transaction } from '../../../../../src/eip-1559-transaction'
import { Clause, Address, VET, Units, Hex } from '@vechain/sdk-core'
import { ThorWallet } from '../../../../../src/wallet'
import { getBlockRef } from '../../../../../src/utils/block-utils'
import { Client } from '../../../../../src/thor-client'
import { generateNonce } from '../../../../../src/transactions'
import { TransactionDataDrivenFlow } from '../../setup/transaction-data-driven-flow'
import {
    checkTransactionLogSuccess,
    checkTxInclusionInBlock,
    compareSentTxWithCreatedTx,
    successfulPostTx,
    successfulReceipt,
} from '../../setup/asserts'

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

    return new Eip1559Transaction({
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
        'should accept and include in a block a transaction with enough maxFeePerGas',
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
            const signedTx = await wallet.signTransaction(
                await buildTx([clause], { maxFeePerGas: baseFee }),
            )

            const testPlan = {
                postTxStep: {
                    rawTx: Hex.of(signedTx.encoded).toString(),
                    expectedResult: successfulPostTx,
                },
                getTxStep: {
                    expectedResult: (tx) =>
                        compareSentTxWithCreatedTx(tx, signedTx),
                },
                getTxReceiptStep: {
                    expectedResult: (receipt) =>
                        successfulReceipt(receipt, signedTx),
                },
                getLogTransferStep: {
                    expectedResult: (input, block) =>
                        checkTransactionLogSuccess(
                            input,
                            block,
                            signedTx,
                            signedTx.body.clauses,
                        ),
                },
                getTxBlockStep: {
                    expectedResult: checkTxInclusionInBlock,
                },
            }

            const ddt = new TransactionDataDrivenFlow(testPlan)
            await ddt.runTestFlow()
        },
    )
})
