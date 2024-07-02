import { components } from '../../../../src/open-api-types'
import { Client, Node1Client } from '../../../../src/thor-client'
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

        const block = await this.getTransactionReceipt(txId)

        //await this.getLogTransfer(block)

        await this.getTransactionBlock(block?.blockID, txId)
    }

    private async postTransaction(): Promise<string | undefined> {
        const { rawTx, expectedResult } = this.plan.postTxStep
        const sendTxResponse =
            await Client.raw.sendTransaction({
                raw: `0x${rawTx}`,
            })


        expectedResult(sendTxResponse)

        return sendTxResponse.body?.id
    }

    private async getTransaction(txId?: string) {
        if (!this.plan.getTxStep) {
            return
        }

        if (!txId) {
            throw new TestCasePlanStepError(
                'getTransaction step expected to execute, but txId is not defined',
            )
        }

        const { expectedResult } = this.plan.getTxStep

        const tx = await Node1Client.getTransaction(txId, {
            pending: true,
        })

        expectedResult(tx)
    }

    private async getTransactionReceipt(
        txId?: string,
    ): Promise<components['schemas']['ReceiptMeta'] | undefined> {
        if (!this.plan.getTxReceiptStep) {
            return
        }

        if (!txId) {
            throw new TestCasePlanStepError(
                'getTransactionReceipt step expected to execute, but txId is not defined',
            )
        }

        const { expectedResult } = this.plan.getTxReceiptStep

        const receipt = await pollReceipt(txId)

        expectedResult(receipt)

        return receipt.meta
    }

    private async getLogTransfer(
        block: components['schemas']['ReceiptMeta'] | undefined
    ) {
        if (!this.plan.getLogTransferStep) {
            return
        }

        if (!block) {
            throw new TestCasePlanStepError(
                'getLogTransfer step expected to execute, but block is not defined',
            )
        }

        const { blockNumber } = block
        const { expectedResult, logFilters } = this.plan.getLogTransferStep
        const request = logFilters ?? createDefaultLogFilterRequest(blockNumber)

        const logsResponse = await Node1Client.queryTransferLogs(request)

        expectedResult(logsResponse, block)
    }

    private async getTransactionBlock(
        blockId: string | undefined,
        txId: string | undefined,
    ) {
        if (!this.plan.getTxBlockStep) {
            return
        }

        if (!blockId || !txId) {
            throw new TestCasePlanStepError(
                'getTransactionBlock step expected to execute, but txId or blockId are not defined',
            )
        }

        const { expectedResult } = this.plan.getTxBlockStep

        const block = await Node1Client.getBlock(blockId)

        expectedResult({ block, txId })
    }
}

function createDefaultLogFilterRequest(
    blockNumber: number | undefined
): components['schemas']['TransferLogFilterRequest'] {
    return {
        range: {
            to: blockNumber,
            from: blockNumber,
            unit: 'block',
        },
        options: null,
        criteriaSet: null,
    }
}

export { TransactionDataDrivenFlow }
