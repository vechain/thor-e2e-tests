import { Transaction } from '@vechain/sdk-core'
import { ThorWallet } from '../../../src/wallet'
import { TransactionDataDrivenFlow } from './setup/transaction-data-driven-flow'
import {
    checkTransactionLogSuccess,
    checkTxInclusionInBlock,
    compareSentTxWithCreatedTx,
    successfulPostTx,
    successfulReceipt,
} from './setup/asserts'

/**
 * @group api
 * @group transactions
 */
describe('Send transaction with clauses', function () {
    const wallet = ThorWallet.withFunds()

    it.e2eTest('clauses list is empty', 'all', async function () {
        const txBody = await wallet.buildTransaction([])
        const tx = new Transaction(txBody)
        const signedTx = await wallet.signTransaction(tx)

        const testPlan = {
            postTxStep: {
                rawTx: signedTx.encoded.toString('hex'),
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
    })
})
