import { clauseBuilder, secp256k1, Transaction } from '@vechain/sdk-core'
import { generateAddress, ThorWallet } from '../../../src/wallet'
import { SimpleCounterParis__factory as ParisCounter } from '../../../typechain-types'
import {
    checkTxInclusionInBlock,
    compareSentTxWithCreatedTx,
    GetTxBlockExpectedResultBody,
    GetTxExpectedResultBody,
    GetTxReceiptExpectedResultBody,
    PostTxExpectedResultBody,
    revertedPostTx,
    successfulPostTx,
    successfulReceipt,
    TransactionDataDrivenFlow
} from './transaction-data-driven-flow'

/**
 * @group api
 * @group transactions
 */
describe('POST /transactions', function () {
    const wallet = ThorWallet.new(true)

    it('should send a transaction', async function () {
        const fundReceipt = await wallet.waitForFunding()

        expect(
            fundReceipt?.reverted,
            'Transaction should not be reverted',
        ).toEqual(false)
    })

    it('should send a tx with delegated payer', async function () {
        const emptyWallet = ThorWallet.new(false)

        const contract = await wallet.deployContract(
            ParisCounter.bytecode,
            ParisCounter.abi,
        )
        expect(contract.address).toBeDefined()

        const clauses = [
            {
                data: '0x8ada066e',
                value: '0x0',
                to: contract.address,
            },
        ]
        const txBody = await emptyWallet.buildTransaction(clauses)
        txBody.reserved = { features: 1 }
        const tx = new Transaction(txBody)

        const sigHash = tx.getSignatureHash(emptyWallet.address)
        const signature = secp256k1.sign(
            sigHash,
            wallet.privateKey
        )

        const finalTx = await emptyWallet.signTransaction(
            tx,
            signature,
        )

        const testPlan = {
            postTxStep: {
                rawTx: finalTx.encoded.toString('hex'),
                expectedResult: (data: PostTxExpectedResultBody) => successfulPostTx(data)
            },
            getTxStep: {
                expectedResult: (sentTx: GetTxExpectedResultBody) => compareSentTxWithCreatedTx(sentTx, finalTx)
            },
            getTxReceiptStep: {
                expectedResult: (receipt: GetTxReceiptExpectedResultBody) => successfulReceipt(receipt, finalTx)
            },
            getTxBlockStep: {
                expectedResult: (input: GetTxBlockExpectedResultBody) => checkTxInclusionInBlock(input)
            }
        };

        const tddt = new TransactionDataDrivenFlow(testPlan)
        await tddt.runTestFlow()
    })

    describe('send tx with not enough gas', function () {
        it('should fail when making a contract deployment', async function () {
            // Prepare the transaction
            const deployContractClause = clauseBuilder.deployContract(ParisCounter.bytecode)
            const txBody = await wallet.buildTransaction([deployContractClause])
            txBody.gas = 0
            const tx = new Transaction(txBody)
            const rawTx = await wallet.signAndEncodeTx(tx)

            // Create the test plan
            const testPlan = {
                postTxStep: {
                    rawTx,
                    expectedResult: (data: PostTxExpectedResultBody) => revertedPostTx(data, 'bad tx: intrinsic gas exceeds provided gas')
                }
            }

            // Run the test flow
            const ddt = new TransactionDataDrivenFlow(testPlan)
            await ddt.runTestFlow()
        })

        it('should fail when making a VET transfer', async function () {
            // Prepare the transaction
            const receivingAddr = generateAddress()
            const clauses = [
                {
                    value: 1000,
                    data: '0x',
                    to: receivingAddr,
                },
            ]
            const txBody = await wallet.buildTransaction(clauses)
            txBody.gas = 0
            const tx = new Transaction(txBody)
            const rawTx = await wallet.signAndEncodeTx(tx)

            // Create the test plan
            const testPlan = {
                postTxStep: {
                    rawTx,
                    expectedResult: (data: PostTxExpectedResultBody) => revertedPostTx(data, 'bad tx: intrinsic gas exceeds provided gas')
                }
            }

            // Run the test flow
            const ddt = new TransactionDataDrivenFlow(testPlan)
            await ddt.runTestFlow()
        })

        it('should fail when making a contract call', async function () {
            // Preconditions - deploy a contract
            const contract = await wallet.deployContract(
                ParisCounter.bytecode,
                ParisCounter.abi,
            )
            expect(contract.address).toBeDefined()

            const clauses = [
                {
                    data: '0x8ada066e',
                    value: '0x0',
                    to: contract.address,
                },
            ]
            const txBody = await wallet.buildTransaction(clauses)
            txBody.gas = 0
            const tx = new Transaction(txBody)
            const rawTx = await wallet.signAndEncodeTx(tx)

            // Create the test plan
            const testPlan = {
                postTxStep: {
                    rawTx,
                    expectedResult: (data: PostTxExpectedResultBody) => revertedPostTx(data, 'bad tx: intrinsic gas exceeds provided gas')
                }
            }

            // Run the test flow
            const ddt = new TransactionDataDrivenFlow(testPlan)
            await ddt.runTestFlow()
        })
    })
})
