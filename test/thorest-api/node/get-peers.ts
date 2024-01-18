import { Node1Client } from '../../../src/thor-client'

describe('GET /node/network/peers', () => {
    it('should get peers', async () => {
        const peers = await Node1Client.getPeers()
        expect(peers.success).toEqual(true)
    })
})
