import { Transaction } from 'thor-devkit'
import { NodeKey, Nodes } from './thor-client'
import { components } from './open-api-types'

export const generateNonce = (): number => {
    return Math.floor(Math.random() * 1_000_000_000)
}

type TXID = components['schemas']['TXID']

export const pollReceipt = async (
    txId: string,
    node?: NodeKey,
): Promise<components['schemas']['GetTxReceiptResponse']> => {
    const client = Nodes[node ?? 1]

    return new Promise<components['schemas']['GetTxReceiptResponse']>(
        (resolve, reject) => {
            setInterval(async () => {
                const receipt = await client.getTransactionReceipt(txId)

                if (receipt.success && receipt.body?.meta?.txID === txId) {
                    resolve(receipt.body)
                }
            }, 1000)

            setTimeout(() => {
                reject('Timed out waiting for transaction to be mined')
            }, 30000)
        },
    )
}

export const warnIfSimulationFails = async (
    clauses: Transaction.Clause[],
    caller: string,
    node?: NodeKey,
) => {
    const client = Nodes[node ?? 1]

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
