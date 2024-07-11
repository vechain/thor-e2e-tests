import { Client } from '../../../src/thor-client'
import { ThorWallet } from '../../../src/wallet'

/**
 * @group api
 * @group websockets
 */
describe('WS /subscriptions/txpool', () => {
    it.e2eTest('should be able to subscribe', 'all', async () => {
        const txs: { id: string }[] = []

        const wallet1 = ThorWallet.txBetweenFunding()
        const wallet2 = ThorWallet.txBetweenFunding()

        Client.raw.subscribeToTxPool((txId) => {
            txs.push(txId)
        })

        const receipt1 = await wallet1.waitForFunding()
        const receipt2 = await wallet2.waitForFunding()

        //sleep for 1 sec to ensure the beat is received
        await new Promise((resolve) => setTimeout(resolve, 1000))

        expect(txs.length).toBeGreaterThanOrEqual(2)
        expect(txs.some((tx) => tx.id === receipt1?.meta?.txID)).toBeTruthy()
        expect(txs.some((tx) => tx.id === receipt2?.meta?.txID)).toBeTruthy()
    })
})
