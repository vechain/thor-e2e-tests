import { blake2b256 } from '@vechain/sdk-core'
import { Buffer } from 'buffer'
import HexUtils from './hex-utils'

/**
 * 2048 bits Bloom filter
 * impementation from https://github.com/vechain/thor-devkit.js/blob/master/src/bloom.ts
 */
export class LegacyBloom {
    /** number of hash functions */
    static MAX_K = 16
    /** bit length */
    static BITS_LENGTH = 2048

    /**
     * new bloom filter instance
     * @param k number of hash functions
     * @param bits the bloom filter bits
     */
    constructor(k, bits) {
        this.bits = bits
        this.k = k
    }

    /**
     * test if an item contained. (false positive)
     * @param item
     */
    test(item) {
        return this.distribute(item, (index, bit) => {
            return (this.bits[index] & bit) === bit
        })
    }

    distribute(item, cb) {
        const hash = blake2b256(item)
        for (let i = 0; i < this.k; i++) {
            const d =
                (hash[i * 2 + 1] + (hash[i * 2] << 8)) % LegacyBloom.BITS_LENGTH
            const bit = 1 << d % 8
            if (!cb(Math.floor(d / 8), bit)) {
                return false
            }
        }
        return true
    }
}

export const testLegacyBloomForAddress = (bloom, k, address) => {
    bloom = HexUtils.removePrefix(bloom)
    address = HexUtils.removePrefix(address)

    const legacyFilter = new LegacyBloom(k, Buffer.from(bloom, 'hex'))

    return legacyFilter.test(Buffer.from(address, 'hex'))
}
