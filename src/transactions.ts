import { TransactionClause } from '@vechain/sdk-core'
import { Node1Client } from './thor-client'
import { components } from './open-api-types'

export const generateNonce = (): number => {
    return Math.floor(Math.random() * 1_000_000_000)
}

/**
 * Polls each node in the network for a transaction receipt. The tx receipt must have the same blockID to be considered mined.
 * @param txId The transaction ID to poll for
 * @param timeout The maximum time to wait for the transaction to be mined
 */
export const pollReceipt = async (
    txId: string,
    timeout = 60_000,
): Promise<components['schemas']['GetTxReceiptResponse']> => {
    return new Promise<components['schemas']['GetTxReceiptResponse']>(
        (resolve, reject) => {
            setInterval(async () => {
                const receipt = await Node1Client.getTransactionReceipt(txId)

                if (receipt.success && receipt.body) {
                    resolve(receipt.body)
                }
            }, 1000)

            setTimeout(() => {
                reject('Timed out waiting for transaction to be mined: ' + txId)
            }, timeout)
        },
    )
}

/**
 * Warns if the transaction simulation fails
 * @param clauses
 * @param caller
 */
export const warnIfSimulationFails = async (
    clauses: TransactionClause[],
    caller: string,
) => {
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

    const simulation = await Node1Client.executeAccountBatch({
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
