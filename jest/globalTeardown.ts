import fs from 'fs'
import { POPULATED_DATA_FILENAME } from './globalSetup'

const main = async () => {
    if (fs.existsSync(POPULATED_DATA_FILENAME)) {
        fs.unlinkSync(POPULATED_DATA_FILENAME)
    }
}

export default main
