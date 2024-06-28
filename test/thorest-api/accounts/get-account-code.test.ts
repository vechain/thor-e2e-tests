import { Client } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import { HEX_AT_LEAST_1 } from '../../../src/utils/hex-utils'
import { SimpleCounter__factory } from '../../../typechain-types'
import { revisions } from '../../../src/constants'
import { generateAddresses, ThorWallet } from '../../../src/wallet'
import { testCase, testCaseEach } from '../../../src/test-case'

/**
 * @group api
 * @group accounts
 */
describe('GET /accounts/{address}/code', function() {
    const accountAddress = generateAddresses(4)

    const wallet = ThorWallet.new(true)


    testCaseEach(['solo', 'default-private'])(
        'should return no code for newly created address: %s',
        accountAddress,
        async function(addr) {
            const res = await Client.raw.getAccountCode(addr)

            expect(res.success, 'API response should be a success').toBeTrue()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(res.body, 'Expected Response Body').toEqual({
                code: '0x',
            })
        },
    )

    const noPrefix = Object.values(contractAddresses).map((address) =>
        address.slice(2),
    )


    testCaseEach(['solo', 'default-private'])(
        'should return the code for %s: %s',
        [...Object.values(contractAddresses), ...noPrefix],
        async function(address: string) {
            const res = await Client.raw.getAccountCode(address)

            expect(res.success, 'API response should be a success').toBeTrue()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(res.body, 'Expected Response Body').toEqual({
                code: expect.stringMatching(HEX_AT_LEAST_1),
            })
        },
    )


    testCaseEach(['solo', 'default-private'])(
        `should return 400 for invalid address: %s`, [
        'bad address', //not hex
        '0x0001234', //too short
        '0', //too short
        false,
    ], async function(addr) {
        const res = await Client.raw.getAccountCode(addr as string)

        expect(res.success, 'API Call should fail').toBeFalse()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
    })

    it('should be able to query historic revisions', async () => {
        const txReceipt = await wallet.sendClauses(
            [
                {
                    to: null,
                    value: '0x0',
                    data: SimpleCounter__factory.bytecode,
                },
            ],
            true,
            true,
        )

        const address = txReceipt.outputs?.[0].contractAddress as string

        expect(address).toBeTruthy()

        const code = await Client.raw.getAccountCode(address)

        // Check the bytecode is not equal to 0x
        expect(code.body, 'Expected Response Body').toEqual({
            code: expect.stringMatching(HEX_AT_LEAST_1),
        })

        const codeForRevision = await Client.raw.getAccountCode(
            address,
            `${(txReceipt.meta?.blockNumber ?? 1) - 1}`,
        )

        // Check the bytecode is equal to 0x for the previous revision
        expect(codeForRevision.body?.code).toBeTruthy()
        expect(codeForRevision.body, 'Expected Response Body').toEqual({
            code: '0x',
        })
    })

    testCaseEach(['solo', 'default-private'])(
        'should be able to fetch the account state for revision: %s',
        revisions.valid(),
        async (revision) => {
            const vtho = await Client.raw.getAccountCode(
                contractAddresses.energy,
                revision,
            )

            expect(vtho.success, 'API response should be a success').toBeTrue()
            expect(vtho.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(vtho.body, 'Expected Response Body').toEqual({
                code: expect.stringMatching(HEX_AT_LEAST_1),
            })
        },
    )

    testCaseEach(['solo', 'default-private'])(
        'should throw an error for invalid revision: %s',
        revisions.invalid,
        async (revision) => {
            const vtho = await Client.raw.getAccountCode(
                contractAddresses.energy,
                revision,
            )

            expect(vtho.success, 'API Call should fail').toBeFalse()
            expect(vtho.httpCode, 'Expected HTTP Code').toEqual(400)
        },
    )
})
