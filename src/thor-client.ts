import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { components } from "./open-api-types";
import {
  Block,
  EventLogsResponse,
  ExecuteCodesResponse,
  GetAccountCodeResponse,
  GetAccountResponse,
  GetPeersResponse,
  GetStorageResponse,
  GetTxReceiptResponse,
  GetTxResponse,
  StorageRange,
  SubscriptionBeat2Response,
  SubscriptionBeatResponse,
  SubscriptionBlockResponse,
  SubscriptionEventResponse,
  SubscriptionTransferResponse,
  TransferLogsResponse,
  TXID,
} from "./open-api-types-padded";

import WebSocket from "ws";

class ThorClient {
  constructor(public readonly baseUrl: string) {}

  // GET /accounts/{address}
  public async getAccount(
    address: string,
    revision?: string,
    options?: AxiosRequestConfig,
  ): Promise<GetAccountResponse> {
    let url: string = `${this.baseUrl}/accounts/${address}`;

    if (revision) {
      url = `${url}?revision=${revision}`;
    }

    const res = await axios.get(url, options);
    return res.data;
  }

  // POST /accounts/{address}
  public async executeAccountBatch(
    request: components["schemas"]["ExecuteCodesRequest"],
    revision?: string,
    options?: AxiosRequestConfig,
  ): Promise<ExecuteCodesResponse> {
    let url: string = `${this.baseUrl}/accounts/*`;

    if (revision) {
      url = `${url}?revision=${revision}`;
    }

    let res = await axios.post(url, request, options);

    return res.data;
  }

  // GET /accounts/{address}/code
  public async getAccountCode(
    address: string,
    revision?: string,
    options?: AxiosRequestConfig,
  ): Promise<GetAccountCodeResponse> {
    let url: string = `${this.baseUrl}/accounts/${address}/code`;

    if (revision) {
      url = `${url}?revision=${revision}`;
    }

    const res = await axios.get(url, options);
    return res.data;
  }

  // GET /accounts/{address}/storage
  public async getAccountStorage(
    address: string,
    key: string,
    revision?: string,
    options?: AxiosRequestConfig,
  ): Promise<GetStorageResponse> {
    let url: string = `${this.baseUrl}/accounts/${address}/storage/${key}`;

    if (revision) {
      url = `${url}?revision=${revision}`;
    }

    const res = await axios.get(url, options);

    return res.data;
  }

  // GET /transactions/{id}
  public async getTransaction(
    id: string,
    queryParams?: {
      raw?: boolean;
      head?: string;
      pending?: boolean;
    },
    options?: AxiosRequestConfig,
  ): Promise<GetTxResponse | null> {
    let url: string = `${this.baseUrl}/transactions/${id}`;

    if (!!queryParams?.raw) {
      url = `${url}?raw=${queryParams.raw}`;
    }

    if (!!queryParams?.head) {
      url = `${url}?head=${queryParams.head}`;
    }

    if (!!queryParams?.pending) {
      url = `${url}?pending=${queryParams.pending}`;
    }

    const res = await axios.get(url, options);

    return res.data;
  }

  // GET /transactions/{id}/receipt
  public async getTransactionReceipt(
    id: string,
    head?: string,
    options?: AxiosRequestConfig,
  ): Promise<GetTxReceiptResponse | null> {
    let url: string = `${this.baseUrl}/transactions/${id}/receipt`;

    if (head) {
      url = `${url}?head=${head}`;
    }

    const res = await axios.get(url, options);

    return res.data;
  }

  // POST /transactions
  public async sendTransaction(
    request: components["schemas"]["RawTx"],
    options?: AxiosRequestConfig,
  ): Promise<TXID> {
    try {
      const res = await axios.post(
        `${this.baseUrl}/transactions`,
        request,
        options,
      );

      return res.data;
    } catch (e) {
      if (e instanceof AxiosError) {
        console.error(
          `Failed to send transaction (${e.response?.status}): ${e.response?.data?.error}`,
          e.response?.data,
        );
      }
      throw e;
    }
  }

  // GET /blocks
  public async getBlock(
    revision: string | number,
    expanded?: boolean,
    options?: AxiosRequestConfig,
  ): Promise<Block | null> {
    let url: string = `${this.baseUrl}/blocks/${revision}`;

    if (expanded) {
      url = `${url}?expanded=${expanded}`;
    }

    const res = await axios.get(url, options);

    return res.data;
  }

  // POST /logs/event
  public async queryEventLogs(
    request: components["schemas"]["EventLogFilterRequest"],
    options?: AxiosRequestConfig,
  ): Promise<EventLogsResponse> {
    try {
      const res = await axios.post(
        `${this.baseUrl}/logs/event`,
        request,
        options,
      );

      return res.data;
    } catch (e) {
      if (e instanceof AxiosError) {
        console.error(
          `Failed to query event logs (${e.response?.status}): ${e.response?.data?.error}`,
          e.response?.data,
        );
      }
      throw e;
    }
  }

  // POST /logs/transfer
  public async queryTransferLogs(
    request: components["schemas"]["TransferLogFilterRequest"],
    options?: AxiosRequestConfig,
  ): Promise<TransferLogsResponse> {
    try {
      const res = await axios.post(
        `${this.baseUrl}/logs/transfer`,
        request,
        options,
      );

      return res.data;
    } catch (e) {
      if (e instanceof AxiosError) {
        console.error(
          `Failed to query transfer logs (${e.response?.status}): ${e.response?.data?.error}`,
          e.response?.data,
        );
      }
      throw e;
    }
  }

  // GET /node/network/peers
  public async getPeers(
    options?: AxiosRequestConfig,
  ): Promise<GetPeersResponse> {
    const res = await axios.get(`${this.baseUrl}/node/network/peers`, options);

    return res.data;
  }

