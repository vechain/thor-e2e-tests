import { Client } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import { HEX_REGEX } from '../../../src/utils/hex-utils'
import { revisions } from '../../../src/constants'
import { Transfer } from '../../../src/types'
import { getRandomTransfer } from '../../../src/logs/query-logs'
import { testCase, testCaseEach } from '../../../src/test-case'

/**
 * @group api
 * @group accounts
 */
describe('GET /accounts/{address}', function () {
    const invalidAddresses = [
        '0x00000000',
        'zzzzzzz',
        '0x7567d83b7b8d80addcb281a71d54fc7b3364ffeZ',
        '0x7567d83b7b8d80addcb281a71d54fc7b3364ffe',
    ]

    let transfer: Transfer

    beforeAll(async () => {
        transfer = await getRandomTransfer()
    })

    testCase(['solo', 'default-private'])('correct balance', async function () {
        const res = await Client.raw.getAccount(transfer.vet.recipient)

        expect(res.success, 'API response should be a success').toBeTrue()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
        expect(res.body, 'Expected Response Body').toEqual({
            balance: transfer.vet.amount,
            energy: expect.stringMatching(HEX_REGEX),
            hasCode: false,
        })
    })

    testCase(['solo', 'default-private'])(
        'contract account hasCode',
        async function () {
            const addr = contractAddresses.energy
            const res = await Client.raw.getAccount(addr)

            expect(res.success, 'API response should be a success').toBeTrue()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(res.body, 'Expected Response Body').toEqual({
                balance: expect.stringMatching(HEX_REGEX),
                energy: expect.stringMatching(HEX_REGEX),
                hasCode: true,
            })
        },
    )

    testCaseEach(['solo', 'default-private'])(
        'valid revision %s',
        revisions.valid(),
        async function (revision) {
            const res = await Client.raw.getAccount(
                transfer.vet.recipient,
                revision,
            )
            expect(res.success, 'API response should be a success').toBeTrue()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(res.body, 'Expected Response Body').toEqual({
                balance: expect.stringMatching(HEX_REGEX),
                energy: expect.stringMatching(HEX_REGEX),
                hasCode: false,
            })
        },
    )

    testCaseEach(['solo', 'default-private'])(
        'invalid address %s',
        invalidAddresses,
        async function (addr) {
            const res = await Client.raw.getAccount(addr as string)

            expect(res.success, 'API Call should fail').toBeFalse()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
        },
    )

    testCaseEach(['solo', 'default-private'])(
        'invalid revision %s',
        revisions.invalid,
        async function (revision) {
            const res = await Client.raw.getAccount(
                transfer.vet.recipient,
                revision,
            )
            expect(res.success, 'API Call should fail').toBeFalse()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
        },
    )
})
