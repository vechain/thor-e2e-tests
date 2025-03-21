import { Hex, Transaction } from '@vechain/sdk-core'
import { ThorWallet, generateAddress } from '../../../src/wallet'
import { revertedPostTx, successfulPostTx } from './setup/asserts'
import { TransactionDataDrivenFlow } from './setup/transaction-data-driven-flow'
import { fundingAmounts } from '../../../src/account-faucet'

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
        ).toBeFalsy()
    })

    it.e2eTest('should hit account limit', 'all', async () => {
        const testWallet = await ThorWallet.newFunded(fundingAmounts.bihVetBigVtho)

        for (let i = 0; i < 128; i++) {
            const receivingAddr = await generateAddress()
            const clauses = [
                {
                    value: 1,
                    data: '0x',
                    to: receivingAddr,
                },
            ]

            const txBody = await testWallet.buildTransaction(clauses)
            const tx = new Transaction(txBody)
            const signedTx = await testWallet.signTransaction(tx)

            const testPlan = {
                postTxStep: {
                    rawTx: Hex.of(signedTx.encoded).toString(),
                    expectedResult: (data) =>
                        successfulPostTx(data),
                },
            }

            const ddt = new TransactionDataDrivenFlow(testPlan)
            await ddt.runTestFlow()
        }
        const receivingAddr = await generateAddress()
        const clauses = [
            {
                value: 1,
                data: '0x',
                to: receivingAddr,
            },
        ]

        const txBody = await testWallet.buildTransaction(clauses)
        const tx = new Transaction(txBody)
        const signedTx = await testWallet.signTransaction(tx)

        const testPlan = {
            postTxStep: {
                rawTx: Hex.of(signedTx.encoded).toString(),
                expectedResult: (data) =>
                    revertedPostTx({ success: data.success, body: data.body, httpCode: 400, httpMessage: data.httpMessage},
                        "tx rejected: account quota exceeded"),
            },
        }

        const ddt = new TransactionDataDrivenFlow(testPlan)
        await ddt.runTestFlow()
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
