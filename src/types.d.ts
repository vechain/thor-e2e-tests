import { components } from './open-api-types'

/**
 * PopulatedChainData is the data structure that is written to the file system
 * when the chain is populated.
 * @property {string} genesisId - The id of the genesis block
 * @property {string[]} transfers - An array of transaction ids
 */
type PopulatedChainData = {
    genesisId: string
    transfersIds: string[]
    transferDetails: TransferDetails
}

/**
 * Transfer is the data structure that is returned when reading a transfer.
 * @property {Transfer['vet']} vet - The VET transfer
 * @property {Transfer['vtho']} vtho - The VTHO transfer
 * @property {Transfer['meta']} meta - The metadata of the transcation
 */
type Transfer = {
    vet: Required<components['schemas']['Transfer']>
    vtho: Required<components['schemas']['Event']>
    meta: Required<components['schemas']['ReceiptMeta']>
}

/**
 * TransferDetails is the data structure that is returned when querying multiple transfers.
 * @property {number} firstBlock - The first block of the transfers
 * @property {number} lastBlock - The last block of the transfers
 * @property {number} transferCount - The number of transfers
 */
type TransferDetails = {
    firstBlock: number
    lastBlock: number
    transferCount: number
}

export type { TransferDetails, Transfer, PopulatedChainData }
