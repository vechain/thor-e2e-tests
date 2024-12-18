import { Hex, Secp256k1, Transaction } from '@vechain/sdk-core'
import { ThorWallet } from '../../../src/wallet'
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

/**
 * @group api
 * @group transactions
 */
it.e2eTest('should send a tx with delegated payer', 'all', async function () {
    const wallet = ThorWallet.withFunds()
    const emptyWallet = await ThorWallet.empty()

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

    const sigHash = tx.getTransactionHash(emptyWallet.addressField)
    const signature = Secp256k1.sign(sigHash.bytes, wallet.privateKey)

    const finalTx = await emptyWallet.signTransaction(tx, signature)

    const testPlan = {
        postTxStep: {
            rawTx: Hex.of(finalTx.encoded).toString(),
            expectedResult: successfulPostTx,
        },
        getTxStep: {
            expectedResult: (sentTx) => {
                compareSentTxWithCreatedTx(sentTx, finalTx)
                checkDelegatedTransaction(sentTx, finalTx)
            },
        },
        getTxReceiptStep: {
            expectedResult: (receipt) => {
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
})
