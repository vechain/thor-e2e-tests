import { Clause, Hex, Units, VET } from '@vechain/sdk-core'
import { Client } from '../../../../../src/thor-client'
import { ThorWallet } from '../../../../../src/wallet'
import {
    checkTransactionLogSuccess,
    checkTxInclusionInBlock,
    compareSentTxWithCreatedTx,
    successfulPostTx,
    successfulReceipt,
} from '../../setup/asserts'
import { TransactionDataDrivenFlow } from '../../setup/transaction-data-driven-flow'

/**
 * @group api
 * @group transactions
 * @group fork
 */

describe('POST /transactions', () => {
    let wallet

    beforeAll(async () => {
        wallet = ThorWallet.withFunds()
    })
    it.e2eTest(
        'should accept and include in a block a dynamic fee transaction with enough maxFeePerGas',
        ['solo', 'default-private'],
        async () => {
            const clause = Clause.transferVET(
                wallet.address,
                VET.of(1, Units.wei),
            )

            const bestBlk = await Client.raw.getBlock('best')
            expect(bestBlk.success).toBeTruthy()

            const baseFee = bestBlk.body?.baseFee
            const txBody = await wallet.buildTransaction([clause], {
                isDynFeeTx: true,
                maxFeePerGas: baseFee,
            })
            const signedTx = await wallet.signTransaction(txBody)

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

    it.e2eTest(
        'a dynamic fee transaction should be shared among the nodes',
        ['solo', 'default-private'],
        async () => {
            const bestBlk = await Client.raw.getBlock('best')
            expect(bestBlk.success).toBeTruthy()

            const baseFee = bestBlk.body?.baseFee
            const signedTx = await wallet.signTransaction(
                await buildTx([], { maxFeePerGas: baseFee }),
            )
            const testPlan = {
                postTxStep: {
                    rawTx: Hex.of(signedTx.encoded).toString(),
                    expectedResult: successfulPostTx,
                },
            }
            const ddt = new TransactionDataDrivenFlow(testPlan)
            await ddt.runTestFlow()

            // Wait some time for the tx to be shared among the nodes
            await new Promise((resolve) => setTimeout(resolve, 100))

            // Check all the other nodes have the tx
            for (const client of Client.all) {
                const tx = await client.getTransaction(signedTx.id, {
                    pending: true,
                })
                expect(tx.success).toBeTruthy()
                expect(tx.body?.id).toBe(signedTx.id.toString())
                // Check for null meta, the tx is not yet been included in a block
                expect(tx.body?.meta).toBeNull()
            }
        },
    )
})
