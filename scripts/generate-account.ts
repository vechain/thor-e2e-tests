/**
 * This script will generate 5 new accounts and add them to the genesis file, setup with balances.
 */
import path from "path";
import fs from "fs";
import { HDNode } from "thor-devkit";
import wallets from "../src/wallet";

const soloMnemonic =
  "denial kitchen pet squirrel other broom bar gas better priority spoil cross".split(
    " ",
  );
export const hdNode = HDNode.fromMnemonic(soloMnemonic);

const genesisPath = path.join(
  __dirname,
  "..",
  "network",
  "config",
  "genesis.json",
);

const accountExists = (accounts: any[], address: string) => {
  return accounts.some(
    (account: any) => account.address.toLowerCase() === address.toLowerCase(),
  );
};

const readGenesis = () => {
  return JSON.parse(fs.readFileSync(genesisPath, "utf8"));
};

const writeGenesis = (genesis: any) => {
  fs.writeFileSync(genesisPath, JSON.stringify(genesis, null, 2));
};

const writeWallets = (newWallets: any[]) => {
  for (const wallet of newWallets) {
    // @ts-ignore
    wallets[wallet.address] = {
      privateKey: wallet["privateKey"],
      address: wallet["address"],
      comment: "TODO",
    };
  }

  fs.writeFileSync(
    path.join(__dirname, "..", "src", "wallet.ts"),
    `export default ${JSON.stringify(wallets, null, 2)}`,
  );
};

const main = async () => {
  const genesis = readGenesis();

  let startingAccounts = genesis.accounts.length;
  let index = 0;
  let wallets = [];

  while (genesis.accounts.length < startingAccounts + 5) {
    index++;

    const nextAccount = hdNode.derive(index);

    if (
      accountExists(genesis.accounts, nextAccount.address) ||
      !nextAccount.privateKey
    ) {
      continue;
    }

    genesis.accounts.push({
      address: nextAccount.address,
      balance: "0x14ADF4B7320334B9000000",
      energy: "0x14ADF4B7320334B9000000",
    });

    wallets.push({
      address: nextAccount.address,
      privateKey: nextAccount.privateKey?.toString("hex"),
    });

    console.log(
      JSON.stringify(
        {
          address: nextAccount.address,
          privateKey: nextAccount.privateKey?.toString("hex"),
        },
        null,
        2,
      ),
    );
  }

  writeWallets(wallets);
  writeGenesis(genesis);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
