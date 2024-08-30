import { zip } from '../../../../src/utils/methods-utils'

/**
 * Represents a data-driven test flow for multiple transactions in one run.
 * This class is responsible for executing a series of test steps defined in a `TestCasePlan`.
 * Each test step corresponds to a specific action related to multiple transactions, such as posting a transactions,
 * retrieving transactions, retrieving transaction receipts, or retrieving the transactions blocks.
 * The `TestCasePlan` defines the expected results for each test step.
 */
class MultipleTransactionDataDrivenFlow {
    constructor(flows) {
        this.flows = flows
    }

    async runTestFlow() {
        const txIds = await this.postTransactions()

        await this.getTransactions(txIds)

        const blocks = await this.getTransactionsReceipts(txIds)

        await this.getLogTransfers(blocks)

        await this.getTransactionsBlocks(blocks, txIds)
    }

    async postTransactions() {
        const txIds = []
        for (const flow of this.flows) {
            const txId = await flow.postTransaction()
            if (txId) {
                txIds.push(txId)
            }
        }

        return txIds
    }

    async getTransactions(txIds) {
        for (const [flow, txId] of zip(this.flows, txIds)) {
            await flow.getTransaction(txId)
        }
    }

    async getTransactionsReceipts(txIds) {
        const blocks = []

        for (const [flow, id] of zip(this.flows, txIds)) {
            const block = await flow.getTransactionReceipt(id)
            if (block) {
                blocks.push(block)
            }
        }

        return blocks
    }

    async getLogTransfers(blocks) {
        for (const [flow, block] of zip(this.flows, blocks)) {
            await flow.getLogTransfer(block)
        }
    }

    async getTransactionsBlocks(blocks, txIds) {
        for (const [block, txId] of zip(blocks, txIds)) {
            for (const flow of this.flows) {
                await flow.getTransactionBlock(block.blockID, txId)
            }
        }
    }
}

export { MultipleTransactionDataDrivenFlow }
