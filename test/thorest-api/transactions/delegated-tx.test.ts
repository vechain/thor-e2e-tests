import { secp256k1, Transaction } from "@vechain/sdk-core"
import { ThorWallet } from "../../../src/wallet"
import { successfulPostTx, compareSentTxWithCreatedTx, successfulReceipt, checkTxInclusionInBlock } from "./setup/asserts"
import { TransactionDataDrivenFlow } from "./setup/transaction-data-driven-flow"
import { SimpleCounterParis__factory as ParisCounter } from '../../../typechain-types'

/**
 * @group api
 * @group transactions
 */
it('should send a tx with delegated payer', async function () {
    const wallet = ThorWallet.new(true)
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
            expectedResult: (data: any) => successfulPostTx(data)
        },
        getTxStep: {
            expectedResult: (sentTx: any) => compareSentTxWithCreatedTx(sentTx, finalTx)
        },
        getTxReceiptStep: {
            expectedResult: (receipt: any) => successfulReceipt(receipt, finalTx)
        },
        getTxBlockStep: {
            expectedResult: (input: any) => checkTxInclusionInBlock(input)
        }
    };

    const tddt = new TransactionDataDrivenFlow(testPlan)
    await tddt.runTestFlow()
})