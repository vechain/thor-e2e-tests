import { Node1Client } from '../src/thor-client'
import { components } from '../src/open-api-types'
import fs from 'fs'
import { readRandomTransfer } from '../src/populated-data'
import { ThorWallet } from '../src/wallet'

export const POPULATED_DATA_FILENAME = './.chain-data.json'

const ContractKeys = [
    'EvmMethods',
    'MyERC20',
    'MyERC721',
    'SimpleCounter',
] as const

export type ContractKey = (typeof ContractKeys)[number]

type GetTxReceiptResponse = Required<
    components['schemas']['GetTxReceiptResponse']
>

export type PopulatedChainData = {
    transfers: GetTxReceiptResponse[]
}

const populateVetAndVtho = async (): Promise<GetTxReceiptResponse[]> => {
    const accounts: GetTxReceiptResponse[] = []

    console.log('\n')

    for (let i = 0; i < 5; i++) {
        const block = await Node1Client.getBlock('best')

        console.log('Populating [block=' + block.body?.number + ']')

        const res = await Promise.all(
            Array.from({ length: 40 }, async () => {
                return await ThorWallet.new(true).then((r) => r.fundReceipt)
            }),
        )

        accounts.push(...res.map((r) => r as GetTxReceiptResponse))
    }

    return accounts
}

/**
 * Checks if the chain is already populated with data. Checks a random 25 transactions
 */
const checkIfPopulated = async (): Promise<boolean> => {
    if (!fs.existsSync(POPULATED_DATA_FILENAME)) {
        return false
    }

    for (let i = 0; i < 25; i++) {
        const transfer = readRandomTransfer()

        const acc = await Node1Client.getAccount(transfer.vet.recipient)

        if (acc.body?.balance === '0x' || acc.body?.energy === '0x') {
            return false
        }
    }

    return true
}

const populate = async () => {
    const alreadyPopulated = await checkIfPopulated()

    if (alreadyPopulated) {
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
