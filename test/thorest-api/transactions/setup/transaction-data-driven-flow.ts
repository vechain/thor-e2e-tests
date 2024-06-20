import { Client } from '../../../../src/thor-client'
import { pollReceipt } from '../../../../src/transactions'
import { TestCasePlan, TestCasePlanStepError } from './models'

/**
 * Represents a data-driven test flow for transactions.
 * This class is responsible for executing a series of test steps defined in a `TestCasePlan`.
 * Each test step corresponds to a specific action related to transactions, such as posting a transaction,
 * retrieving a transaction, retrieving a transaction receipt, or retrieving a transaction block.
 * The `TestCasePlan` defines the expected results for each test step.
 */
class TransactionDataDrivenFlow {
    private readonly plan: TestCasePlan

    constructor(plan: TestCasePlan) {
        this.plan = plan
    }

    public async runTestFlow() {
        const txId = await this.postTransaction()

        await this.getTransaction(txId)

        const blockId = await this.getTransactionReceipt(txId)

        await this.getTransactionBlock(blockId, txId)
    }

    private async postTransaction(): Promise<string | undefined> {
        const { rawTx, expectedResult } = this.plan.postTxStep
        const { success, body, httpCode, httpMessage } =
            await Client.raw.sendTransaction({
                raw: `0x${rawTx}`,
            })

        expectedResult({ success, body, httpCode, httpMessage })

        return body?.id
    }

    private async getTransaction(txId?: string) {
        if (!this.plan.getTxStep) {
            return
        }

        const { expectedResult } = this.plan.getTxStep
        if (!txId) {
            throw new TestCasePlanStepError(
                'getTransaction step expected to execute, but txId is not defined',
            )
        }

        const tx = await Client.raw.getTransaction(txId, {
            pending: true,
        })

        expectedResult(tx)
    }

    private async getTransactionReceipt(
        txId?: string,
    ): Promise<string | undefined> {
        if (!this.plan.getTxReceiptStep) {
            return
        }

        const { expectedResult } = this.plan.getTxReceiptStep
        if (!txId) {
            throw new TestCasePlanStepError(
                'getTransactionReceipt step expected to execute, but txId is not defined',
            )
        }

        const receipt = await pollReceipt(txId)

        expectedResult(receipt)

        return receipt.meta?.blockID
    }

    private async getTransactionBlock(
        blockId: string | undefined,
        txId: string | undefined,
    ) {
        if (!this.plan.getTxBlockStep) {
            return
        }

        const { expectedResult } = this.plan.getTxBlockStep
        if (!blockId || !txId) {
            throw new TestCasePlanStepError(
                'getTransactionBlock step expected to execute, but txId or blockId are not defined',
            )
        }

        const block = await Client.raw.getBlock(blockId)

        expectedResult({ block, txId })
    }
}

export { TransactionDataDrivenFlow }
