import { Node1Client } from '../../../src/thor-client'
import { HEX_REGEX, HEX_REGEX_64 } from '../../../src/utils/hex-utils'

describe('GET /node/network/peers', () => {
    it('should get peers', async () => {
        const peers = await Node1Client.getPeers()
        expect(peers.success).toEqual(true)
        expect(peers.body?.length).toEqual(2)

        for (const peer of peers.body!) {
            expect(peer).toEqual({
                name: expect.any(String),
                bestBlockID: expect.stringMatching(HEX_REGEX_64),
                totalScore: expect.any(Number),
                peerID: expect.stringMatching(HEX_REGEX),
                netAddr: expect.stringMatching(/(\d{1,3}\.){3}\d{1,3}:\d{1,5}/),
                inbound: expect.any(Boolean),
                duration: expect.any(Number),
            })
        }
    })
})
