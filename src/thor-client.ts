import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
import { components } from './open-api-types'
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
} from './open-api-types-padded'

import WebSocket from 'ws'

type BaseResponse = {
    httpCode?: number
    httpMessage?: string
}

export type ErrorResponse<T> = BaseResponse & {
    error: AxiosError
    success: false
    body?: Partial<T>
}

export type SuccessResponse<T> = BaseResponse & {
    success: true
    body: T
}

type Response<T> = ErrorResponse<T> | SuccessResponse<T>

class ThorClient {
    private readonly axios
    private readonly baseWsUrl: string

    constructor(public readonly baseUrl: string) {
        this.axios = axios.create({
            baseURL: baseUrl,
            headers: {
                'Content-Type': 'application/json',
            },
        })
        this.baseWsUrl = baseUrl.replace('http', 'ws').replace('https', 'wss')
    }

    public async waitForBlock(): Promise<SubscriptionBlockResponse> {
        return new Promise((resolve, reject) => {
            const ws = this.subscribeToBlocks((data) => {
                ws.unsubscribe()
                resolve(data)
            })

            setTimeout(() => {
                ws.unsubscribe()
                reject(new Error('Timeout waiting for block'))
            }, 15000)
        })
    }

    // GET /accounts/{address}
    public async getAccount(
        address: string,
        revision?: string,
        options?: AxiosRequestConfig,
    ): Promise<Response<GetAccountResponse>> {
        let url: string = `/accounts/${address}`

        if (revision) {
            url = `${url}?revision=${revision}`
        }

        return this.performRequest<GetAccountResponse>(() =>
            this.axios.get(url, options),
        )
    }

    // POST /accounts/{address}
    public async executeAccountBatch(
        request: components['schemas']['ExecuteCodesRequest'],
        revision?: string,
        options?: AxiosRequestConfig,
    ): Promise<Response<ExecuteCodesResponse>> {
        let url: string = `/accounts/*`

        if (revision) {
            url = `${url}?revision=${revision}`
        }

        return this.performRequest<ExecuteCodesResponse>(() =>
            this.axios.post(url, request, options),
        )
    }

    // GET /accounts/{address}/code
    public async getAccountCode(
        address: string,
        revision?: string,
        options?: AxiosRequestConfig,
    ): Promise<Response<GetAccountCodeResponse>> {
        let url: string = `/accounts/${address}/code`

        if (revision) {
            url = `${url}?revision=${revision}`
        }

        return this.performRequest<GetAccountCodeResponse>(() =>
            this.axios.get(url, options),
        )
    }

    // GET /accounts/{address}/storage
    public async getAccountStorage(
        address: string,
        key: string,
        revision?: string,
        options?: AxiosRequestConfig,
    ): Promise<Response<GetStorageResponse>> {
        let url: string = `/accounts/${address}/storage/${key}`

        if (revision) {
            url = `${url}?revision=${revision}`
        }

        return this.performRequest<GetStorageResponse>(() =>
            this.axios.get(url, options),
        )
    }

    // GET /transactions/{id}
    public async getTransaction(
        id: string,
        queryParams?: {
            raw?: boolean
            head?: string
            pending?: boolean
        },
        options?: AxiosRequestConfig,
    ): Promise<Response<GetTxResponse | null>> {
        let url = new URL(`${this.baseUrl}/transactions/${id}`)

        if (queryParams?.raw) {
            url.searchParams.append('raw', queryParams.raw.toString())
        }

        if (queryParams?.head) {
            url.searchParams.append('head', queryParams.head)
        }

        if (queryParams?.pending) {
            url.searchParams.append('pending', queryParams.pending.toString())
        }

        return this.performRequest<GetTxResponse>(() =>
            this.axios.get(url.toString(), options),
        )
    }

    // GET /transactions/{id}/receipt
    public async getTransactionReceipt(
        id: string,
        head?: string,
        options?: AxiosRequestConfig,
    ): Promise<Response<GetTxReceiptResponse | null>> {
        let url: string = `/transactions/${id}/receipt`

        if (head) {
            url = `${url}?head=${head}`
        }

        return this.performRequest<GetTxReceiptResponse>(() =>
            this.axios.get(url, options),
        )
    }

