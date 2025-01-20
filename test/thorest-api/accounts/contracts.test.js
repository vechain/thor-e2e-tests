import { generateAddress, ThorWallet } from '../../../src/wallet'
import {
    AuthorizeTransaction__factory as AuthorizeTransaction,
    SimpleCounter__factory as SimpleCounter,
    Stringer__factory,
} from '../../../typechain-types'
import { Client } from '../../../src/thor-client'
import { interfaces } from '../../../src/contracts/hardhat'
import { pollReceipt } from '../../../src/transactions'

// This is the event topic for the master event
const masterEvent =
    '0xb35bf4274d4295009f1ec66ed3f579db287889444366c03d3a695539372e8951'

/**
 * @group api
 * @group accounts
 */
describe('Contracts', async () => {
    const wallet = ThorWallet.withFunds()
    const counter = await wallet.deployContract(
        SimpleCounter.bytecode,
        SimpleCounter.abi,
    )

    it.e2eTest(
        'should be able to deploy a contract and verify it',
        'all',
        async () => {
            const byteCode = await Client.sdk.accounts.getBytecode(
                counter.address,
            )
            const compiledRuntimeBytecode = SimpleCounter.bytecode.slice(
                SimpleCounter.bytecode.indexOf('6080604052'),
            )
            const deployedRuntimeBytecode = byteCode
                .toString()
                .slice(byteCode.toString().indexOf('6080604052'))
            expect(compiledRuntimeBytecode).toContain(deployedRuntimeBytecode)

            const block = await Client.sdk.blocks.getBlockExpanded(
                counter.deployTransactionReceipt.meta.blockNumber,
            )
            const relevantTx = block.transactions.find((tx) =>
                tx.outputs.some(
                    (output) => output.contractAddress === counter.address,
                ),
            )

            expect(relevantTx).toBeDefined()
            expect(relevantTx.outputs[0].events[0].topics[0]).toBe(masterEvent)
            expect(relevantTx.outputs[0].events[0].address).toBe(
                counter.address,
            )
        },
    )

    it.e2eTest(
        'should be able to interact with a deployed smart contract',
        'all',
        async () => {
            const startValue = await counter.read.getCounter()

            const incrementTx = await counter.transact.incrementCounter()
            await pollReceipt(incrementTx.id)

            const newValue = await counter.read.getCounter()

            expect(newValue[0]).toBe(startValue[0] + 1n)
        },
    )

    it.e2eTest(
        'should be able to execute multiple clauses in a single transaction',
        'all',
        async () => {
            const startValue = await counter.read.getCounter()
            const incrementCounterClause = counter.clause.incrementCounter()

            const tx =
                await Client.sdk.contracts.executeMultipleClausesTransaction(
                    [
                        incrementCounterClause,
                        incrementCounterClause,
                        incrementCounterClause,
                    ],
                    wallet.signer,
                )

            await pollReceipt(tx.id)
            const receipt = await tx.wait()
            expect(receipt).toBeDefined()
            expect(receipt.reverted).toBeFalsy()

            const newValue = await counter.read.getCounter()
            expect(newValue[0]).toBe(startValue[0] + 3n)
        },
    )

    it.e2eTest(
        'clause updates should impact subsequent clauses',
        'all',
        async () => {
            const authorizeTransaction = await wallet.deployContract(
                AuthorizeTransaction.bytecode,
                AuthorizeTransaction.abi,
            )
            const payClause = authorizeTransaction.clause.pay()

            const estimate = await Client.sdk.gas.estimateGas([
                payClause.clause,
            ])
            expect(estimate.reverted).toBeTruthy()
            expect(
                estimate.revertReasons.some(
                    (reason) => reason === 'Not authorized',
                ),
            ).toBeTruthy()

            const authorizeClause = authorizeTransaction.clause.authorize()

            const tx =
                await Client.sdk.contracts.executeMultipleClausesTransaction(
                    [authorizeClause, payClause],
                    wallet.signer,
                )

            await pollReceipt(tx.id)
            const receipt = await tx.wait()
            expect(receipt).toBeDefined()
            expect(receipt.reverted).toBeFalsy()
        },
    )

    it.e2eTest(
        'should be able send a clause to an account with no bytecode',
        'all',
        async () => {
            const clause = {
                to: await generateAddress(),
                value: '0x0',
                data: interfaces.energy.encodeFunctionData('transfer', [
                    wallet.address,
                    1n,
                ]),
            }

            const receipt = await wallet.sendClauses([clause], true)
            expect(receipt).toBeDefined()
            expect(receipt.reverted).toBeFalsy()
        },
    )

    it.e2eTest(
        'should be able to send a clause to a contract that does not have the method',
        'all',
        async () => {
            const clause = {
                to: counter.address,
                value: '0x0',
                data: interfaces.energy.encodeFunctionData('transfer', [
                    wallet.address,
                    1n,
                ]),
            }

            const receipt = await wallet.sendClauses([clause], true)
            expect(receipt).toBeDefined()
            expect(receipt.reverted).toBeTruthy()
        },
    )

    it.e2eTest(
        'should not be able to send invalid parameters to a contract',
        'all',
        async () => {
            const stringer = await wallet.deployContract(
                Stringer__factory.bytecode,
                Stringer__factory.abi,
            )

            const priorText = await stringer.read.text()
            const validContractCall =
                Stringer__factory.createInterface().encodeFunctionData(
                    'setText',
                    ['Goodbye, World!'],
                )

            const contractCallSelector = validContractCall.slice(0, 10)

            // Append a random address instead of the string data
            const invalidContractCall =
                contractCallSelector +
                '000000000000000000000000a4ec2cc9c671a2af7668f315e0d4ec85e2a44bb6'

            const clause = {
                to: stringer.address,
                value: '0x0',
                data: invalidContractCall,
            }

            const receipt = await wallet.sendClauses([clause], true)
            expect(receipt).toBeDefined()
            expect(receipt.reverted).toBeTruthy()

            const currentText = await stringer.read.text()
            expect(currentText[0]).toBe(priorText[0])
        },
    )
})
