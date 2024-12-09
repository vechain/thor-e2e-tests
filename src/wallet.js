import {
    addressUtils,
    secp256k1,
    Transaction,
    unitsUtils,
} from '@vechain/sdk-core'
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

export const generateAddress = () => {
    return generateEmptyWallet().address.toLowerCase()
}

export const generateAddresses = (count) => {
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

class ThorWallet {
    constructor(privateKey, waitForFunding) {
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

    static empty() {
        const privateKey = secp256k1.generatePrivateKey()
        return new ThorWallet(privateKey)
    }

    static withFunds() {
        return new ThorWallet(Buffer.from(randomFunder(), 'hex'))
    }

    static newFunded(amounts) {
        const privateKey = secp256k1.generatePrivateKey()
        const addr = addressUtils.fromPrivateKey(privateKey)
        const receipt = fundAccount(addr, amounts).then((res) => res.receipt)

        return new ThorWallet(privateKey, () => receipt)
    }

    static txBetweenFunding(returnSender = false) {
        const sender = randomFunder()
        let receiver = randomFunder()
        while (sender == receiver) {
            receiver = randomFunder()
        }
        const clauses = [
            {
                to: addressUtils.fromPrivateKey(Buffer.from(receiver, 'hex')),
                value: '0x1',
                data: '0x',
            },
        ]

        clauses.push({
            to: contractAddresses.energy,
            value: '0x0',
            data: interfaces.energy.encodeFunctionData('transfer', [
                addressUtils.fromPrivateKey(Buffer.from(receiver, 'hex')),
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

    startingEnergy = async () => {
        const receipt = await this.waitForFunding()
        if (!receipt) {
            throw new Error('Could not get funding')
        }
        const account = await Client.sdk.accounts.getAccount(this.address, {
            revision: receipt.meta?.blockID,
        })
        return account.energy
    }

    currentEnergy = async () => {
        const account = await Client.sdk.accounts.getAccount(this.address)
        return account.energy
    }

    consumedEnergy = async () => {
        const start = await this.startingEnergy()
        const current = await this.currentEnergy()

        return unitsUtils.formatVET(BigInt(start) - BigInt(current))
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

    buildCallTransaction = async (clauses, options) => {
        const bestBlockRef = await getBlockRef('best')
        const genesisBlock = await Client.raw.getBlock('0')
    
        if (!genesisBlock.success || !genesisBlock.body?.id) {
            throw new Error('Could not get best block')
        }
    
        return {
            id: "0x0000000000000000000000000000000000000000000000000000000000000000",
            chainTag: parseInt(genesisBlock.body.id.slice(-2), 16),
            blockRef: "0x0000000000000000",
            expiration: 10,  // 10 in hex
            clauses: clauses,
            gasPriceCoef: 0,
            gas: 21000,  // using the same gas as the example
            origin: options?.origin ?? null,
            delegator: null,
            nonce: "0x0",
            dependsOn: options?.dependsOn ?? null,
            size: 40,  // you might want to calculate this dynamically
            meta: null
        }
    }

    signTransaction = async (transaction, delegationSignature) => {
        const signingHash = transaction.getSignatureHash()
        const signature = secp256k1.sign(signingHash, this.privateKey)

        let tx

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

    signAndEncodeTx = async (transaction, delegationSignature) => {
        const tx = await this.signTransaction(transaction, delegationSignature)

        return tx.encoded.toString('hex')
    }

    sendClauses = async (clauses, waitForReceipt, delegate) => {
        await this.waitForFunding()

        const transaction = await this.buildTransaction(clauses)
        let encoded

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
