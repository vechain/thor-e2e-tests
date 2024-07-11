import { PopulatedChainData, TransferDetails } from './types'
import { POPULATED_DATA_FILENAME } from '../test/globalSetup'
import fs from 'fs'
import { components } from './open-api-types'
import { Client } from './thor-client'
import { pollReceipt } from './transactions'
import { staticEventsTransactions } from './logs/transactions'

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

export const readRandomTransfer = async (): Promise<Transfer> => {
    const randomBlockIndex = Math.floor(
        Math.random() * staticEventsTransactions.length,
    )
    const blockTxs = staticEventsTransactions[randomBlockIndex]
    const randomBlockTxIndex = Math.floor(Math.random() * blockTxs.length)
    const txId = blockTxs[randomBlockTxIndex].txId
    const txReceipt = await Client.raw.getTransactionReceipt(txId)
    return formatTxReceipt(txReceipt.body!)
}

export const readTransferDetails = (): TransferDetails => {
    return readPopulatedData().transferDetails
}

const populatedData = {
    exists: () => {
        return fs.existsSync(POPULATED_DATA_FILENAME)
    },
    remove: () => {
        if (populatedData.exists()) {
            fs.unlinkSync(POPULATED_DATA_FILENAME)
        }
    },
    write: (data: PopulatedChainData) => {
        fs.writeFileSync(POPULATED_DATA_FILENAME, JSON.stringify(data))
    },
    read: (): PopulatedChainData => {
        if (!populatedData.exists()) {
            throw new Error('Populated data file does not exist')
        }
        const data = fs.readFileSync(POPULATED_DATA_FILENAME, 'utf-8')
        return JSON.parse(data) as PopulatedChainData
    },
}

export { populatedData }
