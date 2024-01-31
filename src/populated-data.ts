import type { PopulatedChainData } from '../jest/globalSetup'
import { POPULATED_DATA_FILENAME } from '../jest/globalSetup'
import fs from 'fs'
import { components } from './open-api-types'

export type Transfer = {
    vet: Required<components['schemas']['Transfer']>
    vtho: Required<components['schemas']['Event']>
    meta: Required<components['schemas']['ReceiptMeta']>
}

export const readPopulatedData = (): PopulatedChainData =>
    JSON.parse(fs.readFileSync(POPULATED_DATA_FILENAME).toString())

export const readRandomTransfer = (): Transfer => {
    const data = readPopulatedData()

    const randomIndex = Math.floor(Math.random() * data.transfers.length)

    return {
        vet: data.transfers[randomIndex].outputs?.[0].transfers?.[0],
        vtho: data.transfers[randomIndex].outputs?.[1].events?.[0],
        meta: data.transfers[randomIndex].meta,
    } as Transfer
}

export const getTransferDetails = () => {
    const data = readPopulatedData()

    const sortedTransfers = data.transfers.sort((a, b) => {
        return (a.meta.blockNumber ?? 0) - (b.meta.blockNumber ?? 0)
    })

    const firstBlock = sortedTransfers[0].meta.blockNumber ?? 0
    const lastBlock =
        sortedTransfers[sortedTransfers.length - 1].meta.blockNumber ?? 0
    const transferCount = sortedTransfers.length

    return {
        firstBlock,
        lastBlock,
        transferCount,
    }
}
