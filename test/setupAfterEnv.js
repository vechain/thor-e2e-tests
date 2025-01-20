import { Client } from '../src/thor-client'
import 'dotenv/config'
import { testEnv } from '../src/test-env'
import { test, it } from 'vitest'

it.e2eTest = (title, tags, testFunc) => {
    if (tags === 'all' || tags.includes(testEnv.type)) {
        // eslint-disable-next-line vitest/valid-title,vitest/expect-expect
        test(title, testFunc)
    } else {
        // eslint-disable-next-line vitest/valid-title
        test.skip(title, testFunc)
    }
}

afterAll(async () => {
    Client.raw.closeAllSubscriptions()
    Client.sdk.destroy()
})
