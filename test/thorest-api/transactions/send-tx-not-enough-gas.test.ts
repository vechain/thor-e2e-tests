import { clauseBuilder, Transaction } from '@vechain/sdk-core'
import { generateAddress, ThorWallet } from '../../../src/wallet'
import { SimpleCounterParis__factory as ParisCounter } from '../../../typechain-types'
import { TransactionDataDrivenFlow } from './setup/transaction-data-driven-flow'
import { revertedPostTx } from './setup/asserts'
import { fundingAmounts } from '../../../src/account-faucet'

/**
 * @group api
 * @group transactions
 */
describe('send tx with not enough gas', function () {
    const wallet = ThorWallet.withFunds(fundingAmounts.noVetBigVtho)

    it('should fail when making a contract deployment', async function () {
        // Prepare the transaction
        const deployContractClause = clauseBuilder.deployContract(
            ParisCounter.bytecode,
        )
        const txBody = await wallet.buildTransaction([deployContractClause])
        txBody.gas = 0
        const tx = new Transaction(txBody)
        const rawTx = await wallet.signAndEncodeTx(tx)

        // Create the test plan
        const testPlan = {
            postTxStep: {
                rawTx,
                expectedResult: (data: any) =>
                    revertedPostTx(
                        data,
                        'bad tx: intrinsic gas exceeds provided gas',
                    ),
            },
        }

        // Run the test flow
        const ddt = new TransactionDataDrivenFlow(testPlan)
        await ddt.runTestFlow()
    })

    it('should fail when making a VET transfer', async function () {
        // Prepare the transaction
        const receivingAddr = generateAddress()
        const clauses = [
            {
                value: 1000,
                data: '0x',
                to: receivingAddr,
            },
        ]
        const txBody = await wallet.buildTransaction(clauses)
        txBody.gas = 0
        const tx = new Transaction(txBody)
        const rawTx = await wallet.signAndEncodeTx(tx)

        // Create the test plan
        const testPlan = {
            postTxStep: {
                rawTx,
                expectedResult: (data: any) =>
                    revertedPostTx(
                        data,
                        'bad tx: intrinsic gas exceeds provided gas',
                    ),
            },
        }

        // Run the test flow
        const ddt = new TransactionDataDrivenFlow(testPlan)
        await ddt.runTestFlow()
    })

    it('should fail when making a contract call', async function () {
        // Preconditions - deploy a contract
        const contract = await wallet.deployContract(
            ParisCounter.bytecode,
            ParisCounter.abi,
        )
        expect(contract.address).toBeDefined()

        const parisInterface = ParisCounter.createInterface()
        const clauses = [
            {
                data: parisInterface.encodeFunctionData('incrementCounter'),
                value: '0x0',
                to: contract.address,
            },
        ]
        const txBody = await wallet.buildTransaction(clauses)
        txBody.gas = 0
        const tx = new Transaction(txBody)
        const rawTx = await wallet.signAndEncodeTx(tx)

        // Create the test plan
        const testPlan = {
            postTxStep: {
                rawTx,
                expectedResult: (data: any) =>
                    revertedPostTx(
                        data,
                        'bad tx: intrinsic gas exceeds provided gas',
                    ),
            },
        }

        // Run the test flow
        const ddt = new TransactionDataDrivenFlow(testPlan)
        await ddt.runTestFlow()
    })
})
