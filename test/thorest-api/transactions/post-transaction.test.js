import { Hex, Transaction } from '@vechain/sdk-core'
import { ThorWallet, generateAddress } from '../../../src/wallet'
import { revertedPostTx } from './setup/asserts'
import { TransactionDataDrivenFlow } from './setup/transaction-data-driven-flow'

/**
 * @group api
 * @group transactions
 */
describe('POST /transactions', function () {
    const wallet = ThorWallet.txBetweenFunding()

    it.e2eTest('should send a transaction', 'all', async () => {
        const fundReceipt = await wallet.waitForFunding()

        expect(
            fundReceipt?.reverted,
            'Transaction should not be reverted',
        ).toEqual(false)
    })

    it.e2eTest(
        'transaction should fail, wrong chain id',
        'all',
        async function () {
            const receivingAddr = await generateAddress()
            const clauses = [
                {
                    value: 1,
                    data: '0x',
                    to: receivingAddr,
                },
            ]

            const txBody = await wallet.buildTransaction(clauses)
            txBody.chainTag = 0
            const tx = new Transaction(txBody)
            const signedTx = await wallet.signTransaction(tx)

            const testPlan = {
                postTxStep: {
                    rawTx: Hex.of(signedTx.encoded).toString(),
                    expectedResult: (data) =>
                        revertedPostTx(data, 'bad tx: chain tag mismatch'),
                },
            }

            const ddt = new TransactionDataDrivenFlow(testPlan)
            await ddt.runTestFlow()
        },
    )
})
