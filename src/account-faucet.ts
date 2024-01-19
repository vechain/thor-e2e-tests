import { sendClauses } from './transactions'
import { contractAddresses } from './contracts/addresses'
import { interfaces } from './contracts/hardhat'
import { HDNode, secp256k1, Transaction } from 'thor-devkit'

type AccountFaucet = {
    address: string
    privateKey: string
}
export const faucetMnemonic =
    'denial kitchen pet squirrel other broom bar gas better priority spoil cross'.split(
        ' ',
    )

const faucetAccounts: AccountFaucet[] = []

const hdNode = HDNode.fromMnemonic(faucetMnemonic)

for (let i = 0; i < 100; i++) {
    const node = hdNode.derive(i)
    faucetAccounts.push({
        address: node.address,
        privateKey: node.privateKey!.toString('hex'),
    })
}

const FAUCET_AMOUNT = '0x65536000000000000000000'

const fundAccount = async (account: string) => {
    const randomIndex = Math.floor(Math.random() * faucetAccounts.length)
    const fundingAccount = faucetAccounts[randomIndex]

    const receipt = await sendClauses(
        [
            {
                to: account,
                value: FAUCET_AMOUNT,
                data: '0x',
            },
            {
                to: contractAddresses.energy,
                value: '0x0',
                data: interfaces.energy.encodeFunctionData('transfer', [
                    account,
                    FAUCET_AMOUNT,
                ]),
            },
        ],
        fundingAccount.privateKey,
        true,
    )

    return { receipt, amount: FAUCET_AMOUNT }
}

export const delegateTx = (transaction: Transaction, senderAddress: string) => {
    transaction.body.reserved = { features: 1 }

    const randomIndex = Math.floor(Math.random() * faucetAccounts.length)
    const fundingAccount = faucetAccounts[randomIndex]

    const encoded = transaction.signingHash(senderAddress)

    const signature = secp256k1.sign(
        encoded,
        Buffer.from(fundingAccount.privateKey, 'hex'),
    )

    return {
        transaction,
        signature,
    }
}

export { faucetAccounts, fundAccount, FAUCET_AMOUNT }
