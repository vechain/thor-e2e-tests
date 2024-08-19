function zip<T, U>(arrayA: T[], arrayB: U[]): [T, U][] {
    return arrayA.map((a, index) => [a, arrayB[index]])
}

export { zip }
