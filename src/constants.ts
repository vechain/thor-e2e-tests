import { TransferDetails } from './types'
import { populatedData } from './populated-data'

export const revisions = {
    valid(finalized = false) {
        return ['best', '1', populatedData.read().genesisId].concat(
            finalized ? ['finalized'] : [],
        )
    },
    validNotFound: [
        '123412341',
        '0x00000000b4d1257f314d7b3f6720f99853bef846fa0a3d4873a2e1f5f869b42a',
    ],
    invalid: [
        'bestest',
        'finalised',
        '0x00000000b4d1257f314d7b3f6720f99853bef846fa0a3d4873a2e1f5f869bZZZ',
        '0x00000000b4d1257f314d7b3f6720f99853bef846fa0a3d4873a2e1f5f869b',
        '0x',
    ],
}

export const genesis = {
    test: '0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127',
    main: '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a',
}

export const transferIds = {
    test: '0x1766546bb030d4eea1b1fd7fd95c2d703f6594c84efa30634a5c7dd71102a4c9',
    main: '0x3b1426a51817dd51340cdcc4d8ddb8e7cafe70cbc10a6c759afda0acf404b2d7',
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
