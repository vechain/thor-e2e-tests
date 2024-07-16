import { Transaction } from '@vechain/sdk-core'
import { ThorWallet, generateAddress } from '../../../src/wallet'
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
import {
    AuthorizeTransaction__factory as AuthorizeTransaction,
    SimpleCounter__factory as SimpleCounter,
    Stringer__factory,
} from '../../../typechain-types'
import { Contract } from '@vechain/sdk-network'
import { Client } from '../../../src/thor-client'

/**
 * @group api
 * @group transactions
 */
describe('VET transfer, positive outcome', function() {
    const wallet = ThorWallet.withFunds()

    let counter: Contract<typeof SimpleCounter.abi>
    let failingClauses = undefined
    const receivingAddr = generateAddress()
    const invalidSelector = "0xdeadbeef"

    beforeAll(async () => {
        await wallet.waitForFunding()
        counter = await wallet.deployContract(
            SimpleCounter.bytecode,
            SimpleCounter.abi,
        )

        failingClauses = [[
            {
                value: 0,
                data: invalidSelector,
                to: counter.address
            },
            {
                value: 1,
                data: '0x',
                to: receivingAddr,
            },
        ], [
            {
                value: 1,
                data: '0x',
                to: receivingAddr,
            },
            {
                value: 0,
                data: invalidSelector,
                to: counter.address
            },
        ]]

    })


    it.e2eTest(
        'transfer VET amount from address A to address B',
        'all',
        async function() {
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
                    expectedResult: (tx: any) =>
                        compareSentTxWithCreatedTx(tx, signedTx),
                },
                getTxReceiptStep: {
                    expectedResult: (receipt: any) =>
                        successfulReceipt(receipt, signedTx),
                },
                getLogTransferStep: {
                    expectedResult: (input: any, block: any) =>
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
        'Multiple clauses success',
        'all',
        async function() {
            //const getCounter = "0x8ada066e"
            const incrementCounter = "0x5b34b966"

            const receivingAddr = generateAddress()
            const clauses = [
                {
                    value: 1,
                    data: '0x',
                    to: receivingAddr,
                },
                {
                    value: 0,
                    data: SimpleCounter.bytecode,
                    to: null
                },
                {
                    value: 0,
                    data: incrementCounter,
                    to: counter.address
                }
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
                    expectedResult: (tx: any) => {
                        compareSentTxWithCreatedTx(tx, signedTx)
                    },
                },
                getTxReceiptStep: {
                    expectedResult: (receipt: any) => {
                        successfulReceipt(receipt, signedTx)
                        expect(receipt.outputs[2].events[0].data).toEqual('0x0000000000000000000000000000000000000000000000000000000000000001')
                    },
                },
                getLogTransferStep: {
                    expectedResult: (input: any, block: any) =>
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
})



describe('VET transfer, negative outcome', function() {

    const wallet = ThorWallet.withFunds()

    let counter: Contract<typeof SimpleCounter.abi>
    const invalidSelector = "0xdeadbeef"

    beforeAll(async () => {
        await wallet.waitForFunding()
        counter = await wallet.deployContract(
            SimpleCounter.bytecode,
            SimpleCounter.abi,
        )

    });

    it.e2eTest(
        'Multiple clauses not enough funds',
        'all',
        async function() {
            const newWallet = ThorWallet.newFunded({
                vet: `0x${BigInt(10).toString(16)}`,
                vtho: 1000e18,
            })
            await newWallet.waitForFunding()

            const txBody = await newWallet.buildTransaction([
                {
                    to: generateAddress(),
                    value: `0x${BigInt(5).toString(16)}`,
                    data: '0x',
                },
                {
                    to: generateAddress(),
                    value: `0x${BigInt(6).toString(16)}`,
                    data: '0x',
                },
            ])

            const tx = new Transaction(txBody)
            const signedTx = await newWallet.signTransaction(tx)
            const testPlan = {
                postTxStep: {
                    rawTx: signedTx.encoded.toString('hex'),
                    expectedResult: successfulPostTx,
                },
                getTxStep: {
                    expectedResult: (tx: any) => {
                        compareSentTxWithCreatedTx(tx, signedTx)
                    },
                },
                getTxReceiptStep: {
                    expectedResult: (receipt: any) => {
                        unsuccessfulReceipt(receipt, signedTx)
                        expect(receipt.outputs.length).toEqual(0)
                    },
                },
                getLogTransferStep: {
                    expectedResult: (input: any, block: any) =>
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
            const newBallance = BigInt((await Client.sdk.accounts.getAccount(newWallet.address)).balance)
            expect('10').toBe(newBallance.toString(10))

        },
    )


    it.e2eTest(
        'Multiple clauses first failure',
        'all',
        async function() {
            const receivingAddr = generateAddress()
            const clauses = [
                {
                    value: 0,
                    data: invalidSelector,
                    to: counter.address
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
                    rawTx: signedTx.encoded.toString('hex'),
                    expectedResult: successfulPostTx,
                },
                getTxStep: {
                    expectedResult: (tx: any) => {
                        compareSentTxWithCreatedTx(tx, signedTx)
                    },
                },
                getTxReceiptStep: {
                    expectedResult: (receipt: any) => {
                        unsuccessfulReceipt(receipt, signedTx)
                        expect(receipt.outputs.length).toEqual(0)
                    },
                },
                getLogTransferStep: {
                    expectedResult: (input: any, block: any) =>
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
        'Multiple clauses second failure',
        'all',
        async function() {
            const receivingAddr = generateAddress()
            const clauses = [
                {
                    value: 1,
                    data: '0x',
                    to: receivingAddr,
                },
                {
                    value: 0,
                    data: invalidSelector,
                    to: counter.address
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
                    expectedResult: (tx: any) => {
                        compareSentTxWithCreatedTx(tx, signedTx)
                    },
                },
                getTxReceiptStep: {
                    expectedResult: (receipt: any) => {
                        unsuccessfulReceipt(receipt, signedTx)
                        expect(receipt.outputs.length).toEqual(0)
                    },
                },
                getLogTransferStep: {
                    expectedResult: (input: any, block: any) =>
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

})
