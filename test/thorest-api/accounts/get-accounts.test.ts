import { Client } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import { HEX_REGEX } from '../../../src/utils/hex-utils'
import { revisions } from '../../../src/constants'
import {
    populatedData,
    readRandomTransfer,
    Transfer,
} from '../../../src/populated-data'
import { FAUCET_AMOUNT_HEX } from '../../../src/account-faucet'
import { testCase, testCaseEach } from '../../../src/test-case'
import { ThorWallet } from '../../../src/wallet'

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
        transfer = await readRandomTransfer()
    })

    testCase(['solo', 'default-private', 'testnet'])(
        'correct balance',
        async function () {
            const emptyWallet = ThorWallet.empty()

            const clauses = [
                {
                    to: emptyWallet.address,
                    value: '0x1',
                    data: '0x',
                },
            ]

            await ThorWallet.withFunds().sendClauses(clauses, true)
            const newTransfer = await Client.raw.getAccount(emptyWallet.address)

            expect(
                newTransfer.success,
                'API response should be a success',
            ).toBeTrue()
            expect(newTransfer.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(newTransfer.body, 'Expected Response Body').toEqual({
                balance: '0x1',
                energy: expect.stringMatching(HEX_REGEX),
                hasCode: false,
            })
        },
    )

    testCase(['solo', 'default-private', 'testnet'])(
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

    testCaseEach(['solo', 'default-private', 'testnet'])(
        'valid revision %s',
        revisions.valid(true),
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

    testCaseEach(['solo', 'default-private', 'testnet'])(
        'invalid address: %s',
        invalidAddresses,
        async (a) => {
            const res = await Client.raw.getAccount(a as string)
            expect(res.success, 'API Call should fail').toBeFalse()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
        },
    )

    testCaseEach(['solo', 'default-private', 'testnet'])(
        'invalid revision: %s',
        revisions.invalid,
        async (r) => {
            const res = await Client.raw.getAccount(transfer.vet.recipient, r)
            expect(res.success, 'API Call should fail').toBeFalse()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
        },
    )
})
