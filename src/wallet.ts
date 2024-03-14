import {
    addressUtils,
    secp256k1,
    Transaction,
    TransactionBody,
    TransactionClause,
} from '@vechain/sdk-core'
import { delegateTx, fundAccount } from './account-faucet'
import {
    generateNonce,
    pollReceipt,
    warnIfSimulationFails,
} from './transactions'
import { getBlockRef } from './utils/block-utils'
import { components } from './open-api-types'
import { Node1Client } from './thor-client'

export const generateAddress = () => {
    return generateEmptyWallet().address
}

export const generateAddresses = (count: number) => {
    return Array.from({ length: count }, () => generateEmptyWallet().address)
}

export const addressFromPrivateKey = (privateKey: Buffer) => {
    const publicKey = secp256k1.derivePublicKey(privateKey)

    return addressUtils.fromPublicKey(publicKey).toLowerCase()
}

const generateEmptyWallet = () => {
    const privateKey = secp256k1.generatePrivateKey()
    const publicKey = secp256k1.derivePublicKey(privateKey)
    const addr = addressUtils.fromPublicKey(publicKey).toLowerCase()

    return {
        privateKey: privateKey.toString('hex'),
        address: addr,
    }
}

type WaitForFunding = () => Promise<
    components['schemas']['GetTxReceiptResponse'] | undefined
>

class ThorWallet {
    public readonly address: string
    public readonly privateKey: Buffer
    public readonly waitForFunding: WaitForFunding

    constructor(privateKey: Buffer, waitForFunding?: WaitForFunding) {
        this.privateKey = privateKey
        this.address = addressFromPrivateKey(privateKey)
        if (waitForFunding) {
            this.waitForFunding = waitForFunding
        } else {
            this.waitForFunding = () => Promise.resolve(undefined)
        }
    }

    public static new(requireFunds: boolean) {
        const privateKey = secp256k1.generatePrivateKey()

        if (!requireFunds) {
            return new ThorWallet(privateKey)
        }

        const addr = addressFromPrivateKey(privateKey)

        const receipt = fundAccount(addr).then((res) => res.receipt)

        return new ThorWallet(privateKey, () => receipt)
    }

    public deployContract = async (
        bytecode: string,
        delegate = false,
    ): Promise<{
        contractAddress: string
        receipt: components['schemas']['GetTxReceiptResponse']
    }> => {
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
        )

        const contractAddress = receipt.outputs?.[0].contractAddress

        if (!contractAddress) {
            throw new Error('Could not get contract address from receipt')
        }

        return { contractAddress, receipt }
    }

    public buildTransaction = async (
        clauses: TransactionClause[],
    ): Promise<TransactionBody> => {
        const bestBlockRef = await getBlockRef('best')
        const genesisBlock = await Node1Client.getBlock('0')

        if (!genesisBlock.success || !genesisBlock.body?.id) {
            throw new Error('Could not get best block')
        }

        return {
            blockRef: bestBlockRef,
            expiration: 1000,
            clauses: clauses,
            gasPriceCoef: 0,
            gas: 1_000_000,
            dependsOn: null,
            nonce: generateNonce(),
            chainTag: parseInt(genesisBlock.body.id.slice(-2), 16),
        }
    }

    public signTransaction = async (
        transaction: Transaction,
        delegationSignature?: Buffer,
    ) => {
        const signingHash = transaction.getSignatureHash()
        const signature = secp256k1.sign(signingHash, this.privateKey)

        let tx: Transaction

        if (delegationSignature) {
            tx = new Transaction(
                transaction.body,
                Buffer.concat([signature, delegationSignature]),
            )
        } else {
            tx = new Transaction(transaction.body, signature)
        }

        return tx.encoded.toString('hex')
    }

    public sendClauses = async <T extends boolean>(
        clauses: TransactionClause[],
        waitForReceipt: T,
        delegate?: boolean,
    ): Promise<
        T extends true
            ? components['schemas']['GetTxReceiptResponse']
            : components['schemas']['TXID']
    > => {
        await this.waitForFunding()

        let transaction = await this.buildTransaction(clauses)
        let encoded: string

        await warnIfSimulationFails(clauses, this.address)

        if (delegate) {
            const delegated = delegateTx(transaction, this.address)
            encoded = await this.signTransaction(
                delegated.transaction,
                delegated.signature,
            )
        } else {
            const tx = new Transaction(transaction)

            encoded = await this.signTransaction(tx)
        }

        const res = await Node1Client.sendTransaction({
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
            return res.body as components['schemas']['TXID'] as any
        }

        const receipt = await pollReceipt(res.body?.id ?? '')

        if (receipt.reverted) {
            console.error(
                'Transaction reverted',
                JSON.stringify(receipt, null, 2),
            )
        }

        return receipt as components['schemas']['GetTxReceiptResponse'] as any
    }
}

export { ThorWallet }
