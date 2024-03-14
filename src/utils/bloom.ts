import { blake2b256 } from '@vechain/sdk-core'
import HexUtils from './hex-utils'

export function newFilter(bits: Buffer, k: number) {
    const nBits = bits.length * 8
    return {
        contains(key: Buffer) {
            let hash = blake2b256(key).readUInt32BE(0)
            const delta = (hash >>> 17) | ((hash << 15) >>> 0)
            for (let i = 0; i < k; i++) {
                const bitPos = hash % nBits
                const index = bitPos >>> 3
                const bit = 1 << bitPos % 8
                if (!(bits[index] & bit)) {
                    return false
                }
                hash = (hash + delta) >>> 0
            }
            return true
        },
    }
}

export const testBloomForAddress = (
    bloom: string,
    k: number,
    address: string,
) => {
    bloom = HexUtils.removePrefix(bloom)
    address = HexUtils.removePrefix(address)

    const bloomFilter = newFilter(Buffer.from(bloom, 'hex'), k)

    return testBytesHex(bloomFilter, address)
}

/**
 * Below function lifted from @vechain/connex-driver
 *    https://github.com/vechain/connex/blob/master/packages/driver/src/cache.ts#L239
 */
const testBytesHex = (filter: ReturnType<typeof newFilter>, hex: string) => {
    let buf = Buffer.from(hex, 'hex')
    const nzIndex = buf.findIndex((v) => v !== 0)
    if (nzIndex < 0) {
        buf = Buffer.alloc(0)
    } else {
        buf = buf.subarray(nzIndex)
    }
    return filter.contains(buf)
}
