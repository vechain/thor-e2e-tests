function zip(arrayA, arrayB) {
    return arrayA.map((a, index) => [a, arrayB[index]])
}

export { zip }
