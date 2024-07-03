import { Transaction } from '@vechain/sdk-core'
import { ThorWallet, generateAddress } from '../../../src/wallet'
import { TransactionDataDrivenFlow } from './setup/transaction-data-driven-flow'
import {
    checkTransactionLogSuccess,
    checkTxInclusionInBlock,
    compareSentTxWithCreatedTx,
    successfulPostTx,
    successfulReceipt
} from './setup/asserts'
import { testCase } from '../../../src/test-case'
import { fundingAmounts } from '../../../src/account-faucet'

/**
 * @group api
 * @group transactions
 */
describe('VET transfer, positive outcome', function () {
    const wallet = ThorWallet.withFunds(fundingAmounts.tinyVetBigVtho)

    beforeAll(async () => {
        await wallet.waitForFunding()
    })


    testCase(['solo', 'default-private', 'testnet'])(
        'transfer VET amount from address A to address B', async function () {
            const receivingAddr = generateAddress()
            const clauses = [
                {
                    value: 1,
                    data: '0x',
                    to: receivingAddr,
                },
            ]

            const txBody = await wallet.buildTransaction(clauses)
            const tx = new Transaction(txBody)
            const signedTx = await wallet.signTransaction(tx)

            const testPlan = {
                postTxStep: {
                    rawTx: signedTx.encoded.toString('hex'),
                    expectedResult: successfulPostTx,
                },
                getTxStep: {
                    expectedResult: (tx: any) => compareSentTxWithCreatedTx(tx, signedTx),
                },
                getTxReceiptStep: {
                    expectedResult: (receipt: any) => successfulReceipt(receipt, signedTx)
                },
                getLogTransferStep: {
                    expectedResult: (input: any, block: any) => checkTransactionLogSuccess(input, block, signedTx, signedTx.body.clauses)
                },
                getTxBlockStep: {
                    expectedResult: checkTxInclusionInBlock
                }
            }

            const ddt = new TransactionDataDrivenFlow(testPlan)
            await ddt.runTestFlow()
        })
})
