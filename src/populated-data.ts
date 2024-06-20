import fs from 'fs'
import { PopulatedChainData } from './types'
/**
 * @file populated-data.ts
 * @desc This file contains the functions to read and write the populated chain data to a JSON file for later use.
 */
export const POPULATED_DATA_FILENAME = './.chain-data.json'

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
