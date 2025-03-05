/**
 * @file write-logs.ts
 * @desc This file contains the functions to write VET and VTHO transfers to the blockchain.
 * It is designed to be used for blockchains that we spin up and down for testing purposes.
 * Writing to mainnet and testnet is not recommended as we only need to do that once.
 */
import { Client } from '../thor-client'
import { createTransactions } from './createTransactions'
import { pollReceipt } from '../transactions'
import { testEnv } from '../test-env'

const buildTxs = async () => {
    const genesis = await Client.raw.getBlock(0)
    return createTransactions(
        parseInt(genesis.body.id.slice(-2), 16),
        testEnv.keys,
    )
}

const checkAlreadyWritten = async () => {
    const staticEventsTransactions = await buildTxs()

    for (let i = 0; i < staticEventsTransactions.length; i++) {
        const blockTxs = staticEventsTransactions[i]

        for (let j = 0; j < blockTxs.length; j++) {
            const tx = blockTxs[j]
            const receipt = await Client.sdk.transactions.getTransactionReceipt(
                tx.txId,
            )
            if (receipt == null || receipt.reverted) {
                return false
            }
        }
    }

    return true
}

const writeTransfers = async () => {
    const transactions = []

    const staticEventsTransactions = await buildTxs()

    for (let i = 0; i < staticEventsTransactions.length; i++) {
        const blockTxs = staticEventsTransactions[i]

        console.log(
            `Sending transactions @ batch ${i} (txs=${blockTxs.length})`,
        )

        const transactions = await Promise.all(
            blockTxs.map(async ({ raw, txId }) => {
                await Client.raw.sendTransaction({ raw })

                await pollReceipt(txId)

                return await Client.sdk.transactions.waitForTransaction(txId)
            }),
        )

        transactions.push(...transactions)
    }

    return transactions
}

const readTransfers = async () => {
    const staticEventsTransactions = await buildTxs()
    const transactions = []

    for (let i = 0; i < staticEventsTransactions.length; i++) {
        const blockTxs = staticEventsTransactions[i]

        for (let j = 0; j < blockTxs.length; j++) {
            const tx = blockTxs[j]
            const receipt = await Client.sdk.transactions.getTransactionReceipt(
                tx.txId,
            )
            transactions.push(receipt)
        }
    }

    return transactions
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
