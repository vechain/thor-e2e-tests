import { Client } from '../../../src/thor-client'
import { components } from '../../../src/open-api-types'
import { fundingAmounts, fundAccount } from '../../../src/account-faucet'
import { SimpleTransfer__factory as SimpleTransfer } from '../../../typechain-types'
import { generateAddress, ThorWallet } from '../../../src/wallet'

type SubscriptionParams = Record<string, string | undefined>

const subscribeAndTestError = async (
    params: SubscriptionParams,
    message: string,
): Promise<void> => {
    return new Promise((resolve, reject) => {
        Client.raw.subscribeToTransfers(
            params,
            () => {
                reject(
                    `Callback should not be executed for an invalid parameter: ${JSON.stringify(
                        params,
                    )}`,
                )
            },
            (error: { message: string }) => {
                expect(error.message).toBe(message)
                resolve()
            },
        )

        new Promise((resolve) => setTimeout(resolve, 2000)).then(() => {
            reject('Timed out waiting for subscription to fail')
        })
    })
}

const subscribeAndFundAccount = async (
    params: SubscriptionParams,
    account: string,
    wallet?: ThorWallet,
) => {
    const events: components['schemas']['SubscriptionTransferResponse'][] = []

    Client.raw.subscribeToTransfers(params, (event) => {
        events.push(event)
    })

    const { receipt } = wallet
        ? await fundAccount(account, fundingAmounts.tinyVetNoVtho, wallet)
        : await fundAccount(account, fundingAmounts.tinyVetNoVtho)

    const sender = receipt.outputs?.[0].transfers?.[0].sender

    // Sleep for 1 sec to ensure the beat is received
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const relevantEvent = events.find((event) => {
        return event.meta?.txID === receipt.meta?.txID
    })

    return { relevantEvent, sender, account }
}

/**
 * @group api
 * @group websockets
 * @group transfer
 */
describe('WS /subscriptions/transfer', () => {
    it.e2eTest('should work for valid recipient', 'all', async () => {
        const account = generateAddress()

        const { relevantEvent, sender } = await subscribeAndFundAccount(
            { recipient: account },
            account,
        )

        expect(relevantEvent).not.toBeUndefined()
        expect(relevantEvent?.meta?.txOrigin).toEqual(sender)
        expect(relevantEvent?.recipient).toEqual(account)
    })

    it.e2eTest('should work for valid position', 'all', async () => {
        const account = generateAddress()
        const bestBlock = await Client.sdk.blocks.getBlockCompressed('best')
        const bestBlockId = bestBlock?.id

        const { relevantEvent, sender } = await subscribeAndFundAccount(
            { recipient: account, pos: bestBlockId },
            account,
        )

        expect(relevantEvent).not.toBeUndefined()
        expect(relevantEvent?.meta?.txOrigin).toEqual(sender)
        expect(relevantEvent?.recipient).toEqual(account)
    })

    it.e2eTest('should work for valid sender', 'all', async () => {
        const account = generateAddress()
        const wallet = ThorWallet.withFunds()

        const { relevantEvent, sender } = await subscribeAndFundAccount(
            { sender: wallet.address },
            account,
            wallet,
        )

        expect(relevantEvent).not.toBeUndefined()
        expect(relevantEvent?.meta?.txOrigin).toEqual(sender)
        expect(relevantEvent?.recipient).toEqual(account)
    })

    it.e2eTest('should work for valid txOrigin', 'all', async () => {
        const account = generateAddress()
        const wallet = ThorWallet.withFunds()

        const { relevantEvent, sender } = await subscribeAndFundAccount(
            { txOrigin: wallet.address },
            account,
            wallet,
        )

        expect(relevantEvent).not.toBeUndefined()
        expect(relevantEvent?.meta?.txOrigin).toEqual(sender)
        expect(relevantEvent?.recipient).toEqual(account)
    })

    it.e2eTest(
        'should work for valid txOrigin different than sender',
        'all',
        async () => {
            const wallet: ThorWallet = ThorWallet.withFunds()
            const simpleTransfer = await wallet.deployContract(
                SimpleTransfer.bytecode,
                SimpleTransfer.abi,
            )
            const sender = simpleTransfer.address // contract that sends VET
            const txOrigin = wallet.address // EOA that triggered contract call
            const account = generateAddress()

            const functionData =
                SimpleTransfer.createInterface().encodeFunctionData(
                    'transfer',
                    [account],
                )

            const events: components['schemas']['SubscriptionTransferResponse'][] =
                []

            Client.raw.subscribeToTransfers({ sender: sender }, (event) => {
                events.push(event)
            })

            const receipt = await wallet.sendClauses(
                [
                    {
                        to: sender,
                        value: '0x1',
                        data: functionData,
                    },
                ],
                true,
            )

            expect(receipt).toBeDefined()
            expect(receipt!.reverted).toBe(false)

            // Sleep for 1 sec to ensure the beat is received
            await new Promise((resolve) => setTimeout(resolve, 1000))

            const relevantEvent = events.find((event) => {
                return event.meta?.txID === receipt.meta?.txID
            })

            expect(relevantEvent).not.toBeUndefined()
            expect(relevantEvent?.meta?.txOrigin).not.toEqual(sender)
            expect(relevantEvent?.meta?.txOrigin).toEqual(txOrigin)
        },
    )

    it.e2eTest('should get 2 notifications', 'all', async () => {
        const transferTxs: { id: string }[] = []
        const txpoolTxs: { id: string }[] = []

        const account = generateAddress()

        Client.raw.subscribeToTransfers({ recipient: account }, (event) => {
            const txID = event.meta?.txID
            if (txID) {
                transferTxs.push({ id: txID })
            }
        })

        Client.raw.subscribeToTxPool((txId) => {
            txpoolTxs.push(txId)
        })

        const receipt = await fundAccount(account, fundingAmounts.tinyVetNoVtho)
        const txId = receipt.receipt.meta?.txID

        // Sleep for 1 sec to ensure the beat is received
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const isInTransferTxs = transferTxs.some((tx) => tx.id === txId)
        const isInTxpoolTxs = txpoolTxs.some((tx) => tx.id === txId)

        expect(transferTxs).not.toBeUndefined()
        expect(txpoolTxs).not.toBeUndefined()
        expect(isInTransferTxs).toBeTrue()
        expect(isInTxpoolTxs).toBeTrue()
    })

    it.e2eTest('should error for invalid position', 'all', async () => {
        await subscribeAndTestError(
            { pos: 'invalid position' },
            'Unexpected server response: 400',
        )
    })

    it.e2eTest('should error for out of range position', 'all', async () => {
        const account = generateAddress()
        const genesisBlock = await Client.sdk.blocks.getGenesisBlock()
        const genesisBlockId = genesisBlock?.id

        await subscribeAndTestError(
            { recipient: account, pos: genesisBlockId },
            'Unexpected server response: 403',
        )
    })

    it.e2eTest('should error for invalid recipient', 'all', async () => {
        await subscribeAndTestError(
            { recipient: 'invalid recipient' },
            'Unexpected server response: 400',
        )
    })

    it.e2eTest('should error for invalid txOrigin', 'all', async () => {
        await subscribeAndTestError(
            { txOrigin: 'invalid txOrigin' },
            'Unexpected server response: 400',
        )
    })

    it.e2eTest('should error for invalid sender', 'all', async () => {
        await subscribeAndTestError(
            { sender: 'invalid sender' },
            'Unexpected server response: 400',
        )
    })
})
