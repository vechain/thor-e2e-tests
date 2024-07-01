/**
 * @file write-logs.ts
 * @desc This file contains the functions to write VET and VTHO transfers to the blockchain.
 * It is designed to be used for blockchains that we spin up and down for testing purposes.
 * Writing to mainnet and testnet is not recommended as we only need to do that once.
 */
import { Client } from '../thor-client'
import { ThorWallet } from '../wallet'
import { TransferDetails } from '../types'
import { fundingAmounts } from '../account-faucet'

const writeTransferTransactions = async (): Promise<TransferDetails> => {
    console.log('\n')

    const transferCount = 20
    const iterations = 5
    let firstBlock = 0
    let lastBlock = 0

    for (let i = 0; i < iterations; i++) {
        let block = await Client.raw.getBlock('best')
        while (block.body?.number == lastBlock) {
            block = await Client.raw.getBlock('best')
        }

        console.log('Populating [block=' + (block.body!.number! + 1) + ']')

        const res = await Promise.all(
            Array.from({ length: 20 }, () => {
                const reciept = ThorWallet.txBetweenFunding(
                ).waitForFunding()
                return reciept
            }),
        )

        // TODO: move check outside of the loop
        if (!firstBlock) {
            firstBlock = res[0]!.meta!.blockNumber as number
        }

        // TODO: Do we need to check for it over and over?

        //if (i === iterations - 1) {
        lastBlock = res[0]!.meta!.blockNumber as number
        //}
    }

    return {
        lastBlock,
        firstBlock,
        transferCount: transferCount * iterations,
    }
}

export { writeTransferTransactions }