    // POST /transactions
    public async sendTransaction(
        request: components['schemas']['RawTx'],
        options?: AxiosRequestConfig,
    ): Promise<Response<TXID>> {
        return this.performRequest<TXID>(() =>
            this.axios.post(`/transactions`, request, options),
        )
    }

    // GET /blocks
    public async getBlock(
        revision: string | number,
        expanded?: boolean,
        options?: AxiosRequestConfig,
    ): Promise<Response<Block | null>> {
        let url: string = `/blocks/${revision}`

        if (expanded) {
            url = `${url}?expanded=${expanded}`
        }

        return this.performRequest<Block>(() => this.axios.get(url, options))
    }

    // POST /logs/event
    public async queryEventLogs(
        request: components['schemas']['EventLogFilterRequest'],
        options?: AxiosRequestConfig,
    ): Promise<Response<EventLogsResponse>> {
        return this.performRequest(() =>
            this.axios.post(`/logs/event`, request, options),
        )
    }

    // POST /logs/transfer
    public async queryTransferLogs(
        request: components['schemas']['TransferLogFilterRequest'],
        options?: AxiosRequestConfig,
    ): Promise<Response<TransferLogsResponse>> {
        return this.performRequest(() =>
            this.axios.post(`/logs/transfer`, request, options),
        )
    }

    // GET /node/network/peers
    public async getPeers(
        options?: AxiosRequestConfig,
    ): Promise<Response<GetPeersResponse>> {
        return this.performRequest(() =>
            this.axios.get(`/node/network/peers`, options),
        )
    }

    // WS /subscriptions/block
    public subscribeToBlocks(
        callback: (data: SubscriptionBlockResponse) => void,
        pos?: string,
    ): { unsubscribe: () => void } {
        let url: string = `${this.baseWsUrl}/subscriptions/block`

        if (pos) {
            url = `${url}?pos=${pos}`
        }

        const ws = new WebSocket(url)

        ws.onmessage = (event: any) => {
            const data = JSON.parse(event.data)
            callback(data)
        }

        return {
            unsubscribe: () => {
                ws.close()
            },
        }
    }

    // WS /subscriptions/event
    public subscribeToEvents(
        callback: (data: SubscriptionEventResponse) => void,
        queryParameters?: {
            addr?: string
            t0?: string
            t1?: string
            t2?: string
            t3?: string
            pos?: string
        },
    ): { unsubscribe: () => void } {
        let url = new URL(`${this.baseWsUrl}/subscriptions/event`)

        if (queryParameters?.addr) {
            url.searchParams.append('addr', queryParameters.addr)
        }

        if (queryParameters?.t0) {
            url.searchParams.append('t0', queryParameters.t0)
        }

        if (queryParameters?.t1) {
            url.searchParams.append('t1', queryParameters.t1)
        }

        if (queryParameters?.t2) {
            url.searchParams.append('t2', queryParameters.t2)
        }

        if (queryParameters?.t3) {
            url.searchParams.append('t3', queryParameters.t3)
        }

        const ws = new WebSocket(url.toString())

        ws.onmessage = (event: any) => {
            const data = JSON.parse(event.data)
            callback(data)
        }

        return {
            unsubscribe: () => {
                ws.close()
            },
        }
    }

    // WS /subscriptions/transfers
    public subscribeToTransfers(
        queryParameters: {
            pos?: string
            recipient?: string
            sender?: string
            txOrigin?: string
        },
        callback: (data: SubscriptionTransferResponse) => void,
    ): { unsubscribe: () => void } {
        let url = new URL(`${this.baseWsUrl}/subscriptions/transfer`)

        if (queryParameters.pos) {
            url.searchParams.append('pos', queryParameters.pos)
        }

        if (queryParameters.recipient) {
            url.searchParams.append('recipient', queryParameters.recipient)
        }

        if (queryParameters.sender) {
            url.searchParams.append('sender', queryParameters.sender)
        }

        if (queryParameters.txOrigin) {
            url.searchParams.append('txOrigin', queryParameters.txOrigin)
        }

        const ws = new WebSocket(url.toString())

        ws.onmessage = (event: any) => {
            const data = JSON.parse(event.data)
            callback(data)
        }

        return {
            unsubscribe: () => {
                ws.close()
            },
        }
    }

