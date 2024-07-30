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
import { TransactionReceipt } from '@vechain/sdk-network'

const checkAlreadyWritten = async () => {
    for (let i = 0; i < staticEventsTransactions.length; i++) {
        const blockTxs: { raw: string; txId: string }[] =
            staticEventsTransactions[i]

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
    const txs: TransactionReceipt[] = []

    await Client.raw.waitForBlock()

    for (let i = 0; i < staticEventsTransactions.length; i++) {
        const blockTxs: { raw: string; txId: string }[] =
            staticEventsTransactions[i]

        console.log(`Sending transactions @ batch ${i}`)

        const transactions = (await Promise.all(
            blockTxs.map(async ({ raw, txId }) => {
                await Client.raw.sendTransaction({ raw })

                await pollReceipt(txId)

                const receipt =
                    await Client.sdk.transactions.waitForTransaction(txId)

                return receipt!
            }),
        )) as TransactionReceipt[]

        txs.push(...transactions)
    }

    console.log(txs.map((tx) => tx.meta.blockID))

    return txs
}

const readTransfers = async () => {
    const txs: TransactionReceipt[] = []

    for (let i = 0; i < staticEventsTransactions.length; i++) {
        const blockTxs: { raw: string; txId: string }[] =
            staticEventsTransactions[i]

        for (let j = 0; j < blockTxs.length; j++) {
            const tx = blockTxs[j]
            const receipt = await Client.sdk.transactions.getTransactionReceipt(
                tx.txId,
            )
            txs.push(receipt!)
        }
    }

    return txs
}

export const writeTransferTransactions = async (): Promise<TransferDetails> => {
    console.log('\n')

    // run a function every 100ms until cancel
    const blockInterval = setInterval(async () => {
        const bestBlock = await Client.sdk.blocks.getBestBlockExpanded()
        console.log(
            `Current block: ${bestBlock?.number} @ ${bestBlock?.id} (Parent=${bestBlock?.parentID})`,
        )
    }, 50)

    const written = await checkAlreadyWritten()

    if (!written) {
        console.log('Writing transfers...')
        await writeTransfers()
        await Client.raw.waitForBlock()
    } else {
        console.log('Transfers already written to chain')
    }

    const txs = await readTransfers()

    console.log(txs.map((tx) => tx.meta))

    // get the min block in all receipts
    const firstBlock = txs.reduce((min, tx) => {
        return tx.meta.blockNumber < min ? tx.meta.blockNumber : min
    }, txs[0].meta.blockNumber)

    const lastBlock = txs.reduce((max, tx) => {
        return tx.meta.blockNumber > max ? tx.meta.blockNumber : max
    }, txs[0].meta.blockNumber)

    const details: TransferDetails = {
        firstBlock,
        lastBlock,
        transferCount: txs.length,
    }

    console.log('Transfer details:', details)

    clearInterval(blockInterval)

    return details
}
