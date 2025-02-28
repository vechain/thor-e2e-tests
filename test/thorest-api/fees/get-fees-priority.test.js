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

    const baseFee = bestBlk.body?.baseFee
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
            'should suggest a priority fee that is not the minimum',
            ['solo', 'default-private'],
            async () => {
                const wallet = ThorWallet.withFunds()

                const expectedMaxPriorityFee = 80

                // Currently we check the priority fee for the last 20 blocks

                // This loop will create 8 transactions, 1 included in each block

                // Since we sort the fees and get the position related to the 60th percentile
                // we need to have at least 8 blocks to ensure a priority fee that is the expected
                // assuming that in other tests there are no higher priority fees than this one
                for (let i = 0; i < 8; i++) {
                    await sendTransactionsWithTip(
                        wallet,
                        expectedMaxPriorityFee,
                        i,
                    )
                }

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