    // WS /subscriptions/beats
    public subscribeToBeats(
        callback: (data: SubscriptionBeatResponse) => void,
        pos?: string,
    ): { unsubscribe: () => void } {
        let url: string = `${this.baseWsUrl}/subscriptions/beats`

        if (pos) {
            url = `${url}?pos=${pos}`
        }

        const ws = new WebSocket(url)

        ws.onmessage = (event: any) => {
            const data = JSON.parse(event.data)
            callback(data)
        }

        return {
            unsubscribe: () => {
                ws.close()
            },
        }
    }

    // WS /subscriptions/txpool
    public subscribeToTxPool(callback: (txId: { id: string }) => void): {
        unsubscribe: () => void
    } {
        const ws = new WebSocket(`${this.baseWsUrl}/subscriptions/txpool`)

        ws.onmessage = (event: any) => {
            const data = JSON.parse(event.data)
            callback(data)
        }

        return {
            unsubscribe: () => {
                ws.close()
            },
        }
    }

    // WS /subscriptions/beat2
    public subscribeToBeats2(
        callback: (data: SubscriptionBeat2Response) => void,
        pos?: string,
    ): { unsubscribe: () => void } {
        let url: string = `${this.baseWsUrl}/subscriptions/beat2`

        if (pos) {
            url = `${url}?pos=${pos}`
        }

        const ws = new WebSocket(url)

        ws.onmessage = (event: any) => {
            const data = JSON.parse(event.data)
            callback(data)
        }

        return {
            unsubscribe: () => {
                ws.close()
            },
        }
    }

    // POST /debug/tracers
    public async traceClause(
        request: components['schemas']['PostDebugTracerRequest'],
        options?: AxiosRequestConfig,
    ): Promise<Response<any>> {
        return this.performRequest(() =>
            this.axios.post(`/debug/tracers`, request, options),
        )
    }

    // POST /debug/tracers/call
    public async traceContractCall(
        request: components['schemas']['PostDebugTracerCallRequest'],
        options?: AxiosRequestConfig,
    ): Promise<Response<unknown>> {
        return this.performRequest(() =>
            this.axios.post(`/debug/tracers/call`, request, options),
        )
    }

    // POST /debug/storage-range
    public async retrieveStorageRange(
        request: components['schemas']['StorageRangeOption'],
        options?: AxiosRequestConfig,
    ): Promise<Response<StorageRange>> {
        return this.performRequest(() =>
            this.axios.post(`/debug/storage-range`, request, options),
        )
    }

    private initBlockSubscription() {
        this.subscribeToBlocks((data: SubscriptionBlockResponse) => {})
    }

    private async performRequest<T>(
        request: () => Promise<AxiosResponse<T>>,
    ): Promise<Response<T>> {
        try {
            const res = await request()
            return { body: res.data, success: true, httpCode: res.status }
        } catch (e) {
            const a = e as AxiosError
            return {
                error: a,
                success: false,
                httpMessage:
                    typeof a.response?.data === 'string'
                        ? a.response?.data
                        : JSON.stringify(a.response?.data),
                httpCode: a.response?.status,
            }
        }
    }
}

const Node1Client = new ThorClient('http://localhost:8669')
const Node2Client = new ThorClient('http://localhost:8679')
const Node3Client = new ThorClient('http://localhost:8689')

const Nodes = {
    1: Node1Client,
    2: Node2Client,
    3: Node3Client,
}

type NodeKey = keyof typeof Nodes

export { Node1Client, Node2Client, Node3Client, Nodes, NodeKey }
