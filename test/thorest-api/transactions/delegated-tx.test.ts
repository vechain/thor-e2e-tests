import { secp256k1, Transaction } from '@vechain/sdk-core'
import { ThorWallet } from '../../../src/wallet'
import { Client } from '../../../src/thor-client'
import {
    successfulPostTx,
    compareSentTxWithCreatedTx,
    successfulReceipt,
    checkTxInclusionInBlock,
    checkDelegatedTransaction,
    checkDelegatedTransactionReceipt,
} from './setup/asserts'
import { TransactionDataDrivenFlow } from './setup/transaction-data-driven-flow'
import { SimpleCounterParis__factory as ParisCounter } from '../../../typechain-types'
import { fundingAmounts } from '../../../src/account-faucet'
import { testCase } from '../../../src/test-case'

/**
 * @group api
 * @group transactions
 */
testCase(['solo', 'default-private', 'testnet'])(
    'should send a tx with delegated payer',
    async function() {
        const wallet = ThorWallet.withFunds()
        const emptyWallet = ThorWallet.empty()

        await wallet.waitForFunding()

        const contract = await wallet.deployContract(
            ParisCounter.bytecode,
            ParisCounter.abi,
        )
        expect(contract.address).toBeDefined()

        const parisInterface = ParisCounter.createInterface()

        const clauses = [
            {
                data: parisInterface.encodeFunctionData('incrementCounter'),
                value: '0x0',
                to: contract.address,
            },
        ]
        const txBody = await emptyWallet.buildTransaction(clauses)
        txBody.reserved = { features: 1 }
        const tx = new Transaction(txBody)

        const sigHash = tx.getSignatureHash(emptyWallet.address)
        const signature = secp256k1.sign(sigHash, wallet.privateKey)

        const finalTx = await emptyWallet.signTransaction(tx, signature)

        const testPlan = {
            postTxStep: {
                rawTx: finalTx.encoded.toString('hex'),
                expectedResult: successfulPostTx,
            },
            getTxStep: {
                expectedResult: (sentTx: any) => {
                    compareSentTxWithCreatedTx(sentTx, finalTx)
                    checkDelegatedTransaction(sentTx, finalTx)
                },
            },
            getTxReceiptStep: {
                expectedResult: (receipt: any) => {
                    successfulReceipt(receipt, finalTx)
                    checkDelegatedTransactionReceipt(receipt, finalTx)
                },
            },
            getTxBlockStep: {
                expectedResult: checkTxInclusionInBlock,
            },
        }

        const tddt = new TransactionDataDrivenFlow(testPlan)
        await tddt.runTestFlow()
    },
)
