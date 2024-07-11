import {
    addressUtils,
    secp256k1,
    Transaction,
    TransactionBody,
    TransactionClause,
} from '@vechain/sdk-core'
import {
    delegateTx,
    fundAccount,
    FundingAmounts,
    randomFunder,
} from './account-faucet'
import {
    generateNonce,
    pollReceipt,
    warnIfSimulationFails,
} from './transactions'
import { getBlockRef } from './utils/block-utils'
import { components } from './open-api-types'
import { Client } from './thor-client'
import * as fs from 'fs'
import { contractAddresses } from './contracts/addresses'
import { interfaces } from './contracts/hardhat'
import {
    ProviderInternalBaseWallet,
    VeChainPrivateKeySigner,
    VeChainProvider,
} from '@vechain/sdk-network'
import { Abi } from 'abitype'
import { Uint } from 'web3'

export const generateAddress = () => {
    return generateEmptyWallet().address.toLowerCase()
}

export const generateAddresses = (count: number) => {
    return Array.from({ length: count }, generateAddress)
}

const generateEmptyWallet = () => {
    const privateKey = secp256k1.generatePrivateKey()
    const addr = addressUtils.fromPrivateKey(privateKey).toLowerCase()

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
    public provider: VeChainProvider
    public signer: VeChainPrivateKeySigner

    constructor(privateKey: Uint8Array, waitForFunding?: WaitForFunding) {
        this.privateKey = privateKey
        this.address = addressUtils.fromPrivateKey(privateKey).toLowerCase()
        if (waitForFunding) {
            this.waitForFunding = waitForFunding
        } else {
            this.waitForFunding = () => Promise.resolve(undefined)
        }
        this.provider = new VeChainProvider(
            Client.sdk,
            new ProviderInternalBaseWallet([
                {
                    address: this.address,
                    privateKey: Buffer.from(this.privateKey),
                },
            ]),
        )
        this.signer = new VeChainPrivateKeySigner(
            Buffer.from(this.privateKey),
            this.provider,
        )
    }

    public static new(requireFunds: boolean) {
        const privateKey = secp256k1.generatePrivateKey()

        if (!requireFunds) {
            return new ThorWallet(privateKey)
        }

        return new ThorWallet(privateKey)
    }

    public static empty() {
        const privateKey = secp256k1.generatePrivateKey()

        const addr = addressUtils.fromPrivateKey(privateKey)

        fs.writeFileSync(
            './keys/' + addr + '.txt',
            Buffer.from(privateKey).toString('hex'),
        )

        return new ThorWallet(privateKey)
    }

    public static withFunds() {
        return new ThorWallet(Buffer.from(randomFunder(), 'hex'))
    }

    public static newFunded(amounts: FundingAmounts) {
        const privateKey = secp256k1.generatePrivateKey()

        const addr = addressUtils.fromPrivateKey(privateKey)
        fs.writeFile(
            './keys/' + addr + '.txt',
            Buffer.from(privateKey).toString('hex'),
            () => {},
        )

        const receipt = fundAccount(addr, amounts).then((res) => res.receipt)

        return new ThorWallet(privateKey, () => receipt)
    }

    public static txBetweenFunding() {
        const sender = randomFunder()
        let reciever = randomFunder()
        while (sender == reciever) {
            reciever = randomFunder()
        }
        const clauses = [
            {
                to: addressUtils.fromPrivateKey(Buffer.from(reciever, 'hex')),
                value: '0x1',
                data: '0x',
            },
        ]

        clauses.push({
            to: contractAddresses.energy,
            value: '0x0',
            data: interfaces.energy.encodeFunctionData('transfer', [
                addressUtils.fromPrivateKey(Buffer.from(reciever, 'hex')),
                BigInt(1),
            ]),
        })

        const senderWallet = new ThorWallet(Buffer.from(sender, 'hex'))

        const receipt = senderWallet.sendClauses(clauses, true)

        return new ThorWallet(Buffer.from(reciever, 'hex'), () => receipt)
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
        const bestBlockRef = await getBlockRef('0')
        const genesisBlock = await Client.raw.getBlock('0')

        if (!genesisBlock.success || !genesisBlock.body?.id) {
            throw new Error('Could not get best block')
        }

        return {
            blockRef: bestBlockRef,
            expiration: 100000,
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
        delegationSignature?: Buffer,
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
                Buffer.from(delegated.signature),
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
