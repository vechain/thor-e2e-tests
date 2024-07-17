import { Transaction } from '@vechain/sdk-core'
import { generateAddress, ThorWallet } from '../../../src/wallet'
import { TransactionDataDrivenFlow } from './setup/transaction-data-driven-flow'
import { checkTransactionLogSuccess, checkTxInclusionInBlock, compareSentTxWithCreatedTx, successfulPostTx, successfulReceipt } from './setup/asserts'
import { TestCasePlan } from './setup/models'
import { MultipleTransactionDataDrivenFlow } from './setup/multiple-transactions-data-driven-flow'

/**
 * @group api
 * @group transactions
 */
describe('dependant transaction', function () {
    const walletA = ThorWallet.withFunds()
    const walletB = ThorWallet.withFunds()

    it.e2eTest(
        'should succeed when sending two transactions where the second one is dependant on the first one',
        'all',
        async function () {
            const thirdAddress = generateAddress()

            // Prepare the first transaction
            const clausesA = [
                {
                    value: 1000,
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
                    value: 1000,
                    data: '0x',
                    to: thirdAddress,
                },
            ]
            const txBodyB = await walletB.buildTransaction(clausesB, { dependsOn: signedTxA.id })
            const txB = new Transaction(txBodyB)
            const signedTxB = await walletB.signTransaction(txB)

            // Create the test plan
            const testPlanA = {
                postTxStep: {
                    rawTx: signedTxA.encoded.toString('hex'),
                    expectedResult: successfulPostTx,
                },
                getTxStep: {
                    expectedResult: (tx: any) =>
                        compareSentTxWithCreatedTx(tx, signedTxA),
                },
                getTxReceiptStep: {
                    expectedResult: (receipt: any) =>
                        successfulReceipt(receipt, signedTxA),
                },
                getLogTransferStep: {
                    expectedResult: (input: any, block: any) =>
                        checkTransactionLogSuccess(
                            input,
                            block,
                            signedTxA,
                            signedTxA.body.clauses,
                        ),
                },
                getTxBlockStep: {
                    expectedResult: checkTxInclusionInBlock,
                }
            } as TestCasePlan

            const testPlanB = {
                postTxStep: {
                    rawTx: signedTxB.encoded.toString('hex'),
                    expectedResult: successfulPostTx,
                },
                getTxStep: {
                    expectedResult: (tx: any) =>
                        compareSentTxWithCreatedTx(tx, signedTxB),
                },
                getTxReceiptStep: {
                    expectedResult: (receipt: any) =>
                        successfulReceipt(receipt, signedTxB),
                },
                getLogTransferStep: {
                    expectedResult: (input: any, block: any) =>
                        checkTransactionLogSuccess(
                            input,
                            block,
                            signedTxB,
                            signedTxB.body.clauses,
                        ),
                },
                getTxBlockStep: {
                    expectedResult: checkTxInclusionInBlock,
                }
            } as TestCasePlan

            // Run the test flow
            const ddtA = new TransactionDataDrivenFlow(testPlanA)
            const ddtB = new TransactionDataDrivenFlow(testPlanB)

            const multipleDdt = new MultipleTransactionDataDrivenFlow([ddtA, ddtB])
            await multipleDdt.runTestFlow()
        },
    )
})
