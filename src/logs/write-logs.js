/**
 * @file write-logs.ts
 * @desc This file contains the functions to write VET and VTHO transfers to the blockchain.
 * It is designed to be used for blockchains that we spin up and down for testing purposes.
 * Writing to mainnet and testnet is not recommended as we only need to do that once.
 */
import { Client } from '../thor-client'
import { staticEventsTransactions } from './transactions'
import { pollReceipt } from '../transactions'

const checkAlreadyWritten = async () => {
    for (let i = 0; i < staticEventsTransactions.length; i++) {
        const blockTxs = staticEventsTransactions[i]

        for (let j = 0; j < blockTxs.length; j++) {
            const tx = blockTxs[j]
            const receipt = await Client.sdk.transactions.getTransactionReceipt(
                tx.txId,
            )
            if (receipt != null && !receipt.reverted) {
                return true
            }
        }
    }

    return false
}

const writeTransfers = async () => {
    const txs = []

    for (let i = 0; i < staticEventsTransactions.length; i++) {
        const blockTxs = staticEventsTransactions[i]

        console.log(`Sending transactions @ batch ${i}`)

        const transactions = await Promise.all(
            blockTxs.map(async ({ raw, txId }) => {
                await Client.raw.sendTransaction({ raw })

                await pollReceipt(txId)

                const receipt =
                    await Client.sdk.transactions.waitForTransaction(txId)

                return receipt
            }),
        )

        txs.push(...transactions)
    }

    return txs
}

const readTransfers = async () => {
    const txs = []

    for (let i = 0; i < staticEventsTransactions.length; i++) {
        const blockTxs = staticEventsTransactions[i]

        for (let j = 0; j < blockTxs.length; j++) {
            const tx = blockTxs[j]
            const receipt = await Client.sdk.transactions.getTransactionReceipt(
                tx.txId,
            )
            txs.push(receipt)
        }
    }

    return txs
}

export const writeTransferTransactions = async () => {
    const written = await checkAlreadyWritten()

    if (!written) {
        console.log('Writing transfers...')
        await writeTransfers()
        await Client.raw.waitForBlock()
    } else {
        console.log('Transfers already written to chain')
    }

    const txs = await readTransfers()

    // get the min block in all receipts
    const firstBlock = txs.reduce((min, tx) => {
        return tx.meta.blockNumber < min ? tx.meta.blockNumber : min
    }, txs[0].meta.blockNumber)

    const lastBlock = txs.reduce((max, tx) => {
        return tx.meta.blockNumber > max ? tx.meta.blockNumber : max
    }, txs[0].meta.blockNumber)

    return {
        firstBlock,
        lastBlock,
        transferCount: txs.length,
    }
}
