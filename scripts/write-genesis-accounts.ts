import { faucetAccountLength, faucetMnemonic } from '../src/constants'
import genesis from '../network/config/genesis.json'
import path from 'path'
import fs from 'fs'
import { HDNode } from '@vechain/sdk-core'

type AccountFaucet = {
    address: string
    privateKey: string
}

const generateFaucetAccounts = (): AccountFaucet[] => {
    const accounts = []

    const hdNode = HDNode.fromMnemonic(faucetMnemonic)

    for (let i = 0; i < faucetAccountLength; i++) {
        const node = hdNode.derive(i)

        accounts.push({
            privateKey: node.privateKey!.toString('hex'),
            address: node.address,
        })
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
