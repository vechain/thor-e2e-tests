import { Client } from '../src/thor-client'
import 'jest-expect-message'
import 'dotenv/config'
import { TransferDetails } from '../src/types'
import { testEnv, validateEnv } from '../src/test-env'
import { transferDetails } from '../src/constants'
import { writeTransferTransactions } from '../src/logs/write-logs'
import { populatedData } from '../src/populated-data'
import { getTransferIds } from '../src/logs/query-logs'
import { CompressedBlockDetail } from '@vechain/sdk-network'
import * as fs from 'fs'
import { contractAddresses } from '../src/contracts/addresses'
import { Energy__factory } from '../typechain-types'

export const POPULATED_DATA_FILENAME = './.chain-data.json'

const populate = async () => {
    let details: TransferDetails

    if (!fs.existsSync('./keys')) {
        fs.mkdirSync('./keys')
    }

    const transferIds: string[] = []
    switch (testEnv.type) {
        case 'mainnet':
            details = transferDetails.main
            break
        case 'testnet':
            details = transferDetails.test
            break
        case 'default-private':
            details = await writeTransferTransactions()
            break
        case 'solo': {
            details = await writeTransferTransactions()
            break
        }
        default:
            throw new Error('Invalid network type')
    }

    if (populatedData.exists()) populatedData.remove()

    const txIds = await getTransferIds(details)
    const genesisBlock =
        (await Client.sdk.blocks.getGenesisBlock()) as CompressedBlockDetail

    populatedData.write({
        genesisId: genesisBlock.id,
        transfersIds: txIds,
        transferDetails: details,
    })
}
const setup = async () => {
    await validateEnv()
    await populate()
}

export default setup
