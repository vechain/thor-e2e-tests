import { Node1Client } from '../../../src/thor-client'
import { generateWalletWithFunds } from '../../../src/wallet'
import { components } from '../../../src/open-api-types'
import {
    HEX_REGEX,
    HEX_REGEX_16,
    HEX_REGEX_40,
    HEX_REGEX_64,
} from '../../../src/utils/hex-utils'
import { revisions } from '../../../src/constants'

describe('GET /blocks/{revision}', function () {
    it.each(revisions.valid(true))(
        'can get block for revision: %s',
        async function (revision) {
            const block = await Node1Client.getBlock(revision, false)

            expect(block.success).toEqual(true)
            expect(block.httpCode).toEqual(200)
            expect(block.body).toEqual({
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

            expect(block.success).toEqual(true)
            expect(block.httpCode).toEqual(200)
            expect(block.body).toEqual(null)
        },
    )

    it.each(revisions.invalid)(
        'invalid revisions: %s',
        async function (revision) {
            const block = await Node1Client.getBlock(revision, false)

            expect(block.success).toEqual(false)
            expect(block.httpCode).toEqual(400)
        },
    )

    it('should be able get compressed blocks', async function () {
        const { receipt, address } = await generateWalletWithFunds()

        expect(receipt.meta.blockID).toBeTruthy()

        const block = await Node1Client.getBlock(receipt.meta.blockID!, false)

        expect(block.success).toEqual(true)
        expect(block.httpCode).toEqual(200)
        expect(block.body).not.toEqual(null)

        const relevantTx = block.body!.transactions!.find(
            // @ts-ignore
            (txID: string) => txID === receipt.meta.txID,
        )

        expect(relevantTx).toBeTruthy()
        expect(relevantTx).toEqual(receipt.meta.txID)
    })

    it('should be able get expanded blocks', async function () {
        const { receipt, address } = await generateWalletWithFunds()

        expect(receipt.meta.blockID).toBeTruthy()

        const block = await Node1Client.getBlock(receipt.meta.blockID!, true)

        expect(block.success).toEqual(true)
        expect(block.httpCode).toEqual(200)
        expect(block.body).not.toEqual(null)

        const relevantTx = block.body!.transactions!.find(
            // @ts-ignore
            (tx: components['schemas']['Tx']) => tx.id === receipt.meta.txID,
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
            gasPayer: receipt.gasPayer,
            gasPriceCoef: expect.any(Number),
            gasUsed: receipt.gasUsed,
            id: receipt.meta.txID,
            nonce: expect.stringMatching(HEX_REGEX),
            origin: receipt.gasPayer,
            outputs: expect.any(Array),
            paid: expect.stringMatching(HEX_REGEX),
            reverted: false,
            reward: expect.stringMatching(HEX_REGEX),
            size: expect.any(Number),
        })
    })
})
