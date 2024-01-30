import { HDNode } from 'thor-devkit'

type AccountFaucet = {
    address: string
    privateKey: string
}
const faucetMnemonic =
    'denial kitchen pet squirrel other broom bar gas better priority spoil cross'.split(
        ' ',
    )

const faucetAccounts: AccountFaucet[] = []

const validRevisions = [
    'best',
    '1',
    '0x00000000920b473fff58c0de5a23ea2e7c17d1c52b132821e7f035c3295938c6',
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

const revisions = {
    valid(finalized = false) {
        return validRevisions.concat(finalized ? ['finalized'] : [])
    },
    validNotFound: validRevisionsNotFound,
    invalid: invalidRevisions,
}

export { faucetAccounts, revisions, faucetMnemonic }

const hdNode = HDNode.fromMnemonic(faucetMnemonic)

for (let i = 0; i < 1000; i++) {
    const node = hdNode.derive(i)
    faucetAccounts.push({
        address: node.address,
        privateKey: node.privateKey!.toString('hex'),
    })
}
