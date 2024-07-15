import { Transaction } from '@vechain/sdk-core'
import { ThorWallet, generateAddress } from '../../../src/wallet'
import { TransactionDataDrivenFlow } from './setup/transaction-data-driven-flow'
import {
    checkTransactionLogSuccess,
    checkTxInclusionInBlock,
    compareSentTxWithCreatedTx,
    successfulPostTx,
    successfulReceipt,
} from './setup/asserts'
import {
    AuthorizeTransaction__factory as AuthorizeTransaction,
    SimpleCounter__factory as SimpleCounter,
    Stringer__factory,
} from '../../../typechain-types'
import { Contract } from '@vechain/sdk-network'

/**
 * @group api
 * @group transactions
 */
describe('VET transfer, positive outcome', function() {
    const wallet = ThorWallet.withFunds()

    let counter: Contract<typeof SimpleCounter.abi>

    beforeAll(async () => {
        await wallet.waitForFunding()
        counter = await wallet.deployContract(
            SimpleCounter.bytecode,
            SimpleCounter.abi,
        )
        console.log("Contract address", counter.address)
    })

    it.e2eTest(
        'transfer VET amount from address A to address B',
        'all',
        async function() {
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
        'Multiple clauses',
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
