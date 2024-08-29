import { Client } from '../../../src/thor-client'
import {
    HEX_REGEX,
    HEX_REGEX_16,
    HEX_REGEX_40,
    HEX_REGEX_64,
} from '../../../src/utils/hex-utils'
import { revisions } from '../../../src/constants'
import { readRandomTransfer } from '../../../src/populated-data'

/**
 * @group api
 * @group blocks
 */
describe('GET /blocks/{revision}', function () {
    let transfer

    beforeAll(async () => {
        transfer = await readRandomTransfer()
    })

    it.e2eTest(
        'gas limit is equal to 40_000_000',
        ['solo', 'default-private'],
        async () => {
            const block = await Client.raw.getBlock(1, false)

            expect(block.success, 'API response should be a success').toBeTrue()
            expect(block.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(block.body?.gasLimit).toEqual(40_000_000)
        },
    )

    it.e2eTest('gas limit is equal to 10_000_000', ['testnet'], async () => {
        const block = await Client.raw.getBlock(1, false)

        expect(block.success, 'API response should be a success').toBeTrue()
        expect(block.httpCode, 'Expected HTTP Code').toEqual(200)
        expect(block.body?.gasLimit).toEqual(10_000_000)
    })

    revisions.valid(true).forEach((revision) => {
        it.e2eTest(`valid revision ${revision}`, 'all', async () => {
            const res = await Client.raw.getBlock(revision, false)
            expect(res.success, 'API response should be a success').toBeTrue()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(res.body, 'Expected Response Body').toEqual({
                beneficiary: expect.stringMatching(HEX_REGEX_40),
                com: expect.any(Boolean),
                gasLimit: expect.any(Number),
                gasUsed: expect.any(Number),
                id: expect.stringMatching(HEX_REGEX_64),
                isFinalized: expect.any(Boolean),
                isTrunk: expect.any(Boolean),
                number: expect.any(Number),
                parentID: expect.stringMatching(HEX_REGEX_64),
                receiptsRoot: expect.stringMatching(HEX_REGEX_64),
                signer: expect.stringMatching(HEX_REGEX_40),
                size: expect.any(Number),
                stateRoot: expect.stringMatching(HEX_REGEX_64),
                timestamp: expect.any(Number),
                totalScore: expect.any(Number),
                transactions: expect.any(Array),
                txsFeatures: expect.any(Number),
                txsRoot: expect.stringMatching(HEX_REGEX_64),
            })
        })
    })

    revisions.validNotFound.forEach((revision) => {
        it.e2eTest(`valid revision not found: ${revision}`, 'all', async () => {
            const block = await Client.raw.getBlock(revision, false)

            expect(block.success, 'API response should be a success').toBeTrue()
            expect(block.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(block.body, 'Expected Response Body').toEqual(null)
        })
    })

    // testCaseEach('all')(
    //     'invalid revisions: %s',
    //     revisions.invalid,
    //     async function (revision) {
    //         const block = await Client.raw.getBlock(revision, false)
    //
    //         expect(block.success, 'API Call should fail').toBeFalse()
    //         expect(block.httpCode, 'Expected HTTP Code').toEqual(400)
    //     },
    // )
    revisions.invalid.forEach((revision) => {
        it.e2eTest(`invalid revision: ${revision}`, 'all', async () => {
            const block = await Client.raw.getBlock(revision, false)

            expect(block.success, 'API Call should fail').toBeFalse()
            expect(block.httpCode, 'Expected HTTP Code').toEqual(400)
        })
    })

    it.e2eTest('should be able get compressed blocks', 'all', async () => {
        const res = await Client.raw.getBlock(transfer.meta?.blockID, false)

        expect(res.success, 'API response should be a success').toBeTrue()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
        expect(res.body, 'Block should not be null').not.toEqual(null)

        const block = res.body

        const relevantTx = block.transactions.find(
            (txID) => txID === transfer.meta.txID,
        )

        expect(relevantTx).toBeTruthy()
        expect(relevantTx).toEqual(transfer.meta?.txID)
    })

    it.e2eTest('should be able get expanded blocks', 'all', async () => {
        const res = await Client.raw.getBlock(transfer.meta.blockID, true)

        expect(res.success, 'API response should be a success').toBeTrue()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
        expect(res.body, 'Block should not be null').not.toEqual(null)

        const block = res.body

        const relevantTx = block.transactions.find(
            (tx) => tx.id === transfer.meta.txID,
        )

        expect(relevantTx).toBeTruthy()
        expect(relevantTx).toEqual({
            blockRef: expect.stringMatching(HEX_REGEX_16),
            chainTag: expect.any(Number),
            clauses: expect.any(Array),
            delegator: null,
            dependsOn: null,
            expiration: expect.any(Number),
            gas: expect.any(Number),
            gasPayer: expect.stringMatching(HEX_REGEX_40),
            gasPriceCoef: expect.any(Number),
            gasUsed: expect.any(Number),
            id: transfer.meta.txID,
            nonce: expect.stringMatching(HEX_REGEX),
            origin: expect.stringMatching(HEX_REGEX_40),
            outputs: expect.any(Array),
            paid: expect.stringMatching(HEX_REGEX),
            reverted: false,
            reward: expect.stringMatching(HEX_REGEX),
            size: expect.any(Number),
        })
    })
})
