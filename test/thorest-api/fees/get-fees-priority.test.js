import { Clause, Hex, HexUInt, Units, VET } from '@vechain/sdk-core'
import { expect } from 'vitest'
import { Client } from '../../../src/thor-client'
import { HEX_AT_LEAST_1 } from '../../../src/utils/hex-utils'
import { ThorWallet } from '../../../src/wallet'
import {
    checkTransactionLogSuccess,
    checkTxInclusionInBlock,
    compareSentTxWithCreatedTx,
    successfulPostTx,
    successfulReceipt,
} from '../transactions/setup/asserts'
import { TransactionDataDrivenFlow } from '../transactions/setup/transaction-data-driven-flow'

const timeout = 100000

const sendTransactionsWithTip = async (wallet, tip, vetAmountInWei) => {
    const clause = Clause.transferVET(
        wallet.address,
        VET.of(vetAmountInWei, Units.wei),
    )

    const bestBlk = await Client.raw.getBlock('best')
    expect(bestBlk.success).toBeTruthy()

    const baseFee = bestBlk.body?.baseFeePerGas
    const txBody = await wallet.buildTransaction([clause], {
        isDynFeeTx: true,
        maxFeePerGas: baseFee,
        maxPriorityFeePerGas: tip,
    })
    const signedTx = await wallet.signTransaction(txBody)

    const testPlan = {
        postTxStep: {
            rawTx: Hex.of(signedTx.encoded).toString(),
            expectedResult: successfulPostTx,
        },
        getTxStep: {
            expectedResult: (tx) => compareSentTxWithCreatedTx(tx, signedTx),
        },
        getTxReceiptStep: {
            expectedResult: (receipt) => successfulReceipt(receipt, signedTx),
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
}

/**
 * @group api
 * @group fees
 */
describe(
    'GET /fees/priority',
    function () {
        it.e2eTest('get suggested priority fee', 'all', async () => {
            const res = await Client.raw.getFeesPriority()

            expect(res.success, 'API response should be a success').toBeTruthy()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
            const expectedRes = {
                maxPriorityFeePerGas: expect.stringMatching(HEX_AT_LEAST_1),
            }
            expect(res.body, 'Expected Response Body').toEqual(expectedRes)
        })

        it.e2eTest(
            'should suggest a priority fee that is above the current one',
            ['solo', 'default-private'],
            async () => {
                const wallet = ThorWallet.withFunds()

                // 5% of the initial base fee
                const expectedMaxPriorityFee = 500_000_000_000

                const clause = Clause.transferVET(
                    wallet.address,
                    VET.of(1, Units.wei),
                )

                const bestBlk = await Client.raw.getBlock('best')
                expect(bestBlk.success).toBeTruthy()

                const baseFee = bestBlk.body?.baseFeePerGas
                const txBody = await wallet.buildTransaction([clause], {
                    isDynFeeTx: true,
                    maxFeePerGas: baseFee + expectedMaxPriorityFee,
                    maxPriorityFeePerGas: expectedMaxPriorityFee,
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

                const res = await Client.raw.getFeesPriority()

                expect(
                    res.success,
                    'API response should be a success',
                ).toBeTruthy()
                expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
                const expectedRes = {
                    maxPriorityFeePerGas: HexUInt.of(
                        expectedMaxPriorityFee,
                    ).toString(),
                }
                expect(res.body, 'Expected Response Body').toEqual(expectedRes)
            },
        )
    },
    timeout,
)
