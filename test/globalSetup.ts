import 'jest-expect-message'
import { Client } from '../src/thor-client'
import { populatedData } from '../src/populated-data'
import { testEnv, validateEnv } from '../src/test-env'
import { TransferDetails } from '../src/types'
import { transferDetails } from '../src/constants'
import { writeTransferTransactions } from '../src/logs/write-logs'
import { CompressedBlockDetail } from '@vechain/sdk-network'
import { getTransferIds } from '../src/logs/query-logs'

const populate = async () => {
    let details: TransferDetails

    switch (testEnv.type) {
        case 'mainnet':
            details = transferDetails.main
            break
        case 'testnet':
            details = transferDetails.test
            break
        case 'default-private':
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

    console.log('Populated data')
}

const setup = async () => {
    await validateEnv()
    await populate()
}

export default setup
