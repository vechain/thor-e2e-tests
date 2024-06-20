import { Client } from '../../../src/thor-client'
import { generateAddress, ThorWallet } from '../../../src/wallet'
import { fundAccount, fundingAmounts } from '../../../src/account-faucet'
import { interfaces } from '../../../src/contracts/hardhat'
import { contractAddresses } from '../../../src/contracts/addresses'

/**
 * @group api
 * @group websockets
 */
describe('WS /subscriptions/txpool', () => {
    it('should be able to subscribe', async () => {
        const txs: { id: string }[] = []

        Client.raw.subscribeToTxPool((txId) => {
            txs.push(txId)
        })

        const account1 = generateAddress()
        const account2 = generateAddress()

        const tx1 = fundAccount(account1, fundingAmounts.noVetTinyVtho)
        const tx2 = fundAccount(account2, fundingAmounts.noVetTinyVtho)

        const receipt1 = await tx1
        const receipt2 = await tx2

        expect(txs.length).toBeGreaterThanOrEqual(2)
        expect(
            txs.some((tx) => tx.id === receipt1.receipt.meta?.txID),
        ).toBeTruthy()
        expect(
            txs.some((tx) => tx.id === receipt2.receipt.meta?.txID),
        ).toBeTruthy()
    })
})
