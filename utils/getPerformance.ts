type ProblemResult = { rating: number; solved: boolean }

const expectedScore = (R: number, problemRating: number): number =>
  1 / (1 + Math.pow(10, (problemRating - R) / 400))

const getPerformance = (problems: ProblemResult[]): number => {
  if (problems.length === 0) return 1200

  const actualSolved = problems.filter((p) => p.solved).length
  const ratings = problems.map((p) => p.rating)
  const maxRating = Math.max(...ratings)
  const minRating = Math.min(...ratings)

  // edge cases: solved everything or nothing. The binary search would
  // otherwise saturate at the search bound (0 or 4000) since expected
  // score only approaches 1 or 0 asymptotically, never truly reaching
  // it at any finite R — that produces meaningless extreme ratings.
  // Cap instead at one band above/below the actual problem set.
  if (actualSolved === problems.length) {
    return maxRating + 400
  }
  if (actualSolved === 0) {
    return Math.max(0, minRating - 400)
  }

  let lo = 0
  let hi = 4000

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    const expected = problems.reduce((sum, p) => sum + expectedScore(mid, p.rating), 0)
    if (expected < actualSolved) {
      lo = mid
    } else {
      hi = mid
    }
  }

  return Math.round((lo + hi) / 2)
}

export default getPerformance
export type { ProblemResult }