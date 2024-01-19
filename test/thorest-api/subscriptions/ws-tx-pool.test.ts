import { Node1Client } from '../../../src/thor-client'
import {
    generateEmptyWallet,
    generateWalletWithFunds,
} from '../../../src/wallet'
import { sendClauses } from '../../../src/transactions'

describe('WS /subscriptions/txpool', () => {
    it('should be able to subscribe', async () => {
        const txs: { id: string }[] = []

        const wallet = await generateWalletWithFunds()

        Node1Client.subscribeToTxPool((txId) => {
            txs.push(txId)
        })

        const account1 = generateEmptyWallet()
        const account2 = generateEmptyWallet()

        const sentTxs = await Promise.all([
            sendClauses(
                [
                    {
                        to: account1.address,
                        value: 1,
                        data: '0x',
                    },
                ],
                wallet.privateKey,
                false,
            ),
            sendClauses(
                [
                    {
                        to: account2.address,
                        value: 1,
                        data: '0x',
                    },
                ],
                wallet.privateKey,
                false,
            ),
        ])

        //sleep for 1 sec to ensure the beat is received
        await new Promise((resolve) => setTimeout(resolve, 1000))

        expect(txs.length).toBeGreaterThanOrEqual(2)
        expect(txs.some((tx) => tx.id === sentTxs[0].id)).toBeTruthy()
        expect(txs.some((tx) => tx.id === sentTxs[1].id)).toBeTruthy()
    })
})
