import {faucetAccounts} from '../src/account-faucet'
import genesis from '../network/config/genesis.json'
import path from 'path'
import fs from 'fs'

/**
 * This script takes the configured accounts in account-faucet.ts and adds them to the genesis file.
 */

const genesisPath = path.join(__dirname, '../network/config/genesis.json')

const genesisAccounts = faucetAccounts.map((account) => {
    return {
        address: account.address,
        balance:
            '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        energy: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    }
})

genesis.accounts.push(...genesisAccounts)

fs.writeFileSync(genesisPath, JSON.stringify(genesis, null, 4))
