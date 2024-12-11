import { Client } from './thor-client'
import HexUtils from './utils/hex-utils'

export const generateNonce = () => {
    return Math.floor(Math.random() * 1_000_000_000)
}

/**
 * Polls network for a transaction
 * @param txId The transaction ID to poll for
 * @param queryParams params to pass to query
 * @param timeout The maximum time to wait for the transaction
 */
export const pollTransaction = async (txId, queryParams, timeout = 60_000) => {
    return new Promise((resolve, reject) => {
        const intervalId = setInterval(async () => {
            const tx = await Client.raw.getTransaction(txId, queryParams)

            if (tx.success && tx.body) {
                clearInterval(intervalId) // Clear the interval when the receipt is found
                resolve(tx)
            }
        }, 1000)

        const timeoutId = setTimeout(() => {
            clearInterval(intervalId) // Clear the interval when the timeout occurs
            reject('Timed out getting transaction: ' + txId)
        }, timeout)

        // Clear the timeout when the promise is settled
        Promise.race([intervalId, timeoutId]).finally(() => {
            clearTimeout(timeoutId)
        })
    })
}

/**
 * Polls each node in the network for a transaction receipt. The tx receipt must have the same blockID to be considered mined.
 * @param txId The transaction ID to poll for
 * @param timeout The maximum time to wait for the transaction to be mined
 */
export const pollReceipt = async (txId, timeout = 60_000) => {
    return new Promise((resolve, reject) => {
        const intervalId = setInterval(async () => {
            const requests = Client.clients.map(async (client) =>
                client.getTransactionReceipt(txId),
            )
            const receipts = await Promise.all(requests)
            const blockIds = new Set(
                receipts.map(
                    (receipt) =>
                        receipt.body?.meta?.blockID ?? crypto.randomUUID(),
                ),
            )

            const blocks = blockIds.values()

            if (
                receipts.length === Client.clients.length &&
                HexUtils.isValid(blocks.next().value) &&
                blockIds.size === 1
            ) {
                clearInterval(intervalId) // Clear the interval when the receipt is found
                resolve(receipts[0].body)
            }
        }, 1000)

        const timeoutId = setTimeout(() => {
            clearInterval(intervalId) // Clear the interval when the timeout occurs
            reject('Timed out waiting for transaction to be mined: ' + txId)
        }, timeout)

        // Clear the timeout when the promise is settled
        Promise.race([intervalId, timeoutId]).finally(() => {
            clearTimeout(timeoutId)
        })
    })
}

/**
 * Warns if the transaction simulation fails
 * @param clauses
 * @param caller
 */
export const warnIfSimulationFails = async (clauses, caller) => {
    const _clauses = clauses.map((clause) => {
        let value

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

    const simulation = await Client.raw.executeAccountBatch({
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
