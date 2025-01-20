import { Hex, Transaction } from '@vechain/sdk-core'
import { generateAddress, ThorWallet } from '../../../src/wallet'
import { TransactionDataDrivenFlow } from './setup/transaction-data-driven-flow'
import {
    checkTransactionLogSuccess,
    checkTxInclusionInBlock,
    compareSentTxWithCreatedTx,
    revertedPostTx,
    successfulPostTx,
    successfulReceipt,
    unsuccessfulReceipt,
} from './setup/asserts'
import { SimpleCounter__factory as SimpleCounter } from '../../../typechain-types'
import { Client } from '../../../src/thor-client'

/**
 * @group api
 * @group transactions
 */
describe('VET transfer, positive outcome', function () {
    const wallet = ThorWallet.withFunds()

    let counter
    let receivingAddr

    beforeAll(async () => {
        await wallet.waitForFunding()
        counter = await wallet.deployContract(
            SimpleCounter.bytecode,
            SimpleCounter.abi,
        )

        receivingAddr = await generateAddress()
    })

    it.e2eTest(
        'transfer VET amount from address A to address B',
        'all',
        async function () {
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

    it.e2eTest('send multiple clauses', 'all', async function () {
        const incrementCounter = '0x5b34b966'

        const receivingAddr = await generateAddress()
        const clauses = [
            {
                value: 1,
                data: '0x',
                to: receivingAddr,
            },
            {
                value: 0,
                data: SimpleCounter.bytecode,
                to: null,
            },
            {
                value: 0,
                data: incrementCounter,
                to: counter.address,
            },
        ]

        const txBody = await wallet.buildTransaction(clauses)
        const tx = new Transaction(txBody)
        const signedTx = await wallet.signTransaction(tx)

        const testPlan = {
            postTxStep: {
                rawTx: Hex.of(signedTx.encoded).toString(),
                expectedResult: successfulPostTx,
            },
            getTxStep: {
                expectedResult: (tx) => {
                    compareSentTxWithCreatedTx(tx, signedTx)
                },
            },
            getTxReceiptStep: {
                expectedResult: (receipt) => {
                    successfulReceipt(receipt, signedTx)
                    expect(receipt.outputs[2].events[0].data).toEqual(
                        '0x0000000000000000000000000000000000000000000000000000000000000001',
                    )
                },
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

describe('VET transfer, negative outcome', function () {
    const wallet = ThorWallet.withFunds()

    let counter
    const invalidSelector = '0xdeadbeef'
    const incrementCounter = '0x5b34b966'

    beforeAll(async () => {
        await wallet.waitForFunding()
        counter = await wallet.deployContract(
            SimpleCounter.bytecode,
            SimpleCounter.abi,
        )
    })

    it.e2eTest('multiple clauses, not enough funds', 'all', async function () {
        const newWallet = await ThorWallet.newFunded({
            vet: `0x${BigInt(10).toString(16)}`,
            vtho: 1000e18,
        })
        await newWallet.waitForFunding()

        const txBody = await newWallet.buildTransaction([
            {
                to: await generateAddress(),
                value: `0x${BigInt(5).toString(16)}`,
                data: '0x',
            },
            {
                to: await generateAddress(),
                value: `0x${BigInt(6).toString(16)}`,
                data: '0x',
            },
        ])

        const tx = new Transaction(txBody)
        const signedTx = await newWallet.signTransaction(tx)
        const testPlan = {
            postTxStep: {
                rawTx: Hex.of(signedTx.encoded).toString(),
                expectedResult: successfulPostTx,
            },
            getTxStep: {
                expectedResult: (tx) => {
                    compareSentTxWithCreatedTx(tx, signedTx)
                },
            },
            getTxReceiptStep: {
                expectedResult: (receipt) => {
                    unsuccessfulReceipt(receipt, signedTx)
                    expect(receipt.outputs.length).toBe(0)
                },
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
        const newBallance = BigInt(
            (await Client.sdk.accounts.getAccount(newWallet.address)).balance,
        )
        expect('10').toBe(newBallance.toString(10))
    })

    it.e2eTest('multiple clauses, first fails', 'all', async function () {
        const receivingAddr = await generateAddress()
        const clauses = [
            {
                value: 0,
                data: invalidSelector,
                to: counter.address,
            },
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
                rawTx: Hex.of(signedTx.encoded).toString(),
                expectedResult: successfulPostTx,
            },
            getTxStep: {
                expectedResult: (tx) => {
                    compareSentTxWithCreatedTx(tx, signedTx)
                },
            },
            getTxReceiptStep: {
                expectedResult: (receipt) => {
                    unsuccessfulReceipt(receipt, signedTx)
                    expect(receipt.outputs.length).toBe(0)
                },
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

    it.e2eTest('multiple clauses, second fails', 'all', async function () {
        const receivingAddr = await generateAddress()
        const clauses = [
            {
                value: 1,
                data: '0x',
                to: receivingAddr,
            },
            {
                value: 0,
                data: invalidSelector,
                to: counter.address,
            },
        ]

        const txBody = await wallet.buildTransaction(clauses)
        const tx = new Transaction(txBody)
        const signedTx = await wallet.signTransaction(tx)

        const testPlan = {
            postTxStep: {
                rawTx: Hex.of(signedTx.encoded).toString(),
                expectedResult: successfulPostTx,
            },
            getTxStep: {
                expectedResult: (tx) => {
                    compareSentTxWithCreatedTx(tx, signedTx)
                },
            },
            getTxReceiptStep: {
                expectedResult: (receipt) => {
                    unsuccessfulReceipt(receipt, signedTx)
                    expect(receipt.outputs.length).toBe(0)
                },
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

    it.e2eTest('multiple clauses, second lacks gas', 'all', async function () {
        const receivingAddr = await generateAddress()
        const clausesFirst = [
            {
                value: 1,
                data: '0x',
                to: receivingAddr,
            },
        ]
        const estimatedGas = (await Client.sdk.gas.estimateGas(clausesFirst))
            .totalGas
        const clauses = [
            {
                value: 1,
                data: '0x',
                to: receivingAddr,
            },
            {
                value: 0,
                data: incrementCounter,
                to: counter.address,
            },
        ]

        const txBody = await wallet.buildTransaction(clauses)
        txBody.gas = estimatedGas
        const tx = new Transaction(txBody)
        const signedTx = await wallet.signTransaction(tx)

        const testPlan = {
            postTxStep: {
                rawTx: Hex.of(signedTx.encoded).toString(),
                expectedResult: (data) =>
                    revertedPostTx(
                        data,
                        'bad tx: intrinsic gas exceeds provided gas',
                    ),
            },
        }

        const ddt = new TransactionDataDrivenFlow(testPlan)
        await ddt.runTestFlow()
    })
})
