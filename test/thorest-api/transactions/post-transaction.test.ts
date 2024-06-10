import { ThorWallet } from '../../../src/wallet'

/**
 * @group api
 * @group transactions
 */
describe('POST /transactions', function () {
    const wallet = ThorWallet.new(true)

    it('should send a transaction', async function () {
        const fundReceipt = await wallet.waitForFunding()

        expect(
            fundReceipt?.reverted,
            'Transaction should not be reverted',
        ).toEqual(false)
    })
})