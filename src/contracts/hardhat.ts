import hre from "hardhat";
import { VIP180__factory } from "../../typechain-types";
import { contractAddresses } from "./addresses";
import { VIP180Interface } from "../../typechain-types/VIP180";

export const contracts = {
  VTHO: VIP180__factory.connect(contractAddresses.VTHO),
};

export const interfaces = {
  VIP180: contracts.VTHO.interface,
};
