import { Client } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import { HEX_REGEX } from '../../../src/utils/hex-utils'
import { revisions } from '../../../src/constants'
import { readRandomTransfer } from '../../../src/populated-data'
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

    let transfer

    beforeAll(async () => {
        transfer = await readRandomTransfer()
    })

    it.e2eTest('correct balance', 'all', async function () {
        const emptyWallet = await ThorWallet.empty()

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
        ).toBeTruthy()
        expect(newTransfer.httpCode, 'Expected HTTP Code').toEqual(200)
        expect(newTransfer.body, 'Expected Response Body').toEqual({
            balance: '0x1',
            energy: expect.stringMatching(HEX_REGEX),
            hasCode: false,
        })
    })

    it.e2eTest('contract account hasCode', 'all', async function () {
        const addr = contractAddresses.energy
        const res = await Client.raw.getAccount(addr)

        expect(res.success, 'API response should be a success').toBeTruthy()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
        expect(res.body, 'Expected Response Body').toEqual({
            balance: expect.stringMatching(HEX_REGEX),
            energy: expect.stringMatching(HEX_REGEX),
            hasCode: true,
        })
    })

    revisions.valid(true).forEach((revision) => {
        it.e2eTest(`valid revision ${revision}`, 'all', async () => {
            const res = await Client.raw.getAccount(
                transfer.vet.recipient,
                revision,
            )
            expect(res.success, 'API response should be a success').toBeTruthy()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(res.body, 'Expected Response Body').toEqual({
                balance: expect.stringMatching(HEX_REGEX),
                energy: expect.stringMatching(HEX_REGEX),
                hasCode: false,
            })
        })
    })

    invalidAddresses.forEach((address) => {
        it.e2eTest(`invalid address: ${address}`, 'all', async () => {
            const res = await Client.raw.getAccount(address)

            expect(res.success, 'API Call should fail').toBeFalsy()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
        })
    })

    revisions.invalid.forEach((revision) => {
        it.e2eTest(`invalid revision: ${revision}`, 'all', async () => {
            const res = await Client.raw.getAccount(
                transfer.vet.recipient,
                revision,
            )
            expect(res.success, 'API Call should fail').toBeFalsy()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
        })
    })
})
