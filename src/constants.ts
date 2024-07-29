import { TransferDetails } from './types'
import { populatedData } from './populated-data'

const validRevisions = [
    'best',
    '1',
    'justified',
    populatedData.exists() ? populatedData.read().genesisId : '',
]

const validRevisionsNotFound = [
    '123412341',
    '0x00000000b4d1257f314d7b3f6720f99853bef846fa0a3d4873a2e1f5f869b42a',
]

const invalidRevisions = [
    'bestest',
    'finalised',
    '0x00000000b4d1257f314d7b3f6720f99853bef846fa0a3d4873a2e1f5f869bZZZ',
    '0x00000000b4d1257f314d7b3f6720f99853bef846fa0a3d4873a2e1f5f869b',
    '0x',
]

export const genesis = {
    test: '0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127',
    main: '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a',
}

export const revisions = {
    valid(finalized = false) {
        return validRevisions.concat(finalized ? ['finalized'] : [])
    },
    validNotFound: validRevisionsNotFound,
    invalid: invalidRevisions,
}

export const transferDetails: Record<'test' | 'main', TransferDetails> = {
    test: {
        firstBlock: 18878432,
        lastBlock: 18878436,
        transferCount: 50 * 5,
    },
    main: {
        firstBlock: 18829247,
        lastBlock: 18829251,
        transferCount: 50 * 5,
    },
}
