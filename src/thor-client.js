import 'dotenv/config'
import { testEnv } from './test-env'
import axios from 'axios'

import WebSocket from 'ws'
import { ThorClient as _ThorClient } from '@vechain/sdk-network'

class ThorClient {
    subscriptions = []

    constructor(baseUrl) {
        this.baseUrl = baseUrl
        this.axios = axios.create({
            baseURL: baseUrl,
            headers: {
                'Content-Type': 'application/json',
            },
        })
        this.baseWsUrl = baseUrl.replace('http', 'ws').replace('https', 'wss')
    }

    closeAllSubscriptions() {
        this.subscriptions.forEach((s) => s())
    }

    async waitForBlock() {
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

    // GET /accounts/{address}
    async getAccount(address, revision, options) {
        let url = `/accounts/${address}`

        if (revision) {
            url = `${url}?revision=${revision}`
        }

        return this.performRequest(() => this.axios.get(url, options))
    }

    // POST /accounts/{address}
    async executeAccountBatch(request, revision, options) {
        let url = `/accounts/*`

        if (revision) {
            url = `${url}?revision=${revision}`
        }

        return this.performRequest(() => this.axios.post(url, request, options))
    }

    // GET /accounts/{address}/code
    async getAccountCode(address, revision, options) {
        let url = `/accounts/${address}/code`

        if (revision) {
            url = `${url}?revision=${revision}`
        }

        return this.performRequest(() => this.axios.get(url, options))
    }

    // GET /accounts/{address}/storage
    async getAccountStorage(address, key, revision, options) {
        let url = `/accounts/${address}/storage/${key}`

        if (revision) {
            url = `${url}?revision=${revision}`
        }

        return this.performRequest(() => this.axios.get(url, options))
    }

    // GET /transactions/{id}
    async getTransaction(id, queryParams, options) {
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

        return this.performRequest(() =>
            this.axios.get(url.toString(), options),
        )
    }

    // GET /transactions/{id}/receipt
    async getTransactionReceipt(id, head, options) {
        let url = `/transactions/${id}/receipt`

        if (head) {
            url = `${url}?head=${head}`
        }

        return this.performRequest(() => this.axios.get(url, options))
    }

    // POST /transactions
    async sendTransaction(request, options) {
        return this.performRequest(() =>
            this.axios.post(`/transactions`, request, options),
        )
    }

    // GET /blocks
    async getBlock(revision, expanded, raw, options) {
        let url = `/blocks/${revision}`

        if (expanded) {
            url = `${url}?expanded=${expanded}`
        }

        if (raw) {
            url = expanded ? `${url}&raw=${raw}` : `${url}?raw=${raw}`
        }

        return this.performRequest(() => this.axios.get(url, options))
    }

    // POST /logs/event
    async queryEventLogs(request, options) {
        return this.performRequest(() =>
            this.axios.post(`/logs/event`, request, options),
        )
    }

    // POST /logs/transfer
    async queryTransferLogs(request, options) {
        return this.performRequest(() =>
            this.axios.post(`/logs/transfer`, request, options),
        )
    }

    // GET /node/network/peers
    async getPeers(options) {
        return this.performRequest(() =>
            this.axios.get(`/node/network/peers`, options),
        )
    }

    // WS /subscriptions/block
    subscribeToBlocks(callback, pos) {
        let url = `${this.baseWsUrl}/subscriptions/block`

        if (pos) {
            url = `${url}?pos=${pos}`
        }

        return this.openWebsocket(url, callback)
    }

    // WS /subscriptions/event
    subscribeToEvents(callback, queryParameters, errorCallback) {
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

        return this.openWebsocket(url.toString(), callback, errorCallback)
    }

    // WS /subscriptions/transfers
    subscribeToTransfers(queryParameters, callback, errorCallback) {
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

        return this.openWebsocket(url.toString(), callback, errorCallback)
    }

    // WS /subscriptions/beats
    subscribeToBeats(callback, pos) {
        let url = `${this.baseWsUrl}/subscriptions/beat`

        if (pos) {
            url = `${url}?pos=${pos}`
        }

        return this.openWebsocket(url, callback)
    }

    // WS /subscriptions/txpool
    subscribeToTxPool(callback) {
        const url = `${this.baseWsUrl}/subscriptions/txpool`

        return this.openWebsocket(url, callback)
    }

    // WS /subscriptions/beat2
    subscribeToBeats2(callback, pos) {
        let url = `${this.baseWsUrl}/subscriptions/beat2`

        if (pos) {
            url = `${url}?pos=${pos}`
        }

        return this.openWebsocket(url, callback)
    }

    // POST /debug/tracers
    async traceClause(request, options) {
        return this.performRequest(() =>
            this.axios.post(`/debug/tracers`, request, options),
        )
    }

    // POST /debug/tracers/call
    async traceCall(request, revision, options) {
        let path = `/debug/tracers/call`
        if (revision) {
            path = `${path}?revision=${revision}`
        }

        return this.performRequest(() =>
            this.axios.post(path, request, options),
        )
    }

    // POST /debug/storage-range
    async retrieveStorageRange(request, options) {
        return this.performRequest(() =>
            this.axios.post(`/debug/storage-range`, request, options),
        )
    }

    /**
     * A utility function to debug a particular clause in a reverted transaction
     */
    async debugRevertedClause(txId, clauseIndex) {
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
    async getDebugTargetPrefix(txId) {
        const tx = await this.getTransaction(txId)

        if (!tx.success || !tx.body?.meta?.blockID) {
            return undefined
        }

        const block = await this.getBlock(tx.body.meta.blockID, false)

        if (!block.success || !block.body) {
            return undefined
        }

        const txIndex = block.body.transactions.indexOf(txId)

        return `${block.body.id}/${txIndex}`
    }

    openWebsocket(url, callback, errorCallback) {
        const ws = new WebSocket(url)
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data)
            callback(data)
        }

        ws.onerror = (event) => {
            if (errorCallback) {
                errorCallback(event)
            }
        }

        this.subscriptions.push(() => ws.close())

        return {
            unsubscribe: () => {
                ws.close()
            },
        }
    }

    async performRequest(request) {
        try {
            const res = await request()
            return {
                body: res.data,
                headers: res.headers,
                success: true,
                httpCode: res.status,
            }
        } catch (e) {
            const a = e
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
    constructor(urls) {
        this.clients = urls.map((url) => new ThorClient(url))
        this.sdkClients = urls.map((url) => _ThorClient.at(url))
    }

    get raw() {
        const handler = {
            get: (target, prop) => {
                const client = this.getRandomClient()
                const value = client[prop]
                return typeof value === 'function' ? value.bind(client) : value
            },
        }

        return new Proxy(this.getRandomClient(), handler)
    }

    get sdk() {
        const handler = {
            get: (target, prop) => {
                const client = this.getRandomSDKClient()
                const value = client[prop]
                return typeof value === 'function' ? value.bind(client) : value
            },
        }

        return new Proxy(this.getRandomSDKClient(), handler)
    }

    index(index) {
        return {
            sdk: this.sdkClients[index],
            raw: this.clients[index],
        }
    }

    getRandomClient() {
        return this.clients[Math.floor(Math.random() * this.clients.length)]
    }

    getRandomSDKClient() {
        return this.sdkClients[
            Math.floor(Math.random() * this.sdkClients.length)
        ]
    }
}

export const Client = new LoadBalancedClient(testEnv.urls)
