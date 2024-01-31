import { address, secp256k1, Transaction } from 'thor-devkit'
import { delegateTx, fundAccount } from './account-faucet'
import { NodeKey, Nodes } from './thor-client'
import {
    generateNonce,
    pollReceipt,
    warnIfSimulationFails,
} from './transactions'
import { getBlockRef } from './utils/block-utils'
import { components } from './open-api-types'

export const generateAddress = () => {
    return generateEmptyWallet().address
}

export const generateAddresses = (count: number) => {
    return Array.from({ length: count }, () => generateEmptyWallet().address)
}

const generateEmptyWallet = () => {
    const privateKey = secp256k1.generatePrivateKey()
    const publicKey = secp256k1.derivePublicKey(privateKey)
    const addr = address.fromPublicKey(publicKey)

    return {
        privateKey: privateKey.toString('hex'),
        address: addr,
    }
}

class ThorWallet {
    public readonly address: string
    public readonly privateKey: Buffer
    private readonly waitForFunding: () => Promise<
        components['schemas']['GetTxReceiptResponse'] | void
    >

    constructor(privateKey: Buffer, requireFunds: boolean) {
        const publicKey = secp256k1.derivePublicKey(privateKey)

        this.privateKey = privateKey
        this.address = address.fromPublicKey(publicKey)

        if (requireFunds) {
            const funding = fundAccount(this.address)

            this.waitForFunding = async () => {
                const { receipt } = await funding
                return receipt
            }
        } else {
            this.waitForFunding = () => Promise.resolve()
        }
    }

    public static async new(requireFunds: boolean) {
        const privateKey = secp256k1.generatePrivateKey()

        const wallet = new ThorWallet(privateKey, requireFunds)

        const fundReceipt = await wallet.waitForFunding()

        return {
            wallet,
            fundReceipt,
        }
    }

    public deployContract = async (
        bytecode: string,
        delegate = false,
        node?: NodeKey,
    ): Promise<string> => {
        const receipt = await this.sendClauses(
            [
                {
                    to: null,
                    value: 0,
                    data: bytecode,
                },
            ],
            true,
            delegate,
            node ?? 1,
        )

        const contractAddress = receipt.outputs?.[0].contractAddress

        if (!contractAddress) {
            throw new Error('Could not get contract address from receipt')
        }

        return contractAddress
    }

    public buildTransaction = async (
        clauses: Transaction.Clause[],
        node?: NodeKey,
    ): Promise<Transaction> => {
        const client = Nodes[node ?? 1]

        const bestBlockRef = await getBlockRef('best')
        const genesisBlock = await client.getBlock('0')

        if (!genesisBlock.success || !genesisBlock.body?.id) {
            throw new Error('Could not get best block')
        }

        return new Transaction({
            blockRef: bestBlockRef,
            expiration: 1000,
            clauses: clauses,
            gasPriceCoef: 0,
            gas: 1_000_000,
            dependsOn: null,
            nonce: generateNonce(),
            chainTag: parseInt(genesisBlock.body.id.slice(-2), 16),
        })
    }

    public signTransaction = async (
        transaction: Transaction,
        delegationSignature?: Buffer,
    ) => {
        const signingHash = transaction.signingHash()
        const signature = secp256k1.sign(signingHash, this.privateKey)

        if (delegationSignature) {
            transaction.signature = Buffer.concat([
                signature,
                delegationSignature,
            ])
        } else {
            transaction.signature = signature
        }

        return transaction.encode().toString('hex')
    }

    public sendClauses = async (
        clauses: Transaction.Clause[],
        waitForReceipt: boolean,
        delegate?: boolean,
        node?: NodeKey,
    ): Promise<components['schemas']['GetTxReceiptResponse']> => {
        await this.waitForFunding()

        const client = Nodes[node ?? 1]

        let transaction = await this.buildTransaction(clauses, node)
        let encoded: string

        await warnIfSimulationFails(clauses, this.address, node)

        if (delegate) {
            const delegated = delegateTx(transaction, this.address)
            encoded = await this.signTransaction(
                delegated.transaction,
                delegated.signature,
            )
        } else {
            encoded = await this.signTransaction(transaction)
        }

        const res = await client.sendTransaction({
            raw: `0x${encoded}`,
        })

        if (!res.success) {
            throw new Error(
                JSON.stringify({
                    httpCode: res.httpCode,
                    message:
                        res.httpMessage ?? 'Unknown Error sending transaction',
                }),
            )
        }

        if (!waitForReceipt) {
            return res.body as components['schemas']['GetTxReceiptResponse']
        }

        const receipt = await pollReceipt(res.body?.id ?? '', node)

        if (receipt.reverted) {
            console.error(
                'Transaction reverted',
                JSON.stringify(receipt, null, 2),
            )
        }

        return receipt
    }
}

export { ThorWallet }
