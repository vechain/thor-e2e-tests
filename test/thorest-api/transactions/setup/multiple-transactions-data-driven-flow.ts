import { components } from '../../../../src/open-api-types'
import { TransactionDataDrivenFlow } from './transaction-data-driven-flow'
import { zip } from '../../../../src/utils/methods-utils'

/**
 * Represents a data-driven test flow for multiple transactions in one run.
 * This class is responsible for executing a series of test steps defined in a `TestCasePlan`.
 * Each test step corresponds to a specific action related to multiple transactions, such as posting a transactions,
 * retrieving transactions, retrieving transaction receipts, or retrieving the transactions blocks.
 * The `TestCasePlan` defines the expected results for each test step.
 */
class MultipleTransactionDataDrivenFlow {
    private readonly flows: TransactionDataDrivenFlow[]

    constructor(flows: TransactionDataDrivenFlow[]) {
        this.flows = flows
    }

    public async runTestFlow() {
        const txIds = await this.postTransactions()

        await this.getTransactions(txIds)

        const blocks = await this.getTransactionsReceipts(txIds)

        await this.getLogTransfers(blocks)

        await this.getTransactionsBlocks(blocks, txIds)
    }

    private async postTransactions(): Promise<string[]> {
        const txIds: string[] = []
        for (const flow of this.flows) {
            const txId = await flow.postTransaction()
            if (txId) {
                txIds.push(txId)
            }
        }

        return txIds
    }

    private async getTransactions(txIds: string[]) {
        for (const [flow, txId] of zip(this.flows, txIds)) {
            await flow.getTransaction(txId)
        }
    }

    private async getTransactionsReceipts(
        txIds: string[],
    ): Promise<components['schemas']['ReceiptMeta'][]> {
        const blocks: components['schemas']['ReceiptMeta'][] = []

        for (const [flow, id] of zip(this.flows, txIds)) {
            const block = await flow.getTransactionReceipt(id)
            if (block) {
                blocks.push(block)
            }
        }

        return blocks
    }

    private async getLogTransfers(
        blocks: components['schemas']['ReceiptMeta'][],
    ) {
        for (const [flow, block] of zip(this.flows, blocks)) {
            await flow.getLogTransfer(block)
        }
    }

    private async getTransactionsBlocks(
        blocks: components['schemas']['ReceiptMeta'][],
        txIds: string[],
    ) {
        for (const [block, txId] of zip(blocks, txIds)) {
            for (const flow of this.flows) {
                await flow.getTransactionBlock(block.blockID, txId)
            }
        }
    }
}

export { MultipleTransactionDataDrivenFlow }
