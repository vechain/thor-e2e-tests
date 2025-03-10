import { Client } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import { interfaces } from '../../../src/contracts/hardhat'
import { addAddressPadding } from '../../../src/utils/padding-utils'
import { ThorWallet } from '../../../src/wallet'

const subscribeAndTestError = async (params, message) => {
    return new Promise((resolve, reject) => {
        Client.raw.subscribeToEvents(
            () => {
                reject(
                    `Callback should not be executed for an invalid parameter: ${JSON.stringify(params)}`,
                )
            },
            params,
            (error) => {
                expect(error.message).toBe(message)
                resolve()
            },
        )

        new Promise((resolve) => setTimeout(resolve, 2000)).then(() => {
            reject('Timed out waiting for subscription to fail')
        })
    })
}

const subscribeAndTestEvent = async (params, wallet) => {
    const events = []

    Client.raw.subscribeToEvents((event) => {
        events.push(event)
    }, params)

    const receipt = await wallet.waitForFunding()

    // Sleep for 1 sec to ensure the event is received
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const relevantEvent = events.find(
        (event) => event.meta?.txID === receipt?.meta?.txID,
    )

    expect(relevantEvent).not.toBeUndefined()
}

/**
 * @group api
 * @group websockets
 */
describe('WS /subscriptions/event', () => {
    it.e2eTest('should work for empty parameters', 'all', async () => {
        const wallet = ThorWallet.txBetweenFunding()

        await subscribeAndTestEvent({}, wallet)
    })

    it.e2eTest('should work for valid t0', 'all', async () => {
        const wallet = ThorWallet.txBetweenFunding()

        await subscribeAndTestEvent(
            {
                t0: interfaces.energy.getEvent('Transfer').topicHash,
            },
            wallet,
        )
    })

    it.e2eTest('should work for valid t1', 'all', async () => {
        const wallet = ThorWallet.txBetweenFunding(true)

        await subscribeAndTestEvent(
            {
                t1: addAddressPadding(wallet.address),
            },
            wallet,
        )
    })

    it.e2eTest('should work for valid t2', 'all', async () => {
        const wallet = ThorWallet.txBetweenFunding()

        await subscribeAndTestEvent(
            {
                addr: contractAddresses.energy,
                t0: interfaces.energy.getEvent('Transfer').topicHash,
                t2: addAddressPadding(wallet.address),
            },
            wallet,
        )
    })

    it.e2eTest('should work for valid addr', 'all', async () => {
        const wallet = ThorWallet.txBetweenFunding()

        await subscribeAndTestEvent(
            {
                addr: contractAddresses.energy,
            },
            wallet,
        )
    })

    it.e2eTest('should work for valid position', 'all', async () => {
        const wallet = ThorWallet.txBetweenFunding()
        const bestBlock = await Client.sdk.blocks.getBlockCompressed('best')
        const bestBlockId = bestBlock?.id

        await subscribeAndTestEvent(
            {
                addr: contractAddresses.energy,
                pos: bestBlockId,
                t0: interfaces.energy.getEvent('Transfer').topicHash,
                t2: addAddressPadding(wallet.address),
            },
            wallet,
        )
    })

    it.e2eTest('should get 2 notifications', 'all', async () => {
        const eventTxs = []
        const txpoolTxs = []

        const wallet = ThorWallet.txBetweenFunding()

        Client.raw.subscribeToEvents(
            (event) => {
                const txID = event.meta?.txID
                if (txID) {
                    eventTxs.push({ id: txID })
                }
            },
            { addr: contractAddresses.energy },
        )

        Client.raw.subscribeToTxPool((txId) => {
            txpoolTxs.push(txId)
        })

        const receipt = await wallet.waitForFunding()
        const txId = receipt.meta?.txID

        // Sleep for 1 sec to ensure the beat is received
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const isInEventTxs = eventTxs.some((tx) => tx.id === txId)
        const isInTxpoolTxs = txpoolTxs.some((tx) => tx.id === txId)

        expect(eventTxs).not.toBeUndefined()
        expect(txpoolTxs).not.toBeUndefined()
        expect(isInEventTxs).toBeTruthy()
        expect(isInTxpoolTxs).toBeTruthy()
    })

    it.e2eTest('should error for invalid position', 'all', async () => {
        await subscribeAndTestError(
            { pos: 'invalid position' },
            'Unexpected server response: 400',
        )
    })

    it.e2eTest(
        'should error for out of range position',
        ['solo', 'default-private'],
        async () => {
            const nonExistentBlockId =
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

            await subscribeAndTestError(
                { pos: nonExistentBlockId },
                'Unexpected server response: 403',
            )
        },
    )

    it.e2eTest('should error for invalid topic', 'all', async () => {
        await subscribeAndTestError(
            { t0: 'invalid topic' },
            'Unexpected server response: 400',
        )
    })

    it.e2eTest('should error for invalid address', 'all', async () => {
        await subscribeAndTestError(
            { addr: 'invalid address' },
            'Unexpected server response: 400',
        )
    })
})
