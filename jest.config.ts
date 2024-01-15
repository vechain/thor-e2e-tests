import type {Config} from 'jest';

const config: Config = {
  verbose: true,
  // seconds to be considered slow
  slowTestThreshold: 25,
  reporters: ["default", "jest-junit"],
  // ms to wait before throwing a timeout error
  testTimeout: 35_000,
  json: true,
  outputFile: "results.json",
};

export default config;
