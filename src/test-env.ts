import { addressUtils, HDNode, unitsUtils } from '@vechain/sdk-core'
import { ThorClient } from '@vechain/sdk-network'
import { genesis } from './constants'
import 'dotenv/config'

const mnemonic = process.env.MNEMONIC
const nodeUrls = process.env.NODE_URLS
const privateKeys = process.env.PRIVATE_KEYS
const networkType = process.env.NETWORK_TYPE

const NetworkTypes = ['solo', 'default-private', 'testnet', 'mainnet'] as const
type NetworkType = (typeof NetworkTypes)[number]

const testEnv = {
    get keys(): string[] {
        if (privateKeys) {
            return privateKeys.split(',')
        }

        const _mnemonic =
            mnemonic ??
            'denial kitchen pet squirrel other broom bar gas better priority spoil cross'

        const hdNode = HDNode.fromMnemonic(_mnemonic.split(' '))
        const keys = []
        for (let i = 0; i < 10; i++) {
            const child = hdNode.deriveChild(i)
            keys.push(Buffer.from(child.privateKey!).toString('hex'))
        }
        return keys
    },
    get urls(): string[] {
        if (nodeUrls) {
            return nodeUrls.split(',')
        }

        return ['http://localhost:8669']
    },
    get type(): NetworkType {
        if (networkType) {
            const type = networkType as NetworkType
            if (!NetworkTypes.includes(type)) {
                throw new Error('Invalid network type')
            }
            return type
        }

        return 'default-private'
    },
}

const validateEnv = async (): Promise<boolean> => {
    const genesisIds: string[] = []

    if (nodeUrls) {
        const urls = nodeUrls.split(',')
        for (const url of urls) {
            const client = ThorClient.fromUrl(url)
            const genesis = await client.blocks.getGenesisBlock()
            genesisIds.push(genesis!.id)
        }

        // Ensure all genesis blocks match
        if (new Set(genesisIds).size !== 1) {
            console.error('Genesis blocks do not match')
            return false
        }

        // Ensure private keys OR mnemonic are provided for testnet
        if (genesisIds.includes(genesis.test) && !(privateKeys || mnemonic)) {
            console.error(
                'Testnet genesis block detected but no private keys provided',
            )
            return false
        }

        // Ensure private keys OR mnemonic are provided for mainnet
        if (genesisIds.includes(genesis.main) && !(privateKeys || mnemonic)) {
            console.error(
                'Mainnet genesis block detected but no private keys provided',
            )
            return false
        }
    }

    const accounts = testEnv.keys.map((key) =>
        addressUtils.fromPrivateKey(Buffer.from(key, 'hex')),
    )

    for (const account of accounts) {
        if (!account.startsWith('0x')) {
            throw new Error('Invalid account address')
        }
    }

    // TODO: Validate the account balances
    // const client = ThorClient.fromUrl(testEnv.urls[0])
    //
    // // ensure each account has a balance greater than 0
    // for (const account of accounts) {
    //     const balance = await client.accounts.getAccount(account)
    //     const requiredBalance = unitsUtils.parseVET(BigInt('0x2710').toString())
    //
    //     if (BigInt(balance.balance) < requiredBalance) {
    //         throw new Error('Account balance is less than 10,000 VET')
    //     }
    //     if (BigInt(balance.energy) < requiredBalance) {
    //         throw new Error('Account energy is less than 10,000 VTHO')
    //     }
    // }

    return true
}

export { validateEnv, testEnv, NetworkType, NetworkTypes }
