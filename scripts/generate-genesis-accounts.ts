/**
 * Generates N new accounts and prints the addresses and private keys.
 */
import { HDNode, mnemonic } from 'thor-devkit'
import genesis from '../network/config/genesis.json'
import accounts from '../network/config/account-keys.json'
import fs from 'fs'
import path from 'path'

type GenesisAccount = {
    address: string
    balance: string
    energy: string
}
const parseParam = (name: string): string | undefined => {
    for (const arg of process.argv) {
        if (arg.startsWith(`--${name}=`)) {
            const value = arg.slice(`--${name}=`.length)
            if (value.length > 0) {
                return value
            }
        }
    }
}

const parseIntParam = (name: string): number | undefined => {
    const value = parseParam(name)
    if (value) {
        return parseInt(value)
    }
}

const writeGenesis = (newAccounts: any[]) => {
    const genesisAccounts: GenesisAccount[] = newAccounts.map((acc) => {
        return {
            address: acc.address,
            balance: acc.balance,
            energy: acc.energy,
        }
    })

    // @ts-ignore
    genesis.accounts = [...genesis.accounts, ...genesisAccounts]

    const genesisPath = path.join(
        __dirname,
        '..',
        'network',
        'config',
        'genesis.json',
    )

    fs.writeFileSync(genesisPath, JSON.stringify(genesis, null, 4))
}

const writeKeys = (newAccounts: any[]) => {
    const _newAccounts = newAccounts.map((acc) => {
        return {
            address: acc.address,
            privateKey: acc.privateKey,
        }
    })

    const updatedAccounts = [...accounts, ..._newAccounts]

    const keysPath = path.join(
        __dirname,
        '..',
        'network',
        'config',
        'account-keys.json',
    )

    fs.writeFileSync(keysPath, JSON.stringify(updatedAccounts, null, 4))
}

const main = async () => {
    const amount = parseIntParam('amount') ?? 5

    console.log(`Generating ${amount} accounts...`)

    const words = mnemonic.generate()

    console.log(words.join(' '))
    const hdNode = HDNode.fromMnemonic(words)
    const newAccounts = []

    for (let i = 0; i < amount; i++) {
        const account = hdNode.derive(i)
        const accWithBalance = {
            address: account.address,
            balance: '0x14ADF4B7320334B9000000',
            energy: '0x14ADF4B7320334B9000000',
            privateKey: account.privateKey?.toString('hex'),
        }
        newAccounts.push(accWithBalance)
    }

    writeGenesis(newAccounts)
    writeKeys(newAccounts)
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
