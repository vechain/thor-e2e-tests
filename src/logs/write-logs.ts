/**
 * @file write-logs.ts
 * @desc This file contains the functions to write VET and VTHO transfers to the blockchain.
 * It is designed to be used for blockchains that we spin up and down for testing purposes.
 * Writing to mainnet and testnet is not recommended as we only need to do that once.
 */
import { Client } from '../thor-client'
import { TransferDetails } from '../types'
import { staticEventsTransactions } from './transactions'

const writeTransferTransactions = async (): Promise<TransferDetails> => {
    console.log('\n')

    let firstBlock = 0
    let lastBlock = 0
    let transferCount = 0

    for (let i = 0; i < staticEventsTransactions.length; i++) {
        const blockTxs: { raw: string; txId: string }[] =
            staticEventsTransactions[i]

        console.log(`Checking for batch ${i} of the event TXs...`)

        await Promise.all(
            blockTxs.map(async (tx) => {
                let receipt =
                    await Client.sdk.transactions.getTransactionReceipt(tx.txId)

                // deploy the tx and wait for it if it is not already deployed
                if (receipt == null) {
                    const newTx =
                        await Client.sdk.transactions.sendRawTransaction(tx.raw)

                    receipt = await newTx.wait()
                }

                if (!receipt || receipt.reverted) {
                    throw new Error('Transaction failed')
                }

                if (firstBlock == 0) {
                    firstBlock = receipt.meta.blockNumber
                }

                lastBlock = receipt.meta.blockNumber

                transferCount++
            }),
        )
    }

    return {
        lastBlock,
        firstBlock,
        transferCount,
    }
}

export { writeTransferTransactions }
