import 'dotenv/config'
import { testEnv } from './test-env'
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
import { components } from './open-api-types'

import WebSocket from 'ws'
import { HttpClient, ThorClient as _ThorClient } from '@vechain/sdk-network'
import { decodeRevertReason } from './utils/revert-utils'

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

export type Response<T> = ErrorResponse<T> | SuccessResponse<T>

export type Schema = components['schemas']

class ThorClient {
    private readonly axios
    private readonly baseWsUrl: string
    private readonly subscriptions: (() => void)[] = []

    constructor(public readonly baseUrl: string) {
        this.axios = axios.create({
            baseURL: baseUrl,
            headers: {
                'Content-Type': 'application/json',
            },
        })
        this.baseWsUrl = baseUrl.replace('http', 'ws').replace('https', 'wss')
    }

    public closeAllSubscriptions() {
        this.subscriptions.forEach((s) => s())
    }

    public async waitForBlock(): Promise<Schema['SubscriptionBlockResponse']> {
        return new Promise((resolve, reject) => {
            const ws = this.subscribeToBlocks((data) => {
                ws.unsubscribe()
                resolve(data)
            })

            const timeoutId = setTimeout(() => {
                ws.unsubscribe()
                reject(new Error('Timeout waiting for block'))
            }, 15000)

            // Clear the timeout when the promise is settled
            Promise.race([ws, timeoutId]).finally(() => {
                clearTimeout(timeoutId)
            })
        })
    }

    private openWebsocket<T>(url: string, callback: (data: T) => void) {
        const ws = new WebSocket(url)
        ws.onmessage = (event: any) => {
            const data = JSON.parse(event.data)
            callback(data)
        }

        this.subscriptions.push(() => ws.close())

        return {
            unsubscribe: () => {
                ws.close()
            },
        }
    }

    // GET /accounts/{address}
    public async getAccount(
        address: string,
        revision?: string,
        options?: AxiosRequestConfig,
    ): Promise<Response<Schema['GetAccountResponse']>> {
        let url: string = `/accounts/${address}`

        if (revision) {
            url = `${url}?revision=${revision}`
        }

        return this.performRequest<Schema['GetAccountResponse']>(() =>
            this.axios.get(url, options),
        )
    }

    // POST /accounts/{address}
    public async executeAccountBatch(
        request: components['schemas']['ExecuteCodesRequest'],
        revision?: string,
        options?: AxiosRequestConfig,
    ): Promise<Response<Schema['ExecuteCodesResponse']>> {
        let url: string = `/accounts/*`

        if (revision) {
            url = `${url}?revision=${revision}`
        }

        return this.performRequest<Schema['ExecuteCodesResponse']>(() =>
            this.axios.post(url, request, options),
        )
    }

    // GET /accounts/{address}/code
    public async getAccountCode(
        address: string,
        revision?: string,
        options?: AxiosRequestConfig,
    ): Promise<Response<Schema['GetAccountCodeResponse']>> {
        let url: string = `/accounts/${address}/code`

        if (revision) {
            url = `${url}?revision=${revision}`
        }

        return this.performRequest<Schema['GetAccountCodeResponse']>(() =>
            this.axios.get(url, options),
        )
    }

