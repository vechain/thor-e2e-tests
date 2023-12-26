/**
 * This script will generate 5 new accounts and add them to the genesis file, setup with balances.
 */
import {HDNode} from "thor-devkit"
import path from "path"
import fs from "fs"

const genesisPath = path.join(__dirname, '..', 'network', 'config', 'genesis.json')
const words = "denial kitchen pet squirrel other broom bar gas better priority spoil cross"
const hdNode = HDNode.fromMnemonic(words.split(" "))

const accountExists = (accounts: any[], address: string) => {
  return accounts.some((account: any) => account.address.toLowerCase() === address.toLowerCase())
}

const readGenesis = () => {
  return JSON.parse(fs.readFileSync(genesisPath, 'utf8'))
}

const writeGenesis = (genesis: any) => {
  fs.writeFileSync(genesisPath, JSON.stringify(genesis, null, 2))
}

const main = async () => {
  const genesis = readGenesis()

  let startingAccounts = genesis.accounts.length
  let index = 0

  while (genesis.accounts.length < startingAccounts + 5) {
    index++

    const nextAccount = hdNode.derive(index)

    if (accountExists(genesis.accounts, nextAccount.address)) {
      continue
    }

    genesis.accounts.push({
      "address": nextAccount.address,
      "balance": "0x14ADF4B7320334B9000000",
      "energy": "0x14ADF4B7320334B9000000"
    })

    console.log(`Added account ${nextAccount.address}`)
  }

  writeGenesis(genesis)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
