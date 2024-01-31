import { address, secp256k1, Transaction } from 'thor-devkit'
import { NodeKey, Nodes } from './thor-client'
import { components } from './open-api-types'
import { getBlockRef } from './utils/block-utils'
import { delegateTx } from './account-faucet'

export const generateNonce = (): number => {
    return Math.floor(Math.random() * 1_000_000_000)
}

type GetTxReceiptResponse = components['schemas']['GetTxReceiptResponse']
type TXID = components['schemas']['TXID']

export const deployContract = async (
    bytecode: string,
    privateKey: string,
    delegate = false,
    node?: NodeKey,
): Promise<string> => {
    const receipt = await sendClauses(
        [
            {
                to: null,
                value: 0,
                data: bytecode,
            },
        ],
        privateKey,
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

export const sendClauses = async <T extends boolean>(
    clauses: Transaction.Clause[],
    privateKey: string,
    waitForReceipt: T,
    delegate?: boolean,
    node?: NodeKey,
): Promise<T extends true ? GetTxReceiptResponse : TXID> => {
    const client = Nodes[node ?? 1]

    const pubKey = secp256k1.derivePublicKey(Buffer.from(privateKey, 'hex'))
    const caller = address.fromPublicKey(pubKey)

    let transaction = await buildTransaction(clauses, privateKey, node)
    let encoded: string

    if (delegate) {
        const delegated = delegateTx(transaction, caller)
        encoded = signTransaction(
            delegated.transaction,
            privateKey,
            delegated.signature,
        )
    } else {
        encoded = signTransaction(transaction, privateKey)
    }

    const res = await client.sendTransaction({
        raw: `0x${encoded}`,
    })

    if (!res.success) {
        throw new Error(
            JSON.stringify({
                httpCode: res.httpCode,
                message: res.httpMessage ?? 'Unknown Error sending transaction',
            }),
        )
    }

    if (!waitForReceipt) {
        return res.body as T extends true ? GetTxReceiptResponse : TXID
    }

    const receipt = await pollReceipt(res.body?.id ?? '', node)

    if (receipt.reverted) {
        await warnTxReverted(receipt, node)
    }

    return receipt as T extends true ? GetTxReceiptResponse : TXID
}

export const buildTransaction = async (
    clauses: Transaction.Clause[],
    privateKey: string,
    node?: NodeKey,
): Promise<Transaction> => {
    const client = Nodes[node ?? 1]

    await warnIfSimulationFails(clauses, privateKey)

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

export const signTransaction = (
    transaction: Transaction,
    privateKey: string,
    delegationSignature?: Buffer,
): string => {
    const pk = Buffer.from(privateKey, 'hex')
    const signingHash = transaction.signingHash()
    const signature = secp256k1.sign(signingHash, pk)

    if (delegationSignature) {
        transaction.signature = Buffer.concat([signature, delegationSignature])
    } else {
        transaction.signature = signature
    }

    return transaction.encode().toString('hex')
}

export const pollReceipt = async (
    txId: string,
    node?: NodeKey,
): Promise<GetTxReceiptResponse> => {
    const client = Nodes[node ?? 1]

    return new Promise<GetTxReceiptResponse>((resolve, reject) => {
        setInterval(async () => {
            const receipt = await client.getTransactionReceipt(txId)

            if (receipt.success && receipt.body?.meta?.txID === txId) {
                resolve(receipt.body)
            }
        }, 1000)

        setTimeout(() => {
            reject('Timed out waiting for transaction to be mined')
        }, 30000)
    })
}

const warnIfSimulationFails = async (
    clauses: Transaction.Clause[],
    privateKey: string,
    node?: NodeKey,
) => {
    const client = Nodes[node ?? 1]

    const pubKey = secp256k1.derivePublicKey(Buffer.from(privateKey, 'hex'))
    const caller = address.fromPublicKey(pubKey)

    const _clauses = clauses.map((clause) => {
        let value: string

        if (typeof clause.value === 'number') {
            value = clause.value.toString()
        } else {
            value = clause.value
        }

        return {
            to: clause.to ?? undefined,
            value: value,
            data: clause.data,
        }
    })

    const simulation = await client.executeAccountBatch({
        clauses: _clauses,
        caller,
    })

    if (!simulation.success) {
        return
    }

    const revertedClause = simulation.body.find((result) => result.reverted)

    if (revertedClause) {
        console.warn(
            `TX Clause may revert (${revertedClause.vmError})`,
            revertedClause,
        )
    }
}
const warnTxReverted = async (
    receipt: GetTxReceiptResponse,
    nodeKey?: NodeKey,
) => {
    if (!receipt.meta?.blockNumber) return

    const client = Nodes[nodeKey ?? 1]

    const res = await client.getBlock(receipt.meta.blockNumber, true)

    if (!res.success || !res.body) return

    const block = res.body as components['schemas']['GetBlockResponse']

    const txIndex = block.transactions?.findIndex(
        (tx: components['schemas']['Tx']) => tx.id === receipt.meta?.txID,
    )
    const clauseIndex = receipt.outputs?.length

    const debugged = await client.traceClause({
        target: `${receipt.meta.blockID}/${txIndex}/${clauseIndex}`,
    })

    console.warn('Transaction Failed', debugged)
}
