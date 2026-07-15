import {
  generateParentGateChallenge,
  isCorrectParentGateAnswer,
} from "../parentGateChallenge"

const sequence = (...values: number[]) => {
  let index = 0
  return () => values[index++] ?? 0
}

describe("parent gate challenges", () => {
  it("generates a simple addition challenge", () => {
    expect(generateParentGateChallenge(sequence(0, 0, 0))).toEqual({
      kind: "addition",
      expression: "6 + 2 = ?",
      answer: 8,
    })
  })

  it("generates subtraction without a negative result", () => {
    expect(generateParentGateChallenge(sequence(0.5, 0, 0))).toEqual({
      kind: "subtraction",
      expression: "6 − 2 = ?",
      answer: 4,
    })
  })

  it("generates a missing-number variation", () => {
    expect(generateParentGateChallenge(sequence(0.99, 0, 0))).toEqual({
      kind: "missing-number",
      expression: "4 + ? = 6",
      answer: 2,
    })
  })

  it("accepts only the challenge answer", () => {
    const challenge = generateParentGateChallenge(sequence(0, 0, 0))

    expect(isCorrectParentGateAnswer(challenge, "8")).toBe(true)
    expect(isCorrectParentGateAnswer(challenge, "7")).toBe(false)
    expect(isCorrectParentGateAnswer(challenge, "")).toBe(false)
    expect(isCorrectParentGateAnswer(challenge, "8a")).toBe(false)
  })
})
