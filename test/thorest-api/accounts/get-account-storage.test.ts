import { Node1Client } from '../../../src/thor-client'
import { FundedAccount, generateWalletWithFunds } from '../../../src/wallet'
import { sendClauses } from '../../../src/transactions'
import { SimpleCounter__factory } from '../../../typechain-types'
import { addUintPadding } from '../../../src/utils/padding-utils'
import { revisions } from '../../../src/constants'
import { HEX_REGEX_64 } from '../../../src/utils/hex-utils'

const SIMPLE_STORAGE_KEY =
    '0x0000000000000000000000000000000000000000000000000000000000000000'

const setSimpleStorage = async (
    contractAddress: string,
    amount: number,
    privateKey: string,
) => {
    return await sendClauses(
        [
            {
                to: contractAddress,
                value: '0x0',
                data: SimpleCounter__factory.createInterface().encodeFunctionData(
                    'setCounter',
                    [amount],
                ),
            },
        ],
        privateKey,
        true,
    )
}

describe('GET /accounts/{address}/storage', function () {
    let wallet: FundedAccount
    let simpleStorageAddress: string

    beforeAll(async () => {
        wallet = await generateWalletWithFunds()

        const txReceipt = await sendClauses(
            [
                {
                    to: null,
                    value: '0x0',
                    data: SimpleCounter__factory.bytecode,
                },
            ],
            wallet.privateKey,
            true,
        )

        expect(txReceipt.outputs[0].contractAddress).toBeTruthy()
        simpleStorageAddress = txReceipt.outputs[0].contractAddress as string
    })

    it('should return the storage value', async function () {
        const amount = 973252

        await setSimpleStorage(simpleStorageAddress, amount, wallet.privateKey)

        const res = await Node1Client.getAccountStorage(
            simpleStorageAddress,
            SIMPLE_STORAGE_KEY,
        )

        expect(res.success).toEqual(true)
        expect(res.httpCode).toEqual(200)
        expect(res.body).toEqual({
            value: addUintPadding(amount),
        })
    })

    it('should be able to query history storage values', async () => {
        const contractState = await Node1Client.getAccountStorage(
            simpleStorageAddress,
            SIMPLE_STORAGE_KEY,
        )

        const startAmount = parseInt(contractState.body?.value ?? '0x', 16)

        const newAmount = startAmount + 1

        const tx = await setSimpleStorage(
            simpleStorageAddress,
            newAmount,
            wallet.privateKey,
        )

        const res = await Node1Client.getAccountStorage(
            simpleStorageAddress,
            SIMPLE_STORAGE_KEY,
        )

        // Check the storage position after the transaction
        expect(res.success).toEqual(true)
        expect(res.httpCode).toEqual(200)
        expect(res.body).toEqual({
            value: addUintPadding(newAmount),
        })

        // Check the storage position before the transaction
        const historic = await Node1Client.getAccountStorage(
            simpleStorageAddress,
            SIMPLE_STORAGE_KEY,
            `${(tx.meta.blockNumber ?? 1) - 1}`,
        )

        expect(historic.success).toEqual(true)
        expect(historic.httpCode).toEqual(200)
        expect(historic.body).toEqual({
            value: addUintPadding(startAmount),
        })
    })

    it.each(revisions.valid())('valid revision %s', async function (revision) {
        const res = await Node1Client.getAccountStorage(
            simpleStorageAddress,
            SIMPLE_STORAGE_KEY,
            revision,
        )
        expect(res.success).toBeTruthy()
        expect(res.httpCode).toEqual(200)
        expect(res.body).toEqual({
            value: expect.stringMatching(HEX_REGEX_64),
        })
    })

    it.each(revisions.invalid)('invalid revision: %s', async (r) => {
        const res = await Node1Client.getAccountStorage(
            simpleStorageAddress,
            SIMPLE_STORAGE_KEY,
            r,
        )

        expect(res.success).toBeFalsy()
        expect(res.httpCode).toEqual(400)
    })
})
