import { ThorWallet } from '../../../src/wallet'
import { contractAddresses } from '../../../src/contracts/addresses'
import { interfaces } from '../../../src/contracts/hardhat'
import { Client } from '../../../src/thor-client'

describe('Extension V3', async () => {
    const wallet = ThorWallet.withFunds()

    describe('txClauseCount', async () => {
        const clauses = []
        const txCountClause = {
            to: contractAddresses.extension,
            data: interfaces.extension.encodeFunctionData('txClauseCount', []),
            value: '0x0',
        }

        for (let i = 0; i < 5; i++) {
            clauses.push(txCountClause)
        }

        it.e2eTest(
            'should have the correct output for debugged transactions',
            ['solo', 'default-private'],
            async () => {
                const tx = await wallet.sendClauses(clauses, true)

                const countDebugged = await Client.raw.traceClause({
                    target: `${tx.meta.blockID}/${tx.meta.txID}/0`,
                    name: 'call',
                    config: {},
                })

                expect(countDebugged.success).toBeTruthy()
                expect(BigInt(countDebugged.body.output)).toEqual(5n)
            },
        )

        it.e2eTest(
            'should have the correct output for account calls',
            ['solo', 'default-private'],
            async () => {
                const inspectRes = await Client.raw.executeAccountBatch({
                    clauses,
                })

                expect(inspectRes.success).toBeTruthy()

                for (let i = 0; i < 5; i++) {
                    expect(BigInt(inspectRes.body[i].data)).toEqual(5n)
                }
            },
        )
    })

    describe('txClauseIndex', async () => {
        const clauses = []
        const txIndexClause = {
            to: contractAddresses.extension,
            data: interfaces.extension.encodeFunctionData('txClauseIndex', []),
            value: '0x0',
        }

        for (let i = 0; i < 5; i++) {
            clauses.push(txIndexClause)
        }

        it.e2eTest(
            'should have the correct output for debugged transactions',
            ['solo', 'default-private'],
            async () => {
                const tx = await wallet.sendClauses(clauses, true)

                for (let i = 0; i < 5; i++) {
                    const indexDebugged = await Client.raw.traceClause({
                        target: `${tx.meta.blockID}/${tx.meta.txID}/${i}`,
                        name: 'call',
                        config: {},
                    })

                    expect(indexDebugged.success).toBeTruthy()
                    expect(BigInt(indexDebugged.body.output)).toEqual(BigInt(i))
                }
            },
        )

        it.e2eTest(
            'should have the correct output for account calls',
            ['solo', 'default-private'],
            async () => {
                const inspectRes = await Client.raw.executeAccountBatch({
                    clauses,
                })

                expect(inspectRes.success).toBeTruthy()

                for (let i = 0; i < 5; i++) {
                    expect(BigInt(inspectRes.body[i].data)).toEqual(BigInt(i))
                }
            },
        )
    })
})
