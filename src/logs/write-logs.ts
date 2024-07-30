/**
 * @file write-logs.ts
 * @desc This file contains the functions to write VET and VTHO transfers to the blockchain.
 * It is designed to be used for blockchains that we spin up and down for testing purposes.
 * Writing to mainnet and testnet is not recommended as we only need to do that once.
 */
import { Client } from '../thor-client'
import { TransferDetails } from '../types'
import { staticEventsTransactions } from './transactions'
import { pollReceipt } from '../transactions'

export const writeTransferTransactions = async (): Promise<TransferDetails> => {
    console.log('\n')

    let firstBlock = 0
    let lastBlock = 0
    let transferCount = 0

    const client = Client.index(0)
    await client.raw.waitForBlock()

    for (let i = 0; i < staticEventsTransactions.length; i++) {
        const blockTxs: { raw: string; txId: string }[] =
            staticEventsTransactions[i]

        console.log(`Checking for batch ${i} of the event TXs...`)

        const receipts = await Promise.all(
            blockTxs.map(async (tx) => {
                let receipt =
                    await client.sdk.transactions.getTransactionReceipt(tx.txId)

                // deploy the tx and wait for it if it is not already deployed
                if (receipt == null) {
                    const newTx =
                        await client.sdk.transactions.sendRawTransaction(tx.raw)

                    await pollReceipt(newTx.id)

                    receipt =
                        await client.sdk.transactions.getTransactionReceipt(
                            newTx.id,
                        )
                }

                if (!receipt || receipt.reverted) {
                    throw new Error('Transaction failed')
                }

                if (firstBlock == 0) {
                    firstBlock = receipt.meta.blockNumber
                }

                lastBlock = receipt.meta.blockNumber

                transferCount++

                return receipt
            }),
        )

        const blocks = new Set(
            receipts.map((receipt) => receipt.meta.blockNumber),
        )

        console.log(
            `Batch ${i} of the event TXs are in blocks: ${Array.from(blocks).join(', ')}\n`,
        )
    }

    return {
        lastBlock,
        firstBlock,
        transferCount,
    }
}