  // WS /subscriptions/block
  public subscribeToBlocks(
    callback: (data: SubscriptionBlockResponse) => void,
    pos?: string,
  ): { unsubscribe: () => void } {
    let url: string = `${this.baseUrl}/subscriptions/block`;

    if (pos) {
      url = `${url}?pos=${pos}`;
    }

    const ws = new WebSocket(url);

    ws.onmessage = (event: any) => {
      const data = JSON.parse(event.data);
      callback(data);
    };

    return {
      unsubscribe: () => {
        ws.close();
      },
    };
  }

  // WS /subscriptions/event
  public subscribeToEvents(
    callback: (data: SubscriptionEventResponse) => void,
    queryParameters?: {
      addr?: string;
      t0?: string;
      t1?: string;
      t2?: string;
      t3?: string;
      pos?: string;
    },
  ): { unsubscribe: () => void } {
    let url: string = `${this.baseUrl}/subscriptions/event`;

    if (queryParameters?.addr) {
      url = `${url}?addr=${queryParameters.addr}`;
    }

    if (queryParameters?.t0) {
      url = `${url}?t0=${queryParameters.t0}`;
    }

    if (queryParameters?.t1) {
      url = `${url}?t1=${queryParameters.t1}`;
    }

    if (queryParameters?.t2) {
      url = `${url}?t2=${queryParameters.t2}`;
    }

    if (queryParameters?.t3) {
      url = `${url}?t3=${queryParameters.t3}`;
    }

    const ws = new WebSocket(url);

    ws.onmessage = (event: any) => {
      const data = JSON.parse(event.data);
      callback(data);
    };

    return {
      unsubscribe: () => {
        ws.close();
      },
    };
  }

  // WS /subscriptions/transfers
  public subscribeToTransfers(
    queryParameters: {
      pos?: string;
      recipient?: string;
      sender?: string;
      txOrigin?: string;
    },
    callback: (data: SubscriptionTransferResponse) => void,
  ): { unsubscribe: () => void } {
    let url: string = `${this.baseUrl}/subscriptions/transfers`;

    if (queryParameters.pos) {
      url = `${url}?pos=${queryParameters.pos}`;
    }

    if (queryParameters.recipient) {
      url = `${url}?recipient=${queryParameters.recipient}`;
    }

    if (queryParameters.sender) {
      url = `${url}?sender=${queryParameters.sender}`;
    }

    if (queryParameters.txOrigin) {
      url = `${url}?txOrigin=${queryParameters.txOrigin}`;
    }

    const ws = new WebSocket(url);

    ws.onmessage = (event: any) => {
      const data = JSON.parse(event.data);
      callback(data);
    };

    return {
      unsubscribe: () => {
        ws.close();
      },
    };
  }

  // WS /subscriptions/beats
  public subscribeToBeats(
    callback: (data: SubscriptionBeatResponse) => void,
    pos?: string,
  ): { unsubscribe: () => void } {
    let url: string = `${this.baseUrl}/subscriptions/beats`;

    if (pos) {
      url = `${url}?pos=${pos}`;
    }

    const ws = new WebSocket(url);

    ws.onmessage = (event: any) => {
      const data = JSON.parse(event.data);
      callback(data);
    };

    return {
      unsubscribe: () => {
        ws.close();
      },
    };
  }

  // WS /subscriptions/txpool
  public subscribeToTxPool(callback: (txId: string) => void): {
    unsubscribe: () => void;
  } {
    const ws = new WebSocket(`${this.baseUrl}/subscriptions/txpool`);

    ws.onmessage = (event: any) => {
      const data = JSON.parse(event.data);
      callback(data);
    };

    return {
      unsubscribe: () => {
        ws.close();
      },
    };
  }

  // WS /subscriptions/beat2
  public subscribeToBeats2(
    callback: (data: SubscriptionBeat2Response) => void,
    pos?: string,
  ): { unsubscribe: () => void } {
    let url: string = `${this.baseUrl}/subscriptions/beat2`;

    if (pos) {
      url = `${url}?pos=${pos}`;
    }

    const ws = new WebSocket(url);

    ws.onmessage = (event: any) => {
      const data = JSON.parse(event.data);
      callback(data);
    };

    return {
      unsubscribe: () => {
        ws.close();
      },
    };
  }

  // POST /debug/tracers
  public async traceClause(
    request: components["schemas"]["PostDebugTracerRequest"],
    options?: AxiosRequestConfig,
  ): Promise<any> {
    const res = await axios.post(
      `${this.baseUrl}/debug/tracers`,
      request,
      options,
    );

    return res.data;
  }

  // POST /debug/tracers/call
  public async traceContractCall(
    request: components["schemas"]["PostDebugTracerCallRequest"],
    options?: AxiosRequestConfig,
  ): Promise<any> {
    const res = await axios.post(
      `${this.baseUrl}/debug/tracers/call`,
      request,
      options,
    );

    return res.data;
  }

  // POST /debug/storage-range
  public async retrieveStorageRange(
    request: components["schemas"]["StorageRangeOption"],
    options?: AxiosRequestConfig,
  ): Promise<StorageRange> {
    const res = await axios.post(
      `${this.baseUrl}/debug/storage-range`,
      request,
      options,
    );

    return res.data;
  }
}

const Node1Client = new ThorClient("http://localhost:8669");
const Node2Client = new ThorClient("http://localhost:8679");
const Node3Client = new ThorClient("http://localhost:8689");

const Nodes = {
  1: Node1Client,
  2: Node2Client,
  3: Node3Client,
};

type NodeKey = keyof typeof Nodes;

export { Node1Client, Node2Client, Node3Client, Nodes, NodeKey };
