import { ThorWallet } from '../../../src/wallet'
import { testCase } from '../../../src/test-case'
import { fundingAmounts } from '../../../src/account-faucet'

/**
 * @group api
 * @group transactions
 */
describe('POST /transactions', function() {
    const wallet = ThorWallet.withFunds(fundingAmounts.noVetTinyVtho)


    testCase(['solo', 'default-private'])(
        'should send a transaction', async function() {
            const fundReceipt = await wallet.waitForFunding()

            expect(
                fundReceipt?.reverted,
                'Transaction should not be reverted',
            ).toEqual(false)
        })
})
