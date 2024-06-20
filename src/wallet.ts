import {
    addressUtils,
    secp256k1,
    Transaction,
    TransactionBody,
    TransactionClause,
} from '@vechain/sdk-core'
import { delegateTx, fundAccount, FundingAmounts } from './account-faucet'
import {
    generateNonce,
    pollReceipt,
    warnIfSimulationFails,
} from './transactions'
import { getBlockRef } from './utils/block-utils'
import { components } from './open-api-types'
import { Client } from './thor-client'
import { VeChainPrivateKeySigner, VeChainProvider } from '@vechain/sdk-network'
import { Abi } from 'abitype'

export const generateAddress = () => {
    return generateEmptyWallet().address
}

export const generateAddresses = (count: number) => {
    return Array.from({ length: count }, () => generateAddress())
}

export const addressFromPrivateKey = (privateKey: Uint8Array) => {
    const publicKey = secp256k1.derivePublicKey(privateKey)

    return addressUtils.fromPublicKey(publicKey).toLowerCase()
}

const generateEmptyWallet = () => {
    const privateKey = secp256k1.generatePrivateKey()
    const publicKey = secp256k1.derivePublicKey(privateKey)
    const addr = addressUtils.fromPublicKey(publicKey).toLowerCase()

    return {
        privateKey,
        address: addr,
    }
}

type WaitForFunding = () => Promise<
    components['schemas']['GetTxReceiptResponse'] | undefined
>

class ThorWallet {
    public readonly address: string
    public readonly privateKey: Uint8Array
    public readonly waitForFunding: WaitForFunding
    public readonly provider: VeChainProvider
    public readonly signer: VeChainPrivateKeySigner

    constructor(privateKey: Uint8Array, waitForFunding?: WaitForFunding) {
        this.privateKey = privateKey
        this.address = addressFromPrivateKey(privateKey)
        if (waitForFunding) {
            this.waitForFunding = waitForFunding
        } else {
            this.waitForFunding = () => Promise.resolve(undefined)
        }
        this.provider = new VeChainProvider(Client.sdk)
        this.signer = new VeChainPrivateKeySigner(
            Buffer.from(this.privateKey),
            this.provider,
        )
    }

    public static empty() {
        return new ThorWallet(secp256k1.generatePrivateKey())
    }

    public static withFunds(amounts: FundingAmounts) {
        const privateKey = secp256k1.generatePrivateKey()

        const addr = addressFromPrivateKey(privateKey)

        const receipt = fundAccount(addr, amounts).then((res) => res.receipt)

        return new ThorWallet(privateKey, () => receipt)
    }

    public deployContract = async <TAbi extends Abi>(
        bytecode: string,
        abi: TAbi,
    ) => {
        await this.waitForFunding()

        const factory = Client.sdk.contracts.createContractFactory(
            abi,
            bytecode,
            this.signer,
        )

        await factory.startDeployment()

        return await factory.waitForDeployment()
    }

    public buildTransaction = async (
        clauses: TransactionClause[],
    ): Promise<TransactionBody> => {
        const bestBlockRef = await getBlockRef('best')
        const genesisBlock = await Client.raw.getBlock('0')

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
        delegationSignature?: Uint8Array,
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
            tx = new Transaction(transaction.body, Buffer.from(signature))
        }

        return tx
    }

    public signAndEncodeTx = async (
        transaction: Transaction,
        delegationSignature?: Uint8Array,
    ) => {
        const tx = await this.signTransaction(transaction, delegationSignature)

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

        const transaction = await this.buildTransaction(clauses)
        let encoded: string

        await warnIfSimulationFails(clauses, this.address)

        if (delegate) {
            const delegated = delegateTx(transaction, this.address)
            encoded = await this.signAndEncodeTx(
                delegated.transaction,
                delegated.signature,
            )
        } else {
            const tx = new Transaction(transaction)

            encoded = await this.signAndEncodeTx(tx)
        }

        const res = await Client.raw.sendTransaction({
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
