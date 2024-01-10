# VechainThor Integration Tests

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

### Generate test accounts

- This command will add 5 new accounts to the genesis with balances, and add the details to `./src/wallet.ts` so you can
  easily access their addresses and private keys.

```bash
yarn generate:accounts
```
