import type { PopulatedChainData } from '../jest/globalSetup'
import { POPULATED_DATA_FILENAME } from '../jest/globalSetup'
import fs from 'fs'

export const readPopulatedData = (): PopulatedChainData =>
    JSON.parse(fs.readFileSync(POPULATED_DATA_FILENAME).toString())
