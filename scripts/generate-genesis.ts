import prompts from 'prompts'
import * as sdk from '@vechain/sdk-core'
import * as fs from 'fs'

const forkConfigs = [
    'VIP191',
    'ETH_CONST',
    'BLOCKLIST',
    'ETH_IST',
    'VIP214',
    'FINALITY',
]

const main = async () => {
    const genesisAccounts = []
    const genesisKeys = []
    const authorityAccounts = []
    const authorityKeys = []
    const endorsorAccounts = []
    const genesis: any = {}

    const { gasLimit } = await prompts({
        type: 'number',
        name: 'gasLimit',
        message: 'Enter the gas limit for the genesis block',
        initial: '40000000',
        min: 10_000_000,
        max: 100_000_000,
    })
    genesis.gasLimit = gasLimit

    const { extraData } = await prompts({
        type: 'text',
        name: 'extraData',
        message: 'Enter the extra data for the genesis block',
        initial: 'My Custom Genesis Block',
    })
    genesis.extraData = extraData

    genesis.forkConfig = {}
    for (const config of forkConfigs) {
        const { blockNumber } = await prompts({
            type: 'number',
            name: 'blockNumber',
            message: `Enter the block number for the ${config} fork`,
            initial: 0,
            validate: (value) =>
                value >= 0
                    ? true
                    : 'Block number must be greater than or equal to 0',
        })
        genesis.forkConfig[config] = blockNumber
    }

    const { amount } = await prompts({
        type: 'number',
        name: 'amount',
        message:
            'Enter the amount (Millions) of VET and VTHO to allocate to the genesis accounts',
        initial: 1000,
    })

    const balance = BigInt(amount) * BigInt(1e6) * BigInt(1e18)

    const { accounts } = await prompts({
        type: 'number',
        name: 'accounts',
        message: 'Enter the number of genesis accounts',
        initial: 10,
        min: 1,
        max: 1000,
    })

    for (let i = 0; i < accounts; i++) {
        const key = await sdk.Secp256k1.generatePrivateKey()
        const keyHex = Buffer.of(...key).toString('hex')
        const address = sdk.Address.ofPrivateKey(key)
        genesisAccounts[i] = {
            address: address.toString(),
            balance: `0x` + balance.toString(16),
            energy: `0x` + balance.toString(16),
        }
        genesisKeys[i] = {
            address: address.toString(),
            key: keyHex,
        }
    }

    genesis.accounts = genesisAccounts

    const { authorities } = await prompts({
        type: 'number',
        name: 'authorities',
        message:
            'Enter the amount of Authority nodes to allocate to the genesis block',
        initial: 3,
    })
    const { authorityBalance } = await prompts({
        type: 'number',
        name: 'authorityBalance',
        message:
            'Enter the amount (Millions) of VET and VTHO to allocate to each Authority node',
        initial: 1000,
    })

    const authorityAmount =
        BigInt(authorityBalance) * BigInt(1e6) * BigInt(1e18)

    for (let i = 0; i < authorities; i++) {
        const authorityKey = await sdk.Secp256k1.generatePrivateKey()
        const authorityKeyHex = Buffer.of(...authorityKey).toString('hex')
        const authorityAddress =
            sdk.Address.ofPrivateKey(authorityKey).toString()

        const endorsorKey = await sdk.Secp256k1.generatePrivateKey()
        const endorsorKeyHex = Buffer.of(...endorsorKey).toString('hex')
        const endorsorAddress = sdk.Address.ofPrivateKey(endorsorKey).toString()

        const identity = await sdk.Secp256k1.generatePrivateKey()
        const identityHex = Buffer.of(...identity).toString('hex')

        authorityAccounts[i] = {
            masterAddress: authorityAddress,
            endorsorAddress: endorsorAddress,
            identity: `0x` + identityHex,
        }

        authorityKeys[i] = {
            address: authorityAddress,
            key: authorityKeyHex,
        }

        endorsorAccounts[i] = {
            address: endorsorAddress,
            key: endorsorKeyHex,
        }

        genesis.accounts.push({
            address: endorsorAddress,
            balance: `0x` + authorityAmount.toString(16),
            energy: `0x` + authorityAmount.toString(16),
            code: '0x6060604052600256',
            storage: {
                ['0x0000000000000000000000000000000000000000000000000000000000000001']:
                    '0x0000000000000000000000000000000000000000000000000000000000000002',
            },
        })

        genesis.accounts.push({
            address: authorityAddress,
            balance: `0x` + authorityAmount.toString(16),
            energy: `0x` + authorityAmount.toString(16),
        })
    }

    genesis.authority = authorityAccounts

    genesis.executor = {}
    genesis.executor.approvers = []
    const executorAccounts = []
    // create 5 executors
    for (let i = 0; i < 5; i++) {
        const executorKey = await sdk.Secp256k1.generatePrivateKey()
        const executorKeyHex = Buffer.of(...executorKey).toString('hex')
        const executorAddress = sdk.Address.ofPrivateKey(executorKey).toString()

        const identity = await sdk.Secp256k1.generatePrivateKey()
        const identityHex = Buffer.of(...identity).toString('hex')

        executorAccounts.push({
            key: executorKeyHex,
            address: executorAddress,
        })

        genesis.executor.approvers.push({
            address: executorAddress,
            identity: `0x` + identityHex,
        })
    }

    genesis.params = {
        executorAddress: '0x0000000000000000000000004578656375746f72',
        baseGasPrice: 10000000000000,
        rewardRatio: 300000000000000000n,
        proposerEndorsement: 25000000000000000000000000n,
    }

    genesis.launchTime = Math.floor(Date.now() / 1000)

    const { outDir } = await prompts({
        type: 'text',
        name: 'outDir',
        message: 'Enter the output directory',
        initial: './custom-net',
    })

    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir)
    }

    function bigIntReplacer(_key: string, value: any): any {
        return typeof value === 'bigint' ? value.toString() : value
    }

    fs.writeFileSync(
        `${outDir}/genesis.json`,
        JSON.stringify(genesis, bigIntReplacer),
    )
    fs.writeFileSync(
        `${outDir}/authority-keys.json`,
        JSON.stringify(authorityKeys, null, 2),
    )
    fs.writeFileSync(
        `${outDir}/endorsor-keys.json`,
        JSON.stringify(endorsorAccounts, null, 2),
    )
    fs.writeFileSync(
        `${outDir}/genesis-keys.json`,
        JSON.stringify(genesisKeys, null, 2),
    )
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
