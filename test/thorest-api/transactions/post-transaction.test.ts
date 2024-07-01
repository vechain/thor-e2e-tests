import { ThorWallet } from '../../../src/wallet'
import { testCase } from '../../../src/test-case'

/**
 * @group api
 * @group transactions
 */
describe('POST /transactions', function() {
    const wallet = ThorWallet.txBetweenFunding()


    testCase(['solo', 'default-private'])(
        'should send a transaction', async function() {
            const fundReceipt = await wallet.waitForFunding()

            expect(
                fundReceipt?.reverted,
                'Transaction should not be reverted',
            ).toEqual(false)
        })
})
