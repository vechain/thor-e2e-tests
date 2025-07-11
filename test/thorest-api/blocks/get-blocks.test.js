import { Client } from '../../../src/thor-client'
import {
    HEX_REGEX,
    HEX_REGEX_16,
    HEX_REGEX_40,
    HEX_REGEX_64,
} from '../../../src/utils/hex-utils'
import { revisions } from '../../../src/constants'
import { readRandomTransfer } from '../../../src/populated-data'
import {
    FixedHexBlobKind,
    Hex,
    HexBlobKind,
    NumericKind,
    RLPProfiler,
} from '@vechain/sdk-core'
import genesis from '../../../network/config/genesis.json'

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

            expect(
                block.success,
                'API response should be a success',
            ).toBeTruthy()
            expect(block.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(block.body?.gasLimit).toEqual(40_000_000)
        },
    )

    it.e2eTest('gas limit is equal to 10_000_000', ['testnet'], async () => {
        const block = await Client.raw.getBlock(1, false)

        expect(block.success, 'API response should be a success').toBeTruthy()
        expect(block.httpCode, 'Expected HTTP Code').toEqual(200)
        expect(block.body?.gasLimit).toEqual(10_000_000)
    })

    revisions.valid(true).forEach((revision) => {
        it.e2eTest(`valid revision ${revision}`, 'all', async () => {
            const res = await Client.raw.getBlock(revision, false)
            expect(res.success, 'API response should be a success').toBeTruthy()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
            const expectedRes = {
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
                evidence: null,
                size: expect.any(Number),
                stateRoot: expect.stringMatching(HEX_REGEX_64),
                timestamp: expect.any(Number),
                totalScore: expect.any(Number),
                transactions: expect.any(Array),
                txsFeatures: expect.any(Number),
                txsRoot: expect.stringMatching(HEX_REGEX_64),
            }
            if (res.body.number >= genesis.forkConfig.GALACTICA) {
                expectedRes.baseFeePerGas = expect.stringMatching(HEX_REGEX)
            }
            expect(res.body, 'Expected Response Body').toEqual(expectedRes)
        })
    })

    revisions.validNotFound.forEach((revision) => {
        it.e2eTest(`valid revision not found: ${revision}`, 'all', async () => {
            const block = await Client.raw.getBlock(revision, false)

            expect(
                block.success,
                'API response should be a success',
            ).toBeTruthy()
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
    //         expect(block.success, 'API Call should fail').toBeFalsy()
    //         expect(block.httpCode, 'Expected HTTP Code').toEqual(400)
    //     },
    // )
    revisions.invalid.forEach((revision) => {
        it.e2eTest(`invalid revision: ${revision}`, 'all', async () => {
            const block = await Client.raw.getBlock(revision, false)

            expect(block.success, 'API Call should fail').toBeFalsy()
            expect(block.httpCode, 'Expected HTTP Code').toEqual(400)
        })
    })

    it.e2eTest('should be able get raw blocks', 'all', async () => {
        const [res, block_res] = await Promise.all([
            Client.raw.getBlock(transfer.meta?.blockID, null, true),
            Client.raw.getBlock(transfer.meta?.blockID, null, false),
        ])

        expect(res.success, 'API response should be a success').toBeTruthy()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
        expect(res.body, 'Block should not be null').not.toEqual(null)
        expect(res.body.raw.length, 'Raw should be not empty').toBeGreaterThan(
            2,
        )

        expect(
            block_res.success,
            'API response should be a success',
        ).toBeTruthy()
        expect(block_res.httpCode, 'Expected HTTP Code').toEqual(200)
        expect(block_res.body, 'Block should not be null').not.toEqual(null)

        // header profile
        const headerProfile = {
            name: 'header',
            kind: [
                { name: 'ParentID', kind: new FixedHexBlobKind(32) },
                { name: 'Timestamp', kind: new NumericKind(8) },
                { name: 'GasLimit', kind: new NumericKind(8) },
                { name: 'Beneficiary', kind: new FixedHexBlobKind(20) },
                { name: 'GasUsed', kind: new NumericKind(8) },
                { name: 'TotalScore', kind: new NumericKind(8) },
                {
                    name: 'TxsRootFeatures',
                    kind: [
                        { name: 'TxsRoot', kind: new FixedHexBlobKind(32) },
                        { name: 'Features', kind: new NumericKind(1) },
                    ],
                },
                { name: 'StateRoot', kind: new FixedHexBlobKind(32) },
                { name: 'ReceiptsRoot', kind: new FixedHexBlobKind(32) },
                { name: 'Signature', kind: new HexBlobKind() },
                {
                    name: 'Extension',
                    kind: [
                        { name: 'Alpha', kind: new HexBlobKind() },
                        { name: 'COM', kind: new HexBlobKind() },
                        { name: 'BaseFeePerGas', kind: new HexBlobKind() },
                        { name: 'Evidence', kind: [] },
                    ],
                    // TODO: COM is usually false, and if kept there it throws an error (expected 2 got 1)
                    // TODO: not sure how to make it optional
                },
            ],
        }

        // decode
        const decodedObject = RLPProfiler.ofObjectEncoded(
            Hex.of(res.body.raw).bytes,
            headerProfile,
        ).object

        // compare the decoded object with the original response
        expect(block_res.body.parentID).toEqual(decodedObject.ParentID)
        expect(block_res.body.timestamp).toEqual(decodedObject.Timestamp)
        expect(block_res.body.gasLimit).toEqual(decodedObject.GasLimit)
        expect(block_res.body.beneficiary).toEqual(decodedObject.Beneficiary)
        expect(block_res.body.gasUsed).toEqual(decodedObject.GasUsed)
        expect(block_res.body.totalScore).toEqual(decodedObject.TotalScore)
        expect(block_res.body.txsRoot).toEqual(
            decodedObject.TxsRootFeatures.TxsRoot,
        )
        expect(block_res.body.txsFeatures).toEqual(
            decodedObject.TxsRootFeatures.Features,
        )
        expect(block_res.body.stateRoot).toEqual(decodedObject.StateRoot)
        expect(block_res.body.receiptsRoot).toEqual(decodedObject.ReceiptsRoot)

        // encode back
        const encodedObject = RLPProfiler.ofObject(
            decodedObject,
            headerProfile,
        ).encoded

        // compare the encoded object with the original raw
        expect(Hex.of(encodedObject).toString()).toBe(res.body.raw)
    })

    it.e2eTest(
        'should be able get raw and compressed blocks',
        'all',
        async () => {
            const res = await Client.raw.getBlock(
                transfer.meta?.blockID,
                false,
                true,
            )

            expect(res.success, 'API response should be a success').toBeTruthy()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(res.body, 'Block should not be null').not.toEqual(null)
        },
    )

    it.e2eTest(
        'should not be able to get raw and expanded blocks',
        'all',
        async () => {
            const res = await Client.raw.getBlock(
                transfer.meta?.blockID,
                true,
                true,
            )

            expect(res.success, 'API response should be a success').toBeFalsy()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
            expect(res.httpMessage, 'Should be present').toBe(
                'raw&expanded: Raw and Expanded are mutually exclusive\n',
            )
        },
    )

    it.e2eTest('should be able get compressed blocks', 'all', async () => {
        const res = await Client.raw.getBlock(
            transfer.meta?.blockID,
            false,
            null,
        )

        expect(res.success, 'API response should be a success').toBeTruthy()
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
        const res = await Client.raw.getBlock(transfer.meta.blockID, true, null)

        expect(res.success, 'API response should be a success').toBeTruthy()
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
            type: expect.any(Number),
        })
    })
})
