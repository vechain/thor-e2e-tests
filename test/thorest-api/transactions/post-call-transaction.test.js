import { ThorWallet, generateAddress } from '../../../src/wallet'
import { TransactionDataDrivenFlow } from './setup/transaction-data-driven-flow'
import { successfulCallTxNoRevert, successfulCallTxRevert } from './setup/asserts'
import { SimpleCounter__factory as SimpleCounter } from '../../../typechain-types'

/**
 * @group api
 * @group transactions
 */
describe('Call transaction with clauses', function () {
    const wallet = ThorWallet.withFunds()

    let counter

    beforeAll(async () => {
        await wallet.waitForFunding()
        counter = await wallet.deployContract(
            SimpleCounter.bytecode,
            SimpleCounter.abi,
        )
    })

    it.e2eTest('should simulate vet transfer', 'all', async function () {
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
            origin: wallet.address
        })

        const testPlan = {
            postTxStep: {
                tx: txBody,
                expectedResult: successfulCallTxNoRevert,
            },
        }

        const ddt = new TransactionDataDrivenFlow(testPlan)
        await ddt.callTransaction()
    })

    it.e2eTest('should simulate function call', 'all', async function () {
        const incrementCounter = '0x5b34b966'

        const txBody = await wallet.buildCallTransaction([
            {
                value: "0x0",
                data: incrementCounter,
                to: counter.address,
            },
        ], {
            origin: wallet.address
        })

        const testPlan = {
            postTxStep: {
                tx: txBody,
                expectedResult: successfulCallTxNoRevert,
            },
        }

        const ddt = new TransactionDataDrivenFlow(testPlan)
        await ddt.callTransaction()
    })

    it.e2eTest('should simulate reverted function call', 'all', async function () {
        const incrementCounter = '0x5b34b966'

        const txBody = await wallet.buildCallTransaction([
            {
                value: "0x0",
                data: incrementCounter,
                to: counter.address,
            },
        ], {
            origin: "0x000000000000000000000000000000000000dEaD"
        })

        const testPlan = {
            postTxStep: {
                tx: txBody,
                expectedResult: successfulCallTxRevert,
            },
        }

        const ddt = new TransactionDataDrivenFlow(testPlan)
        await ddt.callTransaction()
    })

    it.e2eTest('should simulate contract deployment', 'all', async function () {

        const txBody = await wallet.buildCallTransaction([
            {
                value: "0x0",
                data: SimpleCounter.bytecode,
                to: null,
            },
        ], {
            origin: wallet.address
        })

        const testPlan = {
            postTxStep: {
                tx: txBody,
                expectedResult: successfulCallTxNoRevert,
            },
        }

        const ddt = new TransactionDataDrivenFlow(testPlan)
        await ddt.callTransaction()
    })
})
