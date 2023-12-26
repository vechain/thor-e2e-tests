import {HDNode, secp256k1} from "thor-devkit"
import {Wallet} from "@vechain/connex-driver/dist/interfaces"

const words = "denial kitchen pet squirrel other broom bar gas better priority spoil cross"

export const DefaultHDNode = HDNode.fromMnemonic(words.split(" "))

const nodes = Array.from({length: 10}, (_, i) => DefaultHDNode.derive(i))

export const wallet: Wallet = {
  list: nodes.map(node => {
    return {
      address: node.address,
      sign(msgHash: Buffer): Promise<Buffer> {

        if (!node.privateKey) throw new Error("node.privateKey is undefined")

        return Promise.resolve(secp256k1.sign(msgHash, node.privateKey))
      }
    }
  })
}
