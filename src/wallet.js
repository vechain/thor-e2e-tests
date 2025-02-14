import { Address, Hex, Secp256k1, Transaction } from '@vechain/sdk-core'
import { delegateTx, fundAccount, randomFunder } from './account-faucet'
import {
    generateNonce,
    pollReceipt,
    warnIfSimulationFails,
} from './transactions'
import { getBlockRef } from './utils/block-utils'
import { Client } from './thor-client'
import { contractAddresses } from './contracts/addresses'
import { interfaces } from './contracts/hardhat'
import {
    ProviderInternalBaseWallet,
    VeChainPrivateKeySigner,
    VeChainProvider,
} from '@vechain/sdk-network'
import { Eip1559Transaction } from './eip-1559-transaction'

export const generateAddress = async () => {
    return (await generateEmptyWallet()).address.toLowerCase()
}

export const generateAddresses = async (count) => {
    const addresses = []

    for (let i = 0; i < count; i++) {
        addresses.push(await generateAddress())
    }
    return addresses
}

const generateEmptyWallet = async () => {
    const privateKey = await Secp256k1.generatePrivateKey()
    const addr = Address.ofPrivateKey(privateKey)

    return {
        privateKey,
        address: addr.toString(),
    }
}

class ThorWallet {
    constructor(privateKey, waitForFunding) {
        this.privateKey = privateKey
        this.addressField = Address.ofPrivateKey(privateKey)
        this.address = this.addressField.toString()
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

    static async empty() {
        const privateKey = await Secp256k1.generatePrivateKey()
        return new ThorWallet(privateKey)
    }

    static withFunds() {
        return new ThorWallet(Buffer.from(randomFunder(), 'hex'))
    }

    static async newFunded(amounts) {
        const privateKey = await Secp256k1.generatePrivateKey()
        const addr = Address.ofPrivateKey(privateKey).toString()
        const receipt = fundAccount(addr, amounts).then((res) => res.receipt)

        return new ThorWallet(privateKey, () => receipt)
    }

    static txBetweenFunding(returnSender = false) {
        const sender = randomFunder()
        let receiver = randomFunder()
        while (sender === receiver) {
            receiver = randomFunder()
        }
        const clauses = [
            {
                to: Address.ofPrivateKey(
                    Buffer.from(receiver, 'hex'),
                ).toString(),
                value: '0x1',
                data: '0x',
            },
        ]

        clauses.push({
            to: contractAddresses.energy,
            value: '0x0',
            data: interfaces.energy.encodeFunctionData('transfer', [
                Address.ofPrivateKey(Buffer.from(receiver, 'hex')).toString(),
                BigInt(1),
            ]),
        })

        const senderWallet = new ThorWallet(Buffer.from(sender, 'hex'))

        const receipt = senderWallet.sendClauses(clauses, true)

        if (returnSender) {
            return new ThorWallet(Buffer.from(sender, 'hex'), () => receipt)
        } else {
            return new ThorWallet(Buffer.from(receiver, 'hex'), () => receipt)
        }
    }
    deployContract = async (bytecode, abi) => {
        await this.waitForFunding()

        const factory = Client.sdk.contracts.createContractFactory(
            abi,
            bytecode,
            this.signer,
        )

        await factory.startDeployment()

        const contract = await factory.waitForDeployment()

        // Make sure the contract is deployed before returning
        await pollReceipt(contract.deployTransactionReceipt.meta.txID)

        return contract
    }

    buildTransaction = async (clauses, options) => {
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
            dependsOn: options?.dependsOn ?? null,
            nonce: generateNonce(),
            chainTag: parseInt(genesisBlock.body.id.slice(-2), 16),
        }
    }

    signTransaction = async (transaction, delegationSignature) => {
        const signingHash = transaction.getTransactionHash()
        const signature = Secp256k1.sign(signingHash.bytes, this.privateKey)

        let tx

        if (transaction instanceof Eip1559Transaction) {
            if (delegationSignature) {
                tx = new Eip1559Transaction(
                    transaction.body,
                    Buffer.concat([signature, delegationSignature]),
                )
            } else {
                tx = new Eip1559Transaction(
                    transaction.body,
                    Buffer.from(signature),
                )
            }
        } else {
            if (delegationSignature) {
                tx = new Transaction(
                    transaction.body,
                    Buffer.concat([signature, delegationSignature]),
                )
            } else {
                tx = new Transaction(transaction.body, Buffer.from(signature))
            }
        }

        return tx
    }

    signAndEncodeTx = async (transaction, delegationSignature) => {
        const tx = await this.signTransaction(transaction, delegationSignature)

        return Hex.of(tx.encoded).toString()
    }

    sendClauses = async (clauses, waitForReceipt, delegate) => {
        await this.waitForFunding()

        const transaction = await this.buildTransaction(clauses)
        let encoded

        await warnIfSimulationFails(clauses, this.address)

        if (delegate) {
            const delegated = delegateTx(transaction, this.addressField)
            encoded = await this.signAndEncodeTx(
                delegated.transaction,
                Buffer.from(delegated.signature),
            )
        } else {
            const tx = new Transaction(transaction)

            encoded = await this.signAndEncodeTx(tx)
        }

        const res = await Client.raw.sendTransaction({
            raw: encoded,
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
            return res.body
        }

        const receipt = await pollReceipt(res.body?.id ?? '')

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
