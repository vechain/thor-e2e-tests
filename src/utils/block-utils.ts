import { Node1Client } from '../thor-client'

export const getBlockRef = async (revision: string) => {
    const block = await Node1Client.getBlock(revision)

    if (!block.success) {
        throw new Error(block.httpMessage)
    }

    if (!block.body || !block.body.id) {
        throw new Error(`Block not found for revision ${revision}`)
    }

    return block.body.id.slice(0, 18)
}