    // GET /accounts/{address}/storage
    public async getAccountStorage(
        address: string,
        key: string,
        revision?: string,
        options?: AxiosRequestConfig,
    ): Promise<Response<Schema['GetStorageResponse']>> {
        let url: string = `/accounts/${address}/storage/${key}`

        if (revision) {
            url = `${url}?revision=${revision}`
        }

        return this.performRequest<Schema['GetStorageResponse']>(() =>
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
    ): Promise<Response<Schema['GetTxResponse'] | null>> {
        const url = new URL(`${this.baseUrl}/transactions/${id}`)

        if (queryParams?.raw) {
            url.searchParams.append('raw', queryParams.raw.toString())
        }

        if (queryParams?.head) {
            url.searchParams.append('head', queryParams.head)
        }

        if (queryParams?.pending) {
            url.searchParams.append('pending', queryParams.pending.toString())
        }

        return this.performRequest<Schema['GetTxResponse'] | null>(() =>
            this.axios.get(url.toString(), options),
        )
    }

    // GET /transactions/{id}/receipt
    public async getTransactionReceipt(
        id: string,
        head?: string,
        options?: AxiosRequestConfig,
    ): Promise<Response<Schema['GetTxReceiptResponse'] | null>> {
        let url: string = `/transactions/${id}/receipt`

        if (head) {
            url = `${url}?head=${head}`
        }

        return this.performRequest<Schema['GetTxReceiptResponse']>(() =>
            this.axios.get(url, options),
        )
    }

    // POST /transactions
    public async sendTransaction(
        request: components['schemas']['RawTx'],
        options?: AxiosRequestConfig,
    ): Promise<Response<Schema['TXID']>> {
        return this.performRequest<Schema['TXID']>(() =>
            this.axios.post(`/transactions`, request, options),
        )
    }

    // GET /blocks
    public async getBlock(
        revision: string | number,
        expanded?: boolean,
        options?: AxiosRequestConfig,
    ): Promise<Response<Schema['Block'] | null>> {
        let url: string = `/blocks/${revision}`

        if (expanded) {
            url = `${url}?expanded=${expanded}`
        }

        return this.performRequest<Schema['Block'] | null>(() =>
            this.axios.get(url, options),
        )
    }

    // POST /logs/event
    public async queryEventLogs(
        request: Schema['EventLogFilterRequest'],
        options?: AxiosRequestConfig,
    ): Promise<Response<Schema['EventLogsResponse']>> {
        return this.performRequest(() =>
            this.axios.post(`/logs/event`, request, options),
        )
    }

    // POST /logs/transfer
    public async queryTransferLogs(
        request: components['schemas']['TransferLogFilterRequest'],
        options?: AxiosRequestConfig,
    ): Promise<Response<Schema['TransferLogsResponse']>> {
        return this.performRequest(() =>
            this.axios.post(`/logs/transfer`, request, options),
        )
    }

    // GET /node/network/peers
    public async getPeers(
        options?: AxiosRequestConfig,
    ): Promise<Response<Schema['GetPeersResponse']>> {
        return this.performRequest(() =>
            this.axios.get(`/node/network/peers`, options),
        )
    }

    // WS /subscriptions/block
    public subscribeToBlocks(
        callback: (data: Schema['SubscriptionBlockResponse']) => void,
        pos?: string,
    ) {
        let url: string = `${this.baseWsUrl}/subscriptions/block`

        if (pos) {
            url = `${url}?pos=${pos}`
        }

        return this.openWebsocket(url, callback)
    }

    // WS /subscriptions/event
    public subscribeToEvents(
        callback: (data: Schema['SubscriptionEventResponse']) => void,
        queryParameters?: {
            addr?: string
            t0?: string
            t1?: string
            t2?: string
            t3?: string
            pos?: string
        },
    ) {
        const url = new URL(`${this.baseWsUrl}/subscriptions/event`)

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

        if (queryParameters?.pos) {
            url.searchParams.append('pos', queryParameters.pos)
        }

        return this.openWebsocket(url.toString(), callback)
    }

    // WS /subscriptions/transfers
    public subscribeToTransfers(
        queryParameters: {
            pos?: string
            recipient?: string
            sender?: string
            txOrigin?: string
        },
        callback: (data: Schema['SubscriptionTransferResponse']) => void,
    ) {
        const url = new URL(`${this.baseWsUrl}/subscriptions/transfer`)

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

        return this.openWebsocket(url.toString(), callback)
    }

    // WS /subscriptions/beats
    public subscribeToBeats(
        callback: (data: Schema['SubscriptionBeatResponse']) => void,
        pos?: string,
    ) {
        let url: string = `${this.baseWsUrl}/subscriptions/beat`

        if (pos) {
            url = `${url}?pos=${pos}`
        }

        return this.openWebsocket(url, callback)
    }

    // WS /subscriptions/txpool
    public subscribeToTxPool(callback: (txId: { id: string }) => void) {
        const url = `${this.baseWsUrl}/subscriptions/txpool`

        return this.openWebsocket(url, callback)
    }

    // WS /subscriptions/beat2
    public subscribeToBeats2(
        callback: (data: Schema['SubscriptionBeat2Response']) => void,
        pos?: string,
    ) {
        let url: string = `${this.baseWsUrl}/subscriptions/beat2`

        if (pos) {
            url = `${url}?pos=${pos}`
        }

        return this.openWebsocket(url, callback)
    }

    // POST /debug/tracers
    public async traceClause(
        request: Schema['PostDebugTracerRequest'],
        options?: AxiosRequestConfig,
    ): Promise<Response<any>> {
        return this.performRequest(() =>
            this.axios.post(`/debug/tracers`, request, options),
        )
    }

    // POST /debug/tracers/call
    public async traceContractCall(
        request: Schema['PostDebugTracerCallRequest'],
        options?: AxiosRequestConfig,
    ): Promise<Response<any>> {
        return this.performRequest(() =>
            this.axios.post(`/debug/tracers/call`, request, options),
        )
    }

    // POST /debug/storage-range
    public async retrieveStorageRange(
        request: components['schemas']['StorageRangeOption'],
        options?: AxiosRequestConfig,
    ): Promise<Response<Schema['StorageRange']>> {
        return this.performRequest(() =>
            this.axios.post(`/debug/storage-range`, request, options),
        )
    }

    /**
     * A utility function to debug a particular clause in a reverted transaction
     */
    public async debugRevertedClause(
        txId: string,
        clauseIndex: number,
    ): Promise<any | undefined> {
        const targetPrefix = await this.getDebugTargetPrefix(txId)

        if (!targetPrefix) {
            return
        }

        return this.traceClause({
            target: `${targetPrefix}/${clauseIndex}`,
            name: 'call',
            config: {
                OnlyTopCall: true,
            },
        })
    }

    /**
     * A utility function to get the index of a transaction in a block
     * @param txId
     */
    public async getDebugTargetPrefix(
        txId: string,
    ): Promise<string | undefined> {
        const tx = await this.getTransaction(txId)

        if (!tx.success || !tx.body?.meta?.blockID) {
            return undefined
        }

        const block = await this.getBlock(tx.body.meta.blockID, false)

        if (!block.success || !block.body) {
            return undefined
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const txIndex = block.body.transactions.indexOf(txId)

        return `${block.body.id}/${txIndex}`
    }

    /**
     * A utility function to debug all clauses in a reverted transaction
     * @param txId
     */
    public async debugRevertedTransaction(
        txId: string,
    ): Promise<string | undefined> {
        const tx = await this.getTransaction(txId)

        if (!tx.success || !tx.body?.meta?.blockID || !tx.body.clauses) {
            return undefined
        }

        for (let i = 0; i < tx.body.clauses.length; i++) {
            const debugged = await this.debugRevertedClause(txId, i)

            if (!debugged.success || !debugged.body) {
                continue
            }

            const revertReason = decodeRevertReason(debugged.body.output)

            if (revertReason) {
                return revertReason
            }
        }
    }

    private initBlockSubscription() {
        this.subscribeToBlocks(
            (data: Schema['SubscriptionBlockResponse']) => { },
        )
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

class LoadBalancedClient {
    private readonly clients: ThorClient[]
    private readonly sdkClients: _ThorClient[]

    constructor(urls: string[]) {
        this.clients = urls.map((url) => new ThorClient(url))
        this.sdkClients = urls.map(
            (url) => new _ThorClient(new HttpClient(url)),
        )
    }

    get raw(): ThorClient {
        const handler = {
            get: (target: ThorClient, prop: keyof ThorClient) => {
                const client = this.getRandomClient()
                const value = client[prop]
                return typeof value === 'function' ? value.bind(client) : value
            },
        }

        return new Proxy(this.getRandomClient(), handler)
    }

    get sdk(): _ThorClient {
        const handler = {
            get: (target: _ThorClient, prop: keyof _ThorClient) => {
                const client = this.getRandomSDKClient()
                const value = client[prop]
                return typeof value === 'function' ? value.bind(client) : value
            },
        }

        return new Proxy(this.getRandomSDKClient(), handler)
    }

    private getRandomClient(): ThorClient {
        return this.clients[Math.floor(Math.random() * this.clients.length)]
    }

    private getRandomSDKClient(): _ThorClient {
        return this.sdkClients[
            Math.floor(Math.random() * this.sdkClients.length)
        ]
    }
}

const Client = new LoadBalancedClient(testEnv.urls)

export { Client }
