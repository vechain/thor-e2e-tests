# VechainThor E2E Tests

## Prerequisites

- [Docker](https://docs.docker.com/install/)
- [Yarn](https://yarnpkg.com/en/docs/install)
- [Node.js](https://nodejs.org/en/download/)

## Running the tests

```shell
yarn install
yarn test
```

## Debugging the tests

- These steps are useful if you want to debug

```bash
yarn docker:up
yarn test:fast
```

## Scripts

---

### Generate Open API Specification

- These scripts will output the Open API Spec to `./src/open-api-types.ts`


#### **Option 1** - By local file:

```bash
yarn generate:openapi ./thor.yaml
```

#### **Option 2** - By URL:

```bash
yarn generate:openapi https://darrenvechain.github.io/thor-docs/thor.yaml
```

---

### Test accounts

Tests are executed using a custom private thor blockchain. The genesis of this blockchain is defined in `genesis.json`. This file contains accounts that are created with defined VET/VTHO balance for testing purposes. These accounts are then modelled in `wallet.ts`. To add a new account firstly add it to `genesis.json` and then to `wallet.ts`. 

### Types of tests

- thorest-api --> Tests that validate the swagger contract definition of the Thorest api

