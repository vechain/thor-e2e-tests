
import { Client, Schema } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import { interfaces } from '../../../src/contracts/hardhat'
import { HEX_AT_LEAST_1, HEX_REGEX_40 } from '../../../src/utils/hex-utils'
import {
    SimpleCounter__factory as SimpleCounter,
} from '../../../typechain-types'
import { revisions } from '../../../src/constants'
import {
    addAddressPadding,
    addUintPadding,
} from '../../../src/utils/padding-utils'
import { ThorWallet } from '../../../src/wallet'
import { components } from '../../../src/open-api-types'
import { Contract } from '@vechain/sdk-network'
import { pollReceipt } from '../../../src/transactions'

const SEND_VTHO_AMOUNT = '0x1'
const SEND_VTHO_CLAUSE = {
    to: contractAddresses.energy,
    value: '0x0',
    data: interfaces.energy.encodeFunctionData('transfer', [
        ThorWallet.withFunds().address,
        SEND_VTHO_AMOUNT,
    ]),
}

describe('GET /debug/storage-range', () => {
    const sender = ThorWallet.withFunds()
    let transaction: components['schemas']['GetTxReceiptResponse']
    let counter: Contract<typeof SimpleCounter.abi>
    beforeAll(async () => {
        counter = await sender.deployContract(
            SimpleCounter.bytecode,
            SimpleCounter.abi,
        )
        let incrementTx = await counter.transact.incrementCounter()
        transaction = await pollReceipt(incrementTx.id)
        incrementTx = await counter.transact.incrementCounter()
        transaction = await pollReceipt(incrementTx.id)
    })


    it.e2eTest('should get non empty storage, empty maxResult', 'all', async () => {
        let storage = await Client.sdk.debug.retrieveStorageRange({ target: { blockID: transaction?.meta?.blockID!, transaction: transaction?.meta?.txID!, clauseIndex: 0 }, options: { address: counter.address } })
        expect(Object.keys(storage.storage).length).toBeGreaterThan(0)
        expect(storage.nextKey).toBeString()
    })

    it.e2eTest('should get non empty storage, provided maxResult', 'all', async () => {
        let storage = await Client.sdk.debug.retrieveStorageRange({ target: { blockID: transaction?.meta?.blockID!, transaction: transaction?.meta?.txID!, clauseIndex: 0 }, options: { address: counter.address, maxResult: 1 } })
        expect(Object.keys(storage.storage).length).toBe(1)
        expect(storage.nextKey).toBeNull()
    })

    it.e2eTest('get storage must fail, too large maxResult', 'all', async () => {
        let response = await Client.raw.retrieveStorageRange({ target: `${transaction?.meta?.blockID!}/${transaction?.meta?.txID!}/0`, maxResult: 10000000000 })
        expect(response.success).toBeFalse()
        expect(response.httpCode).toBe(400)
    })
})
