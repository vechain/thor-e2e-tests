import { PopulatedChainData } from './types'
import { POPULATED_DATA_FILENAME } from '../test/globalSetup'
import fs from 'fs'
import { components } from './open-api-types'
import { Node1Client } from './thor-client'
import { pollReceipt } from './transactions'

export type Transfer = {
    vet: Required<components['schemas']['Transfer']>
    vtho: Required<components['schemas']['Event']>
    meta: Required<components['schemas']['ReceiptMeta']>
}

let populateData: PopulatedChainData | undefined

export const populatedDataExists = () => {
    return fs.existsSync(POPULATED_DATA_FILENAME)
}

export const writePopulatedData = (data: PopulatedChainData) => {
    fs.writeFileSync(POPULATED_DATA_FILENAME, JSON.stringify(data))
}

export const removePopulatedData = () => {
    if (populatedDataExists()) {
        fs.unlinkSync(POPULATED_DATA_FILENAME)
    }
}

export const readPopulatedData = (): PopulatedChainData => {
    if (populateData) {
        return populateData
    }

    if (!fs.existsSync(POPULATED_DATA_FILENAME)) {
        throw new Error('Chain data not populated')
    }

    const data = fs.readFileSync(POPULATED_DATA_FILENAME, 'utf-8')
    populateData = JSON.parse(data) as PopulatedChainData

    return populateData
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
export const getGenesisBlockId = () => {
    const data = readPopulatedData()

    return data.genesisId
}

export const readRandomTransfer = async (): Promise<Transfer> => {
    const data = readPopulatedData()

    const randomIndex = Math.floor(Math.random() * data.transfersIds.length)

    const txReceipt = await Node1Client.getTransactionReceipt(
        data.transfersIds[randomIndex],
    )

    if (!txReceipt.body || !txReceipt.success) return readRandomTransfer()

    return formatTxReceipt(txReceipt.body!)
}

type TransferDetails = {
    firstBlock: number
    lastBlock: number
    transferCount: number
}

let transferDetails: TransferDetails | undefined

export const getTransferDetails = async () => {
    if (transferDetails) {
        return transferDetails
    }

    const data = readPopulatedData()

    const transfers = (
        await Promise.all(
            data.transfersIds.map(async (txId) => {
                try {
                    return pollReceipt(txId, 10_000)
                } catch {
                    /* empty */
                }
            }),
        )
    ).filter((t) => t) as Transfer[]

    const sortedTransfers = transfers.sort((a, b) => {
        return (a.meta.blockNumber ?? 0) - (b.meta.blockNumber ?? 0)
    })

    const firstBlock = sortedTransfers[0].meta.blockNumber ?? 0
    const lastBlock =
        sortedTransfers[sortedTransfers.length - 1].meta.blockNumber ?? 0
    const transferCount = sortedTransfers.length

    transferDetails = {
        firstBlock,
        lastBlock,
        transferCount,
    }

    return transferDetails
}
