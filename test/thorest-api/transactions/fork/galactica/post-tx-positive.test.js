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
})
