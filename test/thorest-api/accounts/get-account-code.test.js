import { Client } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import { HEX_AT_LEAST_1 } from '../../../src/utils/hex-utils'
import { SimpleCounter__factory } from '../../../typechain-types'
import { revisions } from '../../../src/constants'
import { generateAddresses, ThorWallet } from '../../../src/wallet'
import { fundingAmounts } from '../../../src/account-faucet'

/**
 * @group api
 * @group accounts
 */
describe('GET /accounts/{address}/code', function () {
    let accountAddress
    let wallet

    beforeAll(async () => {
        accountAddress = await generateAddresses(4)
        wallet = await ThorWallet.newFunded(fundingAmounts.noVetBigVtho)
    })

    it.e2eTest(
        `should return no code for newly created addresses`,
        'all',
        async () => {
            for (const address of accountAddress) {
                const res = await Client.raw.getAccountCode(address)

                expect(
                    res.success,
                    'API response should be a success',
                ).toBeTrue()
                expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
                expect(res.body, 'Expected Response Body').toEqual({
                    code: '0x',
                })
            }
        },
    )

    const noPrefix = Object.values(contractAddresses).map((address) =>
        address.slice(2),
    )

    noPrefix.forEach((address) => {
        it.e2eTest(`should return the code for ${address}`, 'all', async () => {
            const res = await Client.raw.getAccountCode(address)

            expect(res.success, 'API response should be a success').toBeTrue()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(res.body, 'Expected Response Body').toEqual({
                code: expect.stringMatching(HEX_AT_LEAST_1),
            })
        })
    })

    Array.from([
        'bad address', //not hex
        '0x0001234', //too short
        '0', //too short
        'false',
    ]).forEach((address) => {
        it.e2eTest(
            `should return 400 for invalid address: ${address}`,
            'all',
            async () => {
                const res = await Client.raw.getAccountCode(address)

                expect(res.success, 'API Call should fail').toBeFalse()
                expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
            },
        )
    })

    it.e2eTest(
        'should be able to query historic revisions',
        'all',
        async () => {
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

            const address = txReceipt.outputs?.[0].contractAddress

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
        },
    )

    revisions.valid().forEach((revision) => {
        it.e2eTest(
            `should be able to fetch the account state for revision: ${revision}`,
            'all',
            async () => {
                const vtho = await Client.raw.getAccountCode(
                    contractAddresses.energy,
                    revision,
                )

                expect(
                    vtho.success,
                    'API response should be a success',
                ).toBeTrue()
                expect(vtho.httpCode, 'Expected HTTP Code').toEqual(200)
                expect(vtho.body, 'Expected Response Body').toEqual({
                    code: expect.stringMatching(HEX_AT_LEAST_1),
                })
            },
        )
    })

    revisions.invalid.forEach((revision) => {
        it.e2eTest(
            `should throw an error for invalid revision: ${revision}`,
            'all',
            async () => {
                const vtho = await Client.raw.getAccountCode(
                    contractAddresses.energy,
                    revision,
                )

                expect(vtho.success, 'API Call should fail').toBeFalse()
                expect(vtho.httpCode, 'Expected HTTP Code').toEqual(400)
            },
        )
    })
})
