import { ThorWallet, generateAddress } from '../../../src/wallet'
import { TransactionDataDrivenFlow } from './setup/transaction-data-driven-flow'
import { successfulCallTx} from './setup/asserts'

/**
 * @group api
 * @group transactions
 */
describe('Call transaction with clauses', function () {
    const wallet = ThorWallet.withFunds()

    it.e2eTest('should call a transaction', 'all', async function () {
        const txBody = await wallet.buildCallTransaction([
            {
                to: generateAddress(),
                value: `0x${BigInt(5).toString(16)}`,
                data: '0x',
            },
            {
                to: generateAddress(),
                value: `0x${BigInt(6).toString(16)}`,
                data: '0x',
            },
        ], {
            origin: "0xf077b491b355e64048ce21e3a6fc4751eeea77fa"
        })

        const testPlan = {
            postTxStep: {
                tx: txBody,
                expectedResult: successfulCallTx,
            },
        }

        const ddt = new TransactionDataDrivenFlow(testPlan)
        await ddt.callTransaction()
    })
})
