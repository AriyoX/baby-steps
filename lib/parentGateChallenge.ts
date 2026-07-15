export type ParentGateChallenge = {
  kind: "addition" | "subtraction" | "missing-number"
  expression: string
  answer: number
}

type RandomSource = () => number

const randomInt = (minimum: number, maximum: number, random: RandomSource) => {
  const value = Math.min(Math.max(random(), 0), 0.999999999)
  return Math.floor(value * (maximum - minimum + 1)) + minimum
}

export function generateParentGateChallenge(
  random: RandomSource = Math.random,
): ParentGateChallenge {
  const kind = randomInt(0, 2, random)

  if (kind === 0) {
    const left = randomInt(6, 14, random)
    const right = randomInt(2, 9, random)
    return {
      kind: "addition",
      expression: `${left} + ${right} = ?`,
      answer: left + right,
    }
  }

  if (kind === 1) {
    const answer = randomInt(4, 14, random)
    const right = randomInt(2, 9, random)
    return {
      kind: "subtraction",
      expression: `${answer + right} − ${right} = ?`,
      answer,
    }
  }

  const left = randomInt(4, 12, random)
  const answer = randomInt(2, 9, random)
  return {
    kind: "missing-number",
    expression: `${left} + ? = ${left + answer}`,
    answer,
  }
}

export const isCorrectParentGateAnswer = (
  challenge: ParentGateChallenge,
  input: string,
) => /^\d{1,2}$/.test(input) && Number(input) === challenge.answer
