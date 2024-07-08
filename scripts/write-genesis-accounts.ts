import { faucetAccountLength } from '../src/constants'
import genesis from '../network/config/genesis.json'
import path from 'path'
import fs from 'fs'
import { HDNode } from '@vechain/sdk-core'
import commander from 'commander'

commander
    .usage('[OPTIONS]...')
    .option('--pks <private keys>', 'A list of private keys, comma separated')
    .option('--mnemonic <mnemonic>', 'mnemonic')
    .parse(process.argv)

const options = commander.opts()

type AccountFaucet = {
    address: string
    privateKey: string
}

const generateFaucetAccounts = (): AccountFaucet[] => {
    const accounts = []

    let hdNode: any = undefined
    if (options.pks && !options.mnemonic) {
        const privateKeys = options.pks.split(',')
        for (let i = 0; i < privateKeys.len(); i++) {
            const node = HDNode.fromPrivateKey(privateKeys[i], Buffer.from([0]))

            accounts.push({
                privateKey: node.privateKey!.toString('hex'),
                address: node.address,
            })
        }
    } else if (!options.pks && options.mnemonic) {
        hdNode = HDNode.fromMnemonic(options.mnemonic.split(' '))
    } else if (!options.pks && !options.mnemonic) {
        throw new Error('Private keys or mnemonic should be provided')
    } else {
        throw new Error('A set of keys and mnemonic are mutualy exclusive')
    }

    if (hdNode) {
        for (let i = 0; i < faucetAccountLength; i++) {
            const node = hdNode.derive(i)

            accounts.push({
                privateKey: node.privateKey!.toString('hex'),
                address: node.address,
            })
        }
    }

    return accounts
}

/**
 * This script takes the configured accounts in account-faucet.ts and adds them to the genesis file.
 */

// the first account is the endorser, remove the rest
const updatedAccounts = [genesis.accounts[0]]

const faucetAccounts = generateFaucetAccounts()

const genesisAccounts = faucetAccounts.map((account) => {
    return {
        address: account.address,
        balance:
            '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        energy: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    }
})

updatedAccounts.push(...genesisAccounts)

genesis.accounts = updatedAccounts

fs.writeFileSync(
    path.join(__dirname, '../network/config/genesis.json'),
    JSON.stringify(genesis, null, 2),
)

fs.writeFileSync(
    path.join(__dirname, '../src/faucet-accounts.json'),
    JSON.stringify(faucetAccounts, null, 2),
)
