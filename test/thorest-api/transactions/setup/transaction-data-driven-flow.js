import { Client } from '../../../../src/thor-client'
import { pollReceipt, pollTransaction } from '../../../../src/transactions'
import { TestCasePlanStepError } from './models'

/**
 * Represents a data-driven test flow for transactions.
 * This class is responsible for executing a series of test steps defined in a `TestCasePlan`.
 * Each test step corresponds to a specific action related to transactions, such as posting a transaction,
 * retrieving a transaction, retrieving a transaction receipt, or retrieving a transaction block.
 * The `TestCasePlan` defines the expected results for each test step.
 */
class TransactionDataDrivenFlow {
    constructor(plan) {
        this.plan = plan
    }

    async runTestFlow() {
        const txId = await this.postTransaction()

        await this.getTransaction(txId)

        const block = await this.getTransactionReceipt(txId)

        await this.getTransactionBlock(block?.blockID, txId)
    }

    async postTransaction() {
        const { rawTx, expectedResult } = this.plan.postTxStep
        const sendTxResponse = await Client.raw.sendTransaction({
            raw: rawTx,
        })

        expectedResult(sendTxResponse)

        return sendTxResponse.body?.id
    }

    async callTransaction() {
        const { tx, expectedResult } = this.plan.postTxStep
        const callTxResponse = await Client.raw.callTransaction(tx)

        expectedResult(callTxResponse)
        return callTxResponse.body?.id
    }

    async getTransaction(txId) {
        if (!this.plan.getTxStep) {
            return
        }

        if (!txId) {
            throw new TestCasePlanStepError(
                'getTransaction step expected to execute, but txId is not defined',
            )
        }

        const { expectedResult } = this.plan.getTxStep

        const tx = await pollTransaction(txId, {
            pending: true,
        })

        expectedResult(tx)
    }

    async getTransactionReceipt(txId) {
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

    async getLogTransfer(block) {
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

        const logsResponse = await Client.raw.queryTransferLogs(request)

        expectedResult(logsResponse, block)
    }

    async getTransactionBlock(blockId, txId) {
        if (!this.plan.getTxBlockStep) {
            return
        }

        if (!blockId || !txId) {
            throw new TestCasePlanStepError(
                'getTransactionBlock step expected to execute, but txId or blockId are not defined',
            )
        }

        const { expectedResult } = this.plan.getTxBlockStep

        const block = await Client.raw.getBlock(blockId)

        expectedResult({ block, txId })
    }
}

function createDefaultLogFilterRequest(blockNumber) {
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
