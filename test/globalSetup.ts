import { Node1Client } from '../src/thor-client'
import fs from 'fs'
import { readPopulatedData } from '../src/populated-data'
import { ThorWallet } from '../src/wallet'
import 'jest-expect-message'
import assert from 'node:assert'

export const POPULATED_DATA_FILENAME = './.chain-data.json'

export type PopulatedChainData = {
    transfers: string[]
}

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
    if (!fs.existsSync(POPULATED_DATA_FILENAME)) {
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

const populate = async () => {
    const alreadyPopulated = await checkIfPopulated()

    if (alreadyPopulated) {
        console.log('\nChain is already populated - skipping\n')
        return
    }

    if (fs.existsSync(POPULATED_DATA_FILENAME)) {
        fs.unlinkSync(POPULATED_DATA_FILENAME)
    }

    const transfers = await populateVetAndVtho()

    const data: PopulatedChainData = {
        transfers,
    }

    fs.writeFileSync(POPULATED_DATA_FILENAME, JSON.stringify(data, null, 4))
}

export default populate
