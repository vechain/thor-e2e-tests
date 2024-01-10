import { Transaction, secp256k1, address } from "thor-devkit";
import { NodeKey, Nodes } from "./thor-client";
import {
  GetTxReceiptResponse,
  GetTxResponse,
  TXID,
} from "./open-api-types-padded";
import wallet from "./wallet";
import { interfaces } from "./contracts/hardhat";
import { contractAddresses } from "./contracts/addresses";
import { components } from "./open-api-types";

export const generateNonce = (): number => {
  return Math.floor(Math.random() * 1_000_000_000);
};

export const sendVetTransaction = async <T extends boolean>(
  waitForReceipt: T,
  node?: NodeKey,
): Promise<T extends true ? GetTxReceiptResponse : TXID> => {
  const to = wallet["0x435933c8064b4ae76be665428e0307ef2ccfbd68"];
  const from = wallet["0x61e7d0c2b25706be3485980f39a3a994a8207acf"];

  const clauses = [
    {
      to: to.address,
      value: "0x1",
      data: "0x",
    },
  ];

  return await sendClauses(clauses, from.privateKey, waitForReceipt, node);
};

export const sendVthoTransaction = async <T extends boolean>(
  waitForReceipt: T,
  node?: NodeKey,
): Promise<T extends true ? GetTxReceiptResponse : TXID> => {
  const to = wallet["0x435933c8064b4ae76be665428e0307ef2ccfbd68"];
  const from = wallet["0x61e7d0c2b25706be3485980f39a3a994a8207acf"];

  const clauses = [
    {
      to: contractAddresses.VTHO,
      value: "0x0",
      data: interfaces.VIP180.encodeFunctionData("transfer", [to.address, 1]),
    },
  ];

  return await sendClauses(clauses, from.privateKey, waitForReceipt, node);
};

export const sendClauses = async <T extends boolean>(
  clauses: Transaction.Clause[],
  privateKey: string,
  waitForReceipt: T,
  node?: NodeKey,
): Promise<T extends true ? GetTxReceiptResponse : TXID> => {
  const client = Nodes[node ?? 1];

  await warnIfSimulationFails(clauses, privateKey, node);

  const transaction = await buildTransaction(clauses, node);

  const encoded = signTransaction(transaction, privateKey);

  const res = await client.sendTransaction({
    raw: `0x${encoded}`,
  });

  if (!res.id) {
    throw new Error("Failed to send transaction");
  }

  if (!waitForReceipt) {
    return res as T extends true ? GetTxReceiptResponse : TXID;
  }

  const receipt = await pollReceipt(res.id, node);

  if (!receipt) {
    throw new Error("Failed to get receipt");
  }

  if (receipt.reverted) {
    await warnTxReverted(receipt, node);
  }

  return receipt as T extends true ? GetTxReceiptResponse : TXID;
};

export const buildTransaction = async (
  clauses: Transaction.Clause[],
  node?: NodeKey,
): Promise<Transaction> => {
  const client = Nodes[node ?? 1];

  const bestBlock = await client.getBlock("best");
  const genesisBlock = await client.getBlock("0");

  if (!bestBlock || !genesisBlock) {
    throw new Error("Could not get best block");
  }

  return new Transaction({
    blockRef: bestBlock.id.slice(0, 18),
    expiration: 1000,
    clauses: clauses,
    gasPriceCoef: 0,
    gas: 1_000_000,
    dependsOn: null,
    nonce: generateNonce(),
    chainTag: parseInt(genesisBlock.id.slice(-2), 16),
  });
};

export const signTransaction = (
  transaction: Transaction,
  privateKey: string,
): string => {
  const pk = Buffer.from(privateKey, "hex");

  transaction.signature = secp256k1.sign(transaction.signingHash(), pk);

  return transaction.encode().toString("hex");
};

export const pollReceipt = async (
  txId: string,
  node?: NodeKey,
): Promise<GetTxReceiptResponse> => {
  const client = Nodes[node ?? 1];

  return new Promise<GetTxReceiptResponse>((resolve, reject) => {
    setInterval(async () => {
      const receipt = await client.getTransactionReceipt(txId);

      if (receipt) {
        resolve(receipt);
      }
    }, 1000);

    setTimeout(() => {
      reject("Timed out waiting for transaction to be mined");
    }, 30000);
  });
};

const warnIfSimulationFails = async (
  clauses: Transaction.Clause[],
  privateKey: string,
  node?: NodeKey,
) => {
  const client = Nodes[node ?? 1];

  const pubKey = secp256k1.derivePublicKey(Buffer.from(privateKey, "hex"));
  const caller = address.fromPublicKey(pubKey);

  const _clauses = clauses.map((clause) => {
    let value: string;

    if (typeof clause.value === "number") {
      value = clause.value.toString();
    } else {
      value = clause.value;
    }

    return {
      to: clause.to ?? undefined,
      value: value,
      data: clause.data,
    };
  });

  const simulation = await client.executeAccountBatch({
    clauses: _clauses,
    caller,
  });

  const revertedClause = simulation.find((result) => result.reverted);

  if (revertedClause) {
    console.warn(
      `TX Clause may revert (${revertedClause.vmError})`,
      revertedClause,
    );
  }
};

const warnTxReverted = async (
  receipt: GetTxReceiptResponse,
  nodeKey?: NodeKey,
) => {
  if (!receipt.meta.blockNumber) return;

  const client = Nodes[nodeKey ?? 1];

  const block = await client.getBlock(receipt.meta.blockNumber, true);

  if (!block) return;

  const txIndex = block.transactions.findIndex(
    (tx: components["schemas"]["Tx"]) => tx.id === receipt.meta.txID,
  );
  const clauseIndex = receipt.outputs.length;

  const debugged = await client.traceClause({
    target: `${receipt.meta.blockID}/${txIndex}/${clauseIndex}`,
  });

  console.warn("Transaction Failed", debugged);
};
