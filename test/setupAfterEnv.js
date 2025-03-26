import { Client } from '../src/thor-client'
import 'dotenv/config'
import { testEnv } from '../src/test-env'
import { test, it } from 'vitest'
import Docker from 'dockerode'

const docker = new Docker({ socketPath: '/var/run/docker.sock' })
const panicRegex = /panic.*/
const errorRegex = /ERROR\[\d{2}-\d{2}\|\d{2}:\d{2}:\d{2}\.\d{3}\].*"/

it.e2eTest = async (title, tags, testFunc) => {
    if (tags === 'all' || tags.includes(testEnv.type)) {
        // eslint-disable-next-line vitest/valid-title,vitest/expect-expect
        test(title, executeFunctionAndValidateNodeLogs(testFunc, title))
    } else {
        // eslint-disable-next-line vitest/valid-title
        test.skip(title, testFunc)
    }
}

afterAll(async () => {
    Client.raw.closeAllSubscriptions()
    Client.sdk.destroy()
})

function executeFunctionAndValidateNodeLogs(fn, title) {
    return async () => {
        await fn()
        await parseThorLogs()
    }
}

async function parseThorLogs() {
    const containers = await docker.listContainers()
    const filteredContainers = containers.filter((container) => {
        const names = container.Names.join(',')
        return names.includes('public-node') || names.includes('authority-node')
    })
    await Promise.all(
        filteredContainers.map(async (container) => {
            const runningContainer = docker.getContainer(container.Id)
            const logs = await runningContainer.logs({
                follow: false,
                stdout: true,
                stderr: true,
                tail: 1000,
                timestamps: true,
            })
            if (logs) {
                const errors = logs
                    .toString()
                    .split('\n')
                    .filter((row) => {
                        return panicRegex.test(row) || errorRegex.test(row)
                    })
                if (errors.length > 0) {
                    console.log(errors.join('\n'))
                }
                expect(errors.length, 'Errors found in thor node logs').toBe(0)
            }
        }),
    )
}
