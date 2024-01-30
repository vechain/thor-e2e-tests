import { generateWalletWithFunds } from '../src/wallet'
import { Node1Client } from '../src/thor-client'
import { ethers } from 'hardhat'
import fs from 'fs'
import { GetTxReceiptResponse } from '../src/open-api-types-padded'

export const POPULATED_DATA_FILENAME = './.chain-data.json'

const ContractKeys = [
    'EventsContract',
    'EvmMethods',
    'MyERC20',
    'MyERC721',
    'SimpleCounter',
] as const

export type ContractKey = (typeof ContractKeys)[number]

export type PopulatedChainData = {
    transfers: GetTxReceiptResponse[]
    contracts: Record<ContractKey, string>
}

const populateVetAndVtho = async (): Promise<GetTxReceiptResponse[]> => {
    const accounts: GetTxReceiptResponse[] = []

    console.log('\n')

    for (let i = 0; i < 5; i++) {
        const block = await Node1Client.getBlock('best')

        console.log('Populating [block=' + block.body?.number + ']')

        const res = await Promise.all(
            Array.from(
                { length: 40 },
                async () => await generateWalletWithFunds(),
            ),
        )

        accounts.push(...res.map((r) => r.receipt))
    }

    return accounts
}

const deploySmartContracts = async (): Promise<Record<ContractKey, string>> => {
    const signers = await ethers.getSigners()

    const contracts: Partial<Record<ContractKey, string>> = {}

    await Promise.all(
        ContractKeys.map(async (contractName, i) => {
            const factory = await ethers.getContractFactory(contractName)

            const contract = await factory.connect(signers[i]).deploy()

            contracts[contractName] = await contract.getAddress()

            console.log(
                'Deployed [' +
                    contractName +
                    '] at [' +
                    contracts[contractName] +
                    ']',
            )
        }),
    )

    return contracts as Record<ContractKey, string>
}

const populate = async () => {
    if (fs.existsSync(POPULATED_DATA_FILENAME)) {
        fs.unlinkSync(POPULATED_DATA_FILENAME)
    }

    const [transfers, contracts] = await Promise.all([
        populateVetAndVtho(),
        deploySmartContracts(),
    ])

    const data: PopulatedChainData = {
        transfers,
        contracts,
    }

    fs.writeFileSync(POPULATED_DATA_FILENAME, JSON.stringify(data, null, 4))
}

export default populate
