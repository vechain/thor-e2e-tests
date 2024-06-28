import { Node1Client } from '../src/thor-client'
import {
    populatedDataExists,
    readPopulatedData,
    removePopulatedData,
    writePopulatedData,
} from '../src/populated-data'
import { ThorWallet } from '../src/wallet'
import 'jest-expect-message'
import { TransferDetails } from '../src/types'
import { testEnv, validateEnv } from '../src/test-env'
import { transferDetails } from '../src/constants'
import { writeTransferTransactions } from '../src/logs/write-logs'
import { populatedData } from '../src/populated-data'
import { getTransferIds } from '../src/logs/query-logs'
import { Client } from '../src/thor-client'
import { CompressedBlockDetail } from '@vechain/sdk-network'
import * as fs from 'fs';

export const POPULATED_DATA_FILENAME = './.chain-data.json'

const populateVetAndVtho = async (): Promise<string[]> => {
    const txIds: string[] = []

    console.log('\n')

    for (let i = 0; i < 5; i++) {
        const block = await Node1Client.getBlock('best')

        console.log('Populating [block=' + block.body?.number + ']')

        const res = await Promise.all(
            Array.from({ length: 20 }, () => {
                return ThorWallet.new(true).waitForFunding()
            }),
        )

        txIds.push(...(res.map((r) => r?.meta?.txID) as string[]))
    }

    return txIds
}

/**
 * Checks if the chain is already populated with data. Checks a random 25 transactions
 */
const checkIfPopulated = async (): Promise<boolean> => {
    if (!populatedDataExists()) {
        return false
    }

    for (let i = 0; i < 25; i++) {
        const data = readPopulatedData()

        const randomIndex = Math.floor(Math.random() * data.transfers.length)

        const txReceipt = await Node1Client.getTransactionReceipt(
            data.transfers[randomIndex],
        )

        if (!txReceipt.body) {
            return false
        }
    }

    return true
}

//const populate = async () => {
//    const alreadyPopulated = await checkIfPopulated()
//
//    if (alreadyPopulated) {
//        console.log('\nChain is already populated - skipping\n')
//        return
//    }
//
//    if (populatedDataExists()) {
//        removePopulatedData()
//    }
//
//    console.log('\nGetting id of genesis block\n')
//    const genesisBlock = await Node1Client.getBlock(0)
//    const genesisBlockId = genesisBlock.body?.id || 'invalid'
//
//    const transfers = await populateVetAndVtho()
//
//    const data: PopulatedChainData = {
//        genesisBlockId,
//        transfers,
//    }
//
//    writePopulatedData(data)
//}

const populate = async () => {
    console.log('Populating data')
    let details: TransferDetails

    if (!fs.existsSync('./keys')) {
        fs.mkdirSync('./keys');
    }

    switch (testEnv.type) {
        case 'mainnet':
            details = transferDetails.main
            break
        case 'testnet':
            details = transferDetails.test
            break
        case 'default-private':
            const maxDistance = 1000
            const lastBlock = (await Client.raw.getBlock('best'))?.body
            if (lastBlock?.number! == 2) {
                details = await writeTransferTransactions()
                break
            }

            let prevBlockHeight = lastBlock?.number! - maxDistance
            if (lastBlock?.number! < maxDistance) {
                prevBlockHeight = 2
            }
            let transactionsAmount = 0
            const prevBlock = (await Client.raw.getBlock(prevBlockHeight))?.body
            for (let i = prevBlockHeight; i <= lastBlock?.number!; i++) {
                const block = (await Client.raw.getBlock(i))?.body

                const trxs = await Client.sdk.blocks.getBlockCompressed(block?.number!)
                transactionsAmount += trxs!.transactions.length
            }
            details = {
                firstBlock: prevBlock!.number!,
                lastBlock: lastBlock!.number!,
                transferCount: transactionsAmount,
            }

            console.log('Details', details)
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

    console.log('Populated data')
}
const setup = async () => {
    await validateEnv()
    await populate()
}

export default setup
