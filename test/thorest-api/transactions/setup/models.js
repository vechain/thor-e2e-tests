/**
 * Custom error class
 */
class TestCasePlanStepError extends Error {
    constructor(msg) {
        super(msg)

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, TestCasePlanStepError.prototype)
    }
}

export { TestCasePlanStepError }
