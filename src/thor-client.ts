import axios, {AxiosError, AxiosRequestConfig, AxiosResponse} from "axios";
import {components} from "./open-api-types";
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
  TXID
} from "./open-api-types-padded";

import WebSocket from "ws";

type BaseResponse = {
  httpCode?: number;
  httpMessage?: string;
}

export type ErrorResponse<T>  =  BaseResponse & {
  error: AxiosError;
  success: false;
  body?: Partial<T>
}

export type SuccessResponse<T> = BaseResponse & {
  success: true;
  body: T
}

type Response<T> = ErrorResponse<T> | SuccessResponse<T>;

class ThorClient {
  constructor(public readonly baseUrl: string) {}

  private async performRequest<T>(
    request: () => Promise<AxiosResponse<T>>
  ): Promise<Response<T>> {
    try {
      const res = await request()
      return {body: res.data, success: true, httpCode: res.status}
    } catch (e) {
      const a = e as AxiosError
      return {error: a, success: false, httpMessage: a.message, httpCode: a.response?.status}
    }
  }

  // GET /accounts/{address}
  public async getAccount(
    address: string,
    revision?: string,
    options?: AxiosRequestConfig,
  ): Promise<Response<GetAccountResponse>> {
    let url: string = `${this.baseUrl}/accounts/${address}`;

    if (revision) {
      url = `${url}?revision=${revision}`;
    }

    return this.performRequest<GetAccountResponse>(() => axios.get(url, options))
  }

  // POST /accounts/{address}
  public async executeAccountBatch(
    request: components["schemas"]["ExecuteCodesRequest"],
    revision?: string,
    options?: AxiosRequestConfig,
  ): Promise<Response<ExecuteCodesResponse>> {
    let url: string = `${this.baseUrl}/accounts/*`;

    if (revision) {
      url = `${url}?revision=${revision}`;
    }

    return this.performRequest<ExecuteCodesResponse>(() => axios.post(url, request, options))
  }

  // GET /accounts/{address}/code
  public async getAccountCode(
    address: string,
    revision?: string,
    options?: AxiosRequestConfig,
  ): Promise<Response<GetAccountCodeResponse>> {
    let url: string = `${this.baseUrl}/accounts/${address}/code`;

    if (revision) {
      url = `${url}?revision=${revision}`;
    }

    return this.performRequest<GetAccountCodeResponse>(() => axios.get(url, options))
  }

  // GET /accounts/{address}/storage
  public async getAccountStorage(
    address: string,
    key: string,
    revision?: string,
    options?: AxiosRequestConfig,
  ): Promise<Response<GetStorageResponse>> {
    let url: string = `${this.baseUrl}/accounts/${address}/storage/${key}`;

    if (revision) {
      url = `${url}?revision=${revision}`;
    }

    return this.performRequest<GetStorageResponse>(() => axios.get(url, options))
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
  ): Promise<Response<GetTxResponse | null>> {
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

    return this.performRequest<GetTxResponse>(() => axios.get(url, options))
  }

  // GET /transactions/{id}/receipt
  public async getTransactionReceipt(
    id: string,
    head?: string,
    options?: AxiosRequestConfig,
  ): Promise<Response<GetTxReceiptResponse | null>> {
    let url: string = `${this.baseUrl}/transactions/${id}/receipt`;

    if (head) {
      url = `${url}?head=${head}`;
    }

    return this.performRequest<GetTxReceiptResponse>(() => axios.get(url, options))
  }

  // POST /transactions
  public async sendTransaction(
    request: components["schemas"]["RawTx"],
    options?: AxiosRequestConfig,
  ): Promise<Response<TXID>> {
    return this.performRequest<TXID>(() => axios.post(`${this.baseUrl}/transactions`, request, options))
  }

  // GET /blocks
  public async getBlock(
    revision: string | number,
    expanded?: boolean,
    options?: AxiosRequestConfig,
  ): Promise<Response<Block | null>> {
    let url: string = `${this.baseUrl}/blocks/${revision}`;

    if (expanded) {
      url = `${url}?expanded=${expanded}`;
    }

    return this.performRequest<Block>(() => axios.get(url, options))
  }

  // POST /logs/event
  public async queryEventLogs(
    request: components["schemas"]["EventLogFilterRequest"],
    options?: AxiosRequestConfig,
  ): Promise<Response<EventLogsResponse>> {
    return this.performRequest(() => axios.post(
      `${this.baseUrl}/logs/event`,
      request,
      options,
    ))
  }

  // POST /logs/transfer
  public async queryTransferLogs(
    request: components["schemas"]["TransferLogFilterRequest"],
    options?: AxiosRequestConfig,
  ): Promise<Response<TransferLogsResponse>> {
    return this.performRequest(() => axios.post(
      `${this.baseUrl}/logs/transfer`,
      request,
      options,
    ))
  }

  // GET /node/network/peers
  public async getPeers(
    options?: AxiosRequestConfig,
  ): Promise<Response<GetPeersResponse>> {
    return this.performRequest(() => axios.get(
      `${this.baseUrl}/node/network/peers`,
      options,
    ))
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
  ): Promise<Response<any>> {
    return this.performRequest(() => axios.post(
      `${this.baseUrl}/debug/tracers`,
      request,
      options,
    ))
  }

  // POST /debug/tracers/call
  public async traceContractCall(
    request: components["schemas"]["PostDebugTracerCallRequest"],
    options?: AxiosRequestConfig,
  ): Promise<Response<any>> {
    return this.performRequest(() => axios.post(
      `${this.baseUrl}/debug/tracers/call`,
      request,
      options,
    ))
  }

  // POST /debug/storage-range
  public async retrieveStorageRange(
    request: components["schemas"]["StorageRangeOption"],
    options?: AxiosRequestConfig,
  ): Promise<Response<StorageRange>> {
    return this.performRequest(() => axios.post(
      `${this.baseUrl}/debug/storage-range`,
      request,
      options,
    ))
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
