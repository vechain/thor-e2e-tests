import { HDKey } from '@vechain/sdk-core'
import { ThorClient } from '@vechain/sdk-network'
import { genesis } from './constants'

const mnemonic = process.env.MNEMONIC
const nodeUrls = process.env.NODE_URLS
const privateKeys = process.env.PRIVATE_KEYS
const networkType = process.env.NETWORK_TYPE

export const E2eTestTags = ['solo', 'default-private', 'testnet', 'mainnet']

export const testEnv = {
    get keys() {
        if (privateKeys) {
            return privateKeys.split(',')
        }

        if (!mnemonic) {
            throw new Error('No mnemonic provided')
        }
        const hdNode = HDKey.fromMnemonic(mnemonic.split(' '))
        const keys = []
        for (let i = 0; i < 10; i++) {
            const child = hdNode.deriveChild(i)
            keys.push(Buffer.from(child.privateKey).toString('hex'))
        }

        return keys
    },
    get urls() {
        if (nodeUrls) {
            return nodeUrls.split(',')
        }

        return ['http://localhost:8669']
    },
    get type() {
        if (networkType) {
            const type = networkType
            if (!E2eTestTags.includes(type)) {
                throw new Error('Invalid network type')
            }
            return type
        }

        return 'default-private'
    },
}

export const validateEnv = async () => {
    const genesisIds = []

    if (nodeUrls) {
        const urls = nodeUrls.split(',')
        for (const url of urls) {
            const client = ThorClient.fromUrl(url)
            const genesis = await client.blocks.getGenesisBlock()
            genesisIds.push(genesis.id)
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

    // TODO: Validate the account balances
    // const client = ThorClient.fromUrl(testEnv.urls[0])

    // ensure each account has a balance greater than 0
    // for (const account of testEnv.keys) {
    //     const address = addressUtils.fromPrivateKey(
    //         new Buffer(account.replace('0x', ''), 'hex'),
    //     )
    //     const balance = await client.accounts.getAccount(address)
    //0x2710
    // const requiredBalance = unitsUtils.parseVET(BigInt('0x3e8').toString())

    //if (BigInt(balance.balance) < requiredBalance) {
    //    throw new Error('Account balance is less than 10,000 VET')
    //}
    //if (BigInt(balance.energy) < requiredBalance) {
    //    throw new Error('Account energy is less than 10,000 VTHO')
    //}
    // }

    return true
}
