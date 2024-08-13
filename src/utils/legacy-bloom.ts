import { blake2b256 } from '@vechain/sdk-core'
import { Buffer } from 'buffer'
import HexUtils from './hex-utils'

/**
 * 2048 bits Bloom filter
 * impementation from https://github.com/vechain/thor-devkit.js/blob/master/src/bloom.ts
 */
export class LegacyBloom {
    /** number of hash functions */
    public static readonly MAX_K = 16
    /** bit length */
    public static readonly BITS_LENGTH = 2048

    public readonly bits: Buffer
    public readonly k: number

    /**
     * new bloom filter instance
     * @param k number of hash functions
     * @param bits the bloom filter bits
     */
    constructor(k: number, bits: Buffer) {
        this.bits = bits
        this.k = k
    }

    /**
     * test if an item contained. (false positive)
     * @param item
     */
    public test(item: Buffer) {
        return this.distribute(item, (index, bit) => {
            return (this.bits[index] & bit) === bit
        })
    }

    private distribute(
        item: Buffer,
        cb: (index: number, bit: number) => boolean,
    ): boolean {
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

export const testLegacyBloomForAddress = (
    bloom: string,
    k: number,
    address: string,
) => {
    bloom = HexUtils.removePrefix(bloom)
    address = HexUtils.removePrefix(address)

    const legacyFilter = new LegacyBloom(k, Buffer.from(bloom, 'hex'))

    return legacyFilter.test(Buffer.from(address, 'hex'))
}
