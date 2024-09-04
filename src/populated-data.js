import { POPULATED_DATA_FILENAME } from '../test/globalSetup'
import fs from 'fs'
import { pollReceipt } from './transactions'

const formatTxReceipt = (txReceipt) => {
    return {
        vet: txReceipt.outputs?.[0].transfers?.[0],
        vtho: txReceipt.outputs?.[1].events?.[0],
        meta: txReceipt.meta,
    }
}

export const readRandomTransfer = async () => {
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
    write: (data) => {
        fs.writeFileSync(POPULATED_DATA_FILENAME, JSON.stringify(data))
    },
    read: () => {
        if (!populatedData.exists()) {
            throw new Error('Populated data file does not exist')
        }
        const data = fs.readFileSync(POPULATED_DATA_FILENAME, 'utf-8')
        return JSON.parse(data)
    },
}

export const readTransferDetails = () => {
    return populatedData.read().transferDetails
}
