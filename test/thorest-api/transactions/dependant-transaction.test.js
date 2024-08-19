import { Transaction } from '@vechain/sdk-core'
import { generateAddress, ThorWallet } from '../../../src/wallet'
import { TransactionDataDrivenFlow } from './setup/transaction-data-driven-flow'
import {
    checkTransactionLogSuccess,
    checkTxInclusionInBlock,
    compareSentTxWithCreatedTx,
    successfulPostTx,
    successfulReceipt,
} from './setup/asserts'
import { MultipleTransactionDataDrivenFlow } from './setup/multiple-transactions-data-driven-flow'

/**
 * @group api
 * @group transactions
 * @group dependant
 */
describe('dependant transaction', function () {
    it.e2eTest(
        'should succeed when sending two transactions where the second one is dependant on the first one',
        'all',
        async function () {
            const initialFunds = 1000
            const transferAmount = initialFunds ** 2

            const walletA = ThorWallet.withFunds()
            const walletB = ThorWallet.newFunded({
                vet: `0x${BigInt(initialFunds).toString(16)}`,
                vtho: 1000e18,
            })
            const thirdAddress = generateAddress()

            // Prepare the first transaction
            const clausesA = [
                {
                    value: transferAmount,
                    data: '0x',
                    to: walletB.address,
                },
            ]
            const txBodyA = await walletA.buildTransaction(clausesA)
            const txA = new Transaction(txBodyA)
            const signedTxA = await walletA.signTransaction(txA)

            // Prepare the second transaction
            const clausesB = [
                {
                    value: transferAmount,
                    data: '0x',
                    to: thirdAddress,
                },
            ]
            const txBodyB = await walletB.buildTransaction(clausesB, {
                dependsOn: signedTxA.id,
            })
            const txB = new Transaction(txBodyB)
            const signedTxB = await walletB.signTransaction(txB)

            // Create the test plan
            const testPlanA = {
                postTxStep: {
                    rawTx: signedTxA.encoded.toString('hex'),
                    expectedResult: successfulPostTx,
                },

                getTxStep: {
                    expectedResult: (tx) =>
                        compareSentTxWithCreatedTx(tx, signedTxA),
                },

                getTxReceiptStep: {
                    expectedResult: (receipt) =>
                        successfulReceipt(receipt, signedTxA),
                },

                getLogTransferStep: {
                    expectedResult: (input, block) =>
                        checkTransactionLogSuccess(
                            input,
                            block,
                            signedTxA,
                            signedTxA.body.clauses,
                        ),
                },

                getTxBlockStep: {
                    expectedResult: checkTxInclusionInBlock,
                },
            }

            const testPlanB = {
                postTxStep: {
                    rawTx: signedTxB.encoded.toString('hex'),
                    expectedResult: successfulPostTx,
                },

                getTxStep: {
                    expectedResult: (tx) =>
                        compareSentTxWithCreatedTx(tx, signedTxB),
                },

                getTxReceiptStep: {
                    expectedResult: (receipt) =>
                        successfulReceipt(receipt, signedTxB),
                },

                getLogTransferStep: {
                    expectedResult: (input, block) =>
                        checkTransactionLogSuccess(
                            input,
                            block,
                            signedTxB,
                            signedTxB.body.clauses,
                        ),
                },

                getTxBlockStep: {
                    expectedResult: checkTxInclusionInBlock,
                },
            }

            // Run the test flow
            const ddtA = new TransactionDataDrivenFlow(testPlanA)
            const ddtB = new TransactionDataDrivenFlow(testPlanB)

            const multipleDdt = new MultipleTransactionDataDrivenFlow([
                ddtA,
                ddtB,
            ])
            await multipleDdt.runTestFlow()
        },
    )
})
