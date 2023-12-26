import { Driver, SimpleNet } from "@vechain/connex-driver"
import { Framework} from "@vechain/connex-framework"
import {wallet} from "./wallet"

const nodeConfig = {
  node1: "http://localhost:8669/",
  node2: "http://localhost:8679/",
  node3: "http://localhost:8689/",
}

type NodeKey = keyof typeof nodeConfig

const driverCache: Record<string, Driver> = {}

const getDriver = async (key: NodeKey): Promise<Driver> => {
  if (driverCache[key]) {
    return driverCache[key]
  }

  const simpleNet = new SimpleNet(nodeConfig[key])
  const driver = await Driver.connect(simpleNet, wallet)
  driverCache[key] = driver
  return driver
}

const frameworkCache: Record<string, Framework> = {}

const getConnex = async (key: NodeKey) => {

  if (frameworkCache[key]) {
    return frameworkCache[key]
  }

  const driver = await getDriver(key)
  const framework =  new Framework(driver)

  frameworkCache[key] = framework

  return framework
}


export {
  getDriver,
  getConnex,
}
