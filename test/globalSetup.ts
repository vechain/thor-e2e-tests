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

export const POPULATED_DATA_FILENAME = './.chain-data.json'

const populate = async () => {
    let details: TransferDetails

    if (!fs.existsSync('./keys')) {
        fs.mkdirSync('./keys')
    }

    let transferIds: string[] = []
    switch (testEnv.type) {
        case 'mainnet':
            details = transferDetails.main
            break
        case 'testnet':
            details = transferDetails.test
            break
        case 'default-private':
            const maxDistance = 200
            let lastBlock = (await Client.raw.getBlock('best'))!.body
            console.log('Last block', lastBlock)
            if (lastBlock!.number! <= 2) {
                await writeTransferTransactions()
            }

            let prevBlockHeight = lastBlock?.number! - maxDistance
            if (lastBlock?.number! < maxDistance) {
                prevBlockHeight = 2
            }
            let transactionsAmount = 0
            const prevBlock = (await Client.raw.getBlock(prevBlockHeight))?.body
            lastBlock = (await Client.raw.getBlock('best'))!.body
            for (let i = prevBlockHeight; i <= lastBlock?.number!; i++) {
                const block = (await Client.raw.getBlock(i))?.body

                const trxs = await Client.sdk.blocks.getBlockCompressed(
                    block?.number!,
                )

                transactionsAmount += trxs!.transactions.length
                transferIds = transferIds.concat(trxs!.transactions)
            }

            details = {
                firstBlock: prevBlock!.number!,
                lastBlock: lastBlock!.number!,
                transferCount: transactionsAmount,
            }

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
