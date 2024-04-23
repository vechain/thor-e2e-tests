import { Node1Client } from '../../../src/thor-client'
import { generateAddress, ThorWallet } from '../../../src/wallet'

/**
 * @group api
 * @group websockets
 */
describe('WS /subscriptions/txpool', () => {
    it('should be able to subscribe', async () => {
        const txs: { id: string }[] = []

        const wallet = ThorWallet.new(true)

        Node1Client.subscribeToTxPool((txId) => {
            txs.push(txId)
        })

        const account1 = generateAddress()
        const account2 = generateAddress()

        const sentTxs = await Promise.all([
            wallet.sendClauses(
                [
                    {
                        to: account1,
                        value: 1,
                        data: '0x',
                    },
                ],
                true,
            ),
            wallet.sendClauses(
                [
                    {
                        to: account2,
                        value: 1,
                        data: '0x',
                    },
                ],
                true,
            ),
        ])

        expect(txs.length).toBeGreaterThanOrEqual(2)
        expect(txs.some((tx) => tx.id === sentTxs[0].meta?.txID)).toBeTruthy()
        expect(txs.some((tx) => tx.id === sentTxs[1].meta?.txID)).toBeTruthy()
    })
})
