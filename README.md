# VechainThor E2E Tests

### Prerequisites

-   [Docker](https://docs.docker.com/install/)
-   [Yarn](https://yarnpkg.com/en/docs/install)
-   [Node.js](https://nodejs.org/en/download/)

### Running the tests

```shell
yarn install
yarn test
```

### Debugging the tests

-   These steps are useful if you want to debug

```bash
yarn docker:up
yarn test:fast
```

### Custom Docker Image

-   You can specify a custom docker image by running the following in the [vechain/thor](https://github.com/vechain/thor)
    repo:

```bash
docker build -t vechain/thor:custom .
export THOR_IMAGE=vechain/thor:custom
yarn test
```

### Running a group of tests
```bash
yarn test --group=accounts
```

### Custom solo url
```
TEST_URL=http://localhost:8669
```
This is added to be able to configure the url of the client for future network hub integration. 
We need to keep same genesis for now.

## Scripts

---

### Generate Open API Specification

-   These scripts will output the Open API Spec to `./src/open-api-types.ts`

#### **Option 1** - By local file:

```bash
yarn generate:openapi ./thor.yaml
```

#### **Option 2** - By URL:

```bash
yarn generate:openapi https://raw.githubusercontent.com/vechain/thor/master/api/doc/thor.yaml
```

---

### Test accounts

Tests are executed using a custom private thor blockchain. The genesis of this blockchain is defined in `genesis.json`.
This file contains accounts that are created with defined VET/VTHO balance for testing purposes. These accounts are used
as a faucet. Please refer to:

-   `./src/wallet.ts` to generate new accounts/ private keys
-   `./src/account-faucet.ts` to fund your accounts with VET/VTHO

### Types of tests

-   thorest-api --> Tests that validate the swagger contract definition of the Thorest api
