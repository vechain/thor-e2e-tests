import { Client } from '../../../src/thor-client'
import { SimpleCounter__factory as SimpleCounter } from '../../../typechain-types'
import { ThorWallet } from '../../../src/wallet'
import { pollReceipt } from '../../../src/transactions'

/**
 * @group api
 * @group debug
 */
describe('GET /debug/storage-range', () => {
    const sender = ThorWallet.withFunds()
    let transaction
    let counter

    beforeAll(async () => {
        counter = await sender.deployContract(
            SimpleCounter.bytecode,
            SimpleCounter.abi,
        )

        let incrementTx = await counter.transact.incrementCounter()
        await pollReceipt(incrementTx.id)

        incrementTx = await counter.transact.incrementCounter()
        transaction = await pollReceipt(incrementTx.id)

        incrementTx = await counter.transact.incrementCounter()
        await pollReceipt(incrementTx.id)
    })

    it.e2eTest(
        'should get non empty storage, empty maxResult',
        'all',
        async () => {
            let storage = await Client.sdk.debug.retrieveStorageRange({
                target: {
                    blockId: transaction?.meta?.blockID,
                    transaction: 0,
                    clauseIndex: 0,
                },
                options: { address: counter.address, maxResult: 10 },
            })
            expect(Object.keys(storage.storage).length).toBeGreaterThan(0)
            expect(storage.nextKey).toBeNull()
        },
    )

    it.e2eTest(
        'should get non empty storage, provided maxResult',
        'all',
        async () => {
            let storage = await Client.sdk.debug.retrieveStorageRange({
                target: {
                    blockId: transaction?.meta?.blockID,
                    transaction: transaction?.meta?.txID,
                    clauseIndex: 0,
                },
                options: { address: counter.address, maxResult: 1 },
            })
          /* eslint-disable jest/prefer-to-have-length */
            expect(Object.keys(storage.storage).length).toBe(1)
            expect(storage.nextKey).toBeNull()
        },
    )

    it.e2eTest(
        'get storage must fail, too large maxResult',
        'all',
        async () => {
            let response = await Client.raw.retrieveStorageRange({
                target: `${transaction?.meta?.blockID}/${transaction?.meta?.txID}/0`,
                maxResult: 10000000000,
            })
            expect(response.success).toBeFalse()
            expect(response.httpCode).toBe(400)
        },
    )
})
