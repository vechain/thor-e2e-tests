import { components } from "./open-api-types";

type Schemas = components["schemas"];

// Accounts
export type GetAccountResponse = Required<Schemas["GetAccountResponse"]>;
export type ExecuteCodesResponse = Required<Schemas["ExecuteCodesResponse"]>;
export type GetAccountCodeResponse = Required<
  Schemas["GetAccountCodeResponse"]
>;
export type GetStorageResponse = Required<Schemas["GetStorageResponse"]>;

// Transactions
export type GetTxResponse = Required<Schemas["GetTxResponse"]>;
export type GetTxReceiptResponse = Required<Schemas["GetTxReceiptResponse"]>;
export type TXID = Required<Schemas["TXID"]>;

// Blocks
export type Block = Required<Schemas["GetBlockResponse"]>;

// Logs
export type EventLogsResponse = Required<Schemas["EventLogsResponse"]>;
export type TransferLogsResponse = Required<Schemas["TransferLogsResponse"]>;

// Peers
export type GetPeersResponse = Required<Schemas["GetPeersResponse"]>;

// Subscriptions
export type SubscriptionBlockResponse = Required<
  Schemas["SubscriptionBlockResponse"]
>;
export type SubscriptionEventResponse = Required<
  Schemas["SubscriptionEventResponse"]
>;
export type SubscriptionTransferResponse = Required<
  Schemas["SubscriptionTransferResponse"]
>;
export type SubscriptionBeatResponse = Required<
  Schemas["SubscriptionBeatResponse"]
>;
export type SubscriptionBeat2Response = Required<
  Schemas["SubscriptionBeat2Response"]
>;

// Debug
export type StorageRange = Required<Schemas["StorageRange"]>;
