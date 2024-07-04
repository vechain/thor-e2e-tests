/**
 * @file query-logs.ts
 * @desc This file contains the functions to query VET and VTHO transfers from the blockchain.
 */
import { Transfer, TransferDetails } from '../types'
import { components } from '../open-api-types'
import {
    ExpandedBlockDetail,
    TransactionsExpandedBlockDetail,
} from '@vechain/sdk-network'
import { Client } from '../thor-client'
import { populatedData } from '../populated-data'

const hasVetTransfer = (tx: TransactionsExpandedBlockDetail): boolean => {
    return tx.outputs[0]?.transfers.length > 0
}

const hasVthoTransfer = (tx: TransactionsExpandedBlockDetail): boolean => {
    return (
        tx.outputs[1]?.events[0].topics[0] ===
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
        tx.outputs[1]?.events[0].address ===
            '0x0000000000000000000000000000456e65726779'
    )
}

export const getTransferIds = async (
    transferDetails: TransferDetails,
): Promise<string[]> => {
    const { lastBlock, firstBlock } = transferDetails

    const txs: TransactionsExpandedBlockDetail[] = []

    for (let i = firstBlock; i <= lastBlock; i++) {
        const block = (await Client.sdk.blocks.getBlockExpanded(
            i,
        )) as ExpandedBlockDetail
        txs.push(...block.transactions)
    }

    return txs
        .filter((tx) => {
            return hasVetTransfer(tx) && hasVthoTransfer(tx)
        })
        .map((tx) => tx.id)
}

const formatTxReceipt = (
    txReceipt: components['schemas']['GetTxReceiptResponse'],
): Transfer => {
    return {
        vet: txReceipt.outputs?.[0].transfers?.[0] as Transfer['vet'],
        vtho: txReceipt.outputs?.[1].events?.[0] as Transfer['vtho'],
        meta: txReceipt.meta as Transfer['meta'],
    }
}

export const getRandomTransfer = async (): Promise<Transfer> => {
    const data = populatedData.read()
    const randomIndex = Math.floor(Math.random() * data.transfersIds.length)
    const tx = data.transfersIds[randomIndex]
    const txReceipt = await Client.raw.getTransactionReceipt(tx)
    return formatTxReceipt(txReceipt.body!)
}
