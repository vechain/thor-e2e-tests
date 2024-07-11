import { ThorWallet } from '../../../src/wallet'

/**
 * @group api
 * @group transactions
 */
describe('POST /transactions', function () {
    const wallet = ThorWallet.txBetweenFunding()

    it.e2eTest('should send a transaction', 'all', async () => {
        const fundReceipt = await wallet.waitForFunding()

        expect(
            fundReceipt?.reverted,
            'Transaction should not be reverted',
        ).toEqual(false)
    })
})
