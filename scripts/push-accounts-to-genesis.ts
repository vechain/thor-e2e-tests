import {faucetAccounts} from '../src/account-faucet'
import genesis from '../network/config/genesis.json'
import path from 'path'
import fs from 'fs'

/**
 * This script takes the configured accounts in account-faucet.ts and adds them to the genesis file.
 */

// the first account is the endorser, remove the rest
const updatedAccounts = [genesis.accounts[0]]

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
