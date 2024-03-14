const validRevisions = [
    'best',
    '1',
    '0x00000000c05a20fbca2bf6ae3affba6af4a74b800b585bf7a4988aba7aea69f6',
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

export const revisions = {
    valid(finalized = false) {
        return validRevisions.concat(finalized ? ['finalized'] : [])
    },
    validNotFound: validRevisionsNotFound,
    invalid: invalidRevisions,
}

const faucetMnemonic =
    'denial kitchen pet squirrel other broom bar gas better priority spoil cross'.split(
        ' ',
    )

const faucetAccountLength = 10

export { faucetMnemonic, faucetAccountLength }
