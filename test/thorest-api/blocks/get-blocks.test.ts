import { Node1Client } from '../../../src/thor-client'
import { components } from '../../../src/open-api-types'
import {
    HEX_REGEX,
    HEX_REGEX_16,
    HEX_REGEX_40,
    HEX_REGEX_64,
} from '../../../src/utils/hex-utils'
import { revisions } from '../../../src/constants'
import { readRandomTransfer, Transfer } from '../../../src/populated-data'

/**
 * @group api
 * @group blocks
 */
describe('GET /blocks/{revision}', function () {
    let transfer: Transfer

    beforeAll(async () => {
        transfer = await readRandomTransfer()
    })

    test('gas limit it equal to 40_000_000', async function () {
        const block = await Node1Client.getBlock(1, false)

        expect(block.success, 'API response should be a success').toBeTrue()
        expect(block.httpCode, 'Expected HTTP Code').toEqual(200)
        expect(block.body?.gasLimit).toEqual(40_000_000)
    })

    it.each(revisions.valid(true))(
        'can get block for revision: %s',
        async function (revision) {
            const block = await Node1Client.getBlock(revision, false)

            expect(block.success, 'API response should be a success').toBeTrue()
            expect(block.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(block.body, 'Expected Response Body').toEqual({
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
        },
    )

    it.each(revisions.validNotFound)(
        'valid revisions not found: %s',
        async function (revision) {
            const block = await Node1Client.getBlock(revision, false)

            expect(block.success, 'API response should be a success').toBeTrue()
            expect(block.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(block.body, 'Expected Response Body').toEqual(null)
        },
    )

    it.each(revisions.invalid)(
        'invalid revisions: %s',
        async function (revision) {
            const block = await Node1Client.getBlock(revision, false)

            expect(block.success, 'API Call should fail').toBeFalse()
            expect(block.httpCode, 'Expected HTTP Code').toEqual(400)
        },
    )

    it('should be able get compressed blocks', async function () {
        const res = await Node1Client.getBlock(transfer.meta?.blockID, false)

        expect(res.success, 'API response should be a success').toBeTrue()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
        expect(res.body, 'Block should not be null').not.toEqual(null)

        const block = res.body as components['schemas']['GetBlockResponse']

        const relevantTx = block.transactions!.find(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            (txID: string) => txID === transfer.meta.txID,
        )

        expect(relevantTx).toBeTruthy()
        expect(relevantTx).toEqual(transfer.meta?.txID)
    })

    it('should be able get expanded blocks', async function () {
        const res = await Node1Client.getBlock(transfer.meta.blockID, true)

        expect(res.success, 'API response should be a success').toBeTrue()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
        expect(res.body, 'Block should not be null').not.toEqual(null)

        const block = res.body as components['schemas']['GetBlockResponse']

        const relevantTx = block.transactions!.find(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            (tx: components['schemas']['Tx']) => tx.id === transfer.meta.txID,
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
