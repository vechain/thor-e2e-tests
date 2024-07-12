import { PopulatedChainData, TransferDetails } from './types'
import { POPULATED_DATA_FILENAME } from '../test/globalSetup'
import fs from 'fs'
import { components } from './open-api-types'
import { pollReceipt } from './transactions'

export type Transfer = {
    vet: Required<components['schemas']['Transfer']>
    vtho: Required<components['schemas']['Event']>
    meta: Required<components['schemas']['ReceiptMeta']>
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
    const { transfersIds } = populatedData.read()
    const randomIndex = Math.floor(Math.random() * transfersIds.length)
    const txId = transfersIds[randomIndex]
    const txReceipt = await pollReceipt(txId)
    return formatTxReceipt(txReceipt)
}

export const populatedData = {
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

export const readTransferDetails = (): TransferDetails => {
    return populatedData.read().transferDetails
}
