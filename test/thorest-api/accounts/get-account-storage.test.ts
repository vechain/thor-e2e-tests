import { Client } from '../../../src/thor-client'
import { SimpleCounter__factory } from '../../../typechain-types'
import { addUintPadding } from '../../../src/utils/padding-utils'
import { revisions } from '../../../src/constants'
import { HEX_REGEX_64 } from '../../../src/utils/hex-utils'
import { ThorWallet } from '../../../src/wallet'
import { testCase, testCaseEach } from '../../../src/test-case'

const SIMPLE_STORAGE_KEY =
    '0x0000000000000000000000000000000000000000000000000000000000000000'

const addPaddingWithPrefix = (value: number) => `0x${addUintPadding(value)}`

const setSimpleStorage = async (
    contractAddress: string,
    amount: number,
    wallet: ThorWallet,
) => {
    return await wallet.sendClauses(
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
        true,
    )
}

/**
 * @group api
 * @group accounts
 */
describe('GET /accounts/{address}/storage', function () {
    const wallet = ThorWallet.withFunds({ vet: '0x0', vtho: 2500e18 })
    let simpleStorageAddress: string

    beforeAll(async () => {
        const txReceipt = await wallet.sendClauses(
            [
                {
                    to: null,
                    value: '0x0',
                    data: SimpleCounter__factory.bytecode,
                },
            ],
            true,
        )

        expect(txReceipt.outputs?.[0].contractAddress).toBeTruthy()
        simpleStorageAddress = txReceipt.outputs?.[0].contractAddress as string
    })

    testCase(['solo', 'default-private', 'testnet'])(
        'should return the storage value',
        async function () {
            const amount = 973252

            await setSimpleStorage(simpleStorageAddress, amount, wallet)

            const res = await Client.raw.getAccountStorage(
                simpleStorageAddress,
                SIMPLE_STORAGE_KEY,
            )

            expect(res.success, 'API response should be a success').toBeTrue()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(res.body, 'Expected Response Body').toEqual({
                value: addPaddingWithPrefix(amount),
            })
        },
    )

    testCase(['solo', 'default-private', 'testnet'])(
        'should be able to query history storage values',
        async () => {
            const contractState = await Client.raw.getAccountStorage(
                simpleStorageAddress,
                SIMPLE_STORAGE_KEY,
            )

            const startAmount = parseInt(contractState.body?.value ?? '0x', 16)

            const newAmount = startAmount + 1

            const tx = await setSimpleStorage(
                simpleStorageAddress,
                newAmount,
                wallet,
            )

            const res = await Client.raw.getAccountStorage(
                simpleStorageAddress,
                SIMPLE_STORAGE_KEY,
            )

            // Check the storage position after the transaction
            expect(res.success, 'API response should be a success').toBeTrue()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(res.body, 'Expected Response Body').toEqual({
                value: addPaddingWithPrefix(newAmount),
            })

            // Check the storage position before the transaction
            const historic = await Client.raw.getAccountStorage(
                simpleStorageAddress,
                SIMPLE_STORAGE_KEY,
                `${(tx.meta?.blockNumber ?? 1) - 1}`,
            )

            expect(
                historic.success,
                'API response should be a success',
            ).toBeTrue()
            expect(historic.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(historic.body, 'Expected Response Body').toEqual({
                value: addPaddingWithPrefix(startAmount),
            })
        },
    )

    testCaseEach(['solo', 'default-private', 'testnet'])(
        'valid revision %s',
        revisions.valid(),
        async function (revision) {
            const res = await Client.raw.getAccountStorage(
                simpleStorageAddress,
                SIMPLE_STORAGE_KEY,
                revision,
            )
            expect(res.success, 'API response should be a success').toBeTrue()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(res.body, 'Expected Response Body').toEqual({
                value: expect.stringMatching(HEX_REGEX_64),
            })
        },
    )

    testCaseEach(['solo', 'default-private', 'testnet'])(
        'invalid revision: %s',
        revisions.invalid,
        async (r) => {
            const res = await Client.raw.getAccountStorage(
                simpleStorageAddress,
                SIMPLE_STORAGE_KEY,
                r,
            )

            expect(res.success, 'API Call should fail').toBeFalse()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
        },
    )
})
