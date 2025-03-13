import { Clause, Hex, Transaction, Units, VET } from '@vechain/sdk-core'
import { Client } from '../../../../../src/thor-client'
import { ThorWallet } from '../../../../../src/wallet'
import { pollTransaction, pollReceipt } from '../../../../../src/transactions'
import { TransactionDataDrivenFlow } from '../../setup/transaction-data-driven-flow'
import {
    checkTransactionLogSuccess,
    checkTxInclusionInBlock,
    compareSentTxWithCreatedTx,
    successfulPostTx,
    successfulReceipt,
} from '../../setup/asserts'
import { TransactionDataDrivenFlow } from '../../setup/transaction-data-driven-flow'
import { utils } from 'web3'

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
            const txBody = await wallet.buildTransaction([], {
                isDynFeeTx: true,
                maxPriorityFeePerGas: baseFee,
                maxFeePerGas: baseFee * 10,
            })
            const signedTx = await wallet.signTransaction(txBody)
            const testPlan = {
                postTxStep: {
                    rawTx: Hex.of(signedTx.encoded).toString(),
                    expectedResult: successfulPostTx,
                },
            }
            const ddt = new TransactionDataDrivenFlow(testPlan)
            await ddt.runTestFlow()

            // Wait some time for the tx to be shared among the nodes
            const result = await Promise.all(
                Client.all.map((c) =>
                    pollTransaction(signedTx.id, { pending: true }, 10_000, c),
                ),
            )
            result.forEach((r) => {
                expect(r.success).toBeTruthy()
                expect(r.body?.meta).toBeNull()
            })
        },
    )

    it.e2eTest(
        'check payment logic after a legacy tx is included in a block',
        ['solo', 'default-private'],
        async () => {
            const clause = Clause.transferVET(
                wallet.address,
                VET.of(1, Units.wei),
            )

            const bestBlk = await Client.raw.getBlock('best')
            expect(bestBlk.success).toBeTruthy()

            const baseFee = bestBlk.body?.baseFee
            const txBody = await wallet.buildTransaction([clause])
            const transaction = new Transaction(txBody)
            const signedTx = await wallet.signTransaction(transaction)

            const sentRes = await Client.raw.sendTransaction({
                raw: Hex.of(signedTx.encoded).toString(),
            })
            expect(sentRes.success).toBeTruthy()

            const txId = sentRes.body?.id
            const tx = await pollTransaction(txId)
            expect(tx.success).toBeTruthy()

            const receipt = await pollReceipt(txId)

            const baseGasPrice = 1e15
            const expectedReward = receipt.gasUsed * (baseGasPrice - baseFee)
            expect(receipt.reward).toBe(
                utils.numberToHex(expectedReward.toString()),
            )
            const expectedPayment = receipt.gasUsed * baseGasPrice
            expect(receipt.paid).toBe(
                utils.numberToHex(expectedPayment.toString()),
            )
        },
    )

    it.e2eTest(
        'check payment logic after a dynamic fee tx is included in a block',
        ['solo', 'default-private'],
        async () => {
            const clause = Clause.transferVET(
                wallet.address,
                VET.of(1, Units.wei),
            )

            const bestBlk = await Client.raw.getBlock('best')
            expect(bestBlk.success).toBeTruthy()

            const baseFee = bestBlk.body?.baseFee
            const maxPriorityFeePerGas = 1_000
            const txBody = await wallet.buildTransaction([clause], {
                isDynFeeTx: true,
                maxFeePerGas: baseFee * 10,
                maxPriorityFeePerGas: maxPriorityFeePerGas,
            })
            const signedTx = await wallet.signTransaction(txBody)

            const sentRes = await Client.raw.sendTransaction({
                raw: Hex.of(signedTx.encoded).toString(),
            })
            expect(sentRes.success).toBeTruthy()

            const txId = sentRes.body?.id
            const tx = await pollTransaction(txId)
            expect(tx.success).toBeTruthy()

            const receipt = await pollReceipt(txId)

            const expectedReward = maxPriorityFeePerGas * receipt.gasUsed
            expect(receipt.reward).toBe(
                utils.numberToHex(expectedReward.toString()),
            )
            const expectedPayment = receipt.gasUsed * baseFee + expectedReward
            expect(receipt.paid).toBe(
                utils.numberToHex(expectedPayment.toString()),
            )
        },
    )
})
