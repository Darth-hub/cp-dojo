import { describe, expect, it } from "vitest"
import getPerformance from "@/utils/getPerformance"

describe("getPerformance", () => {
  it("defaults to 1200 for an empty contest", () => {
    expect(getPerformance([])).toBe(1200)
  })

  it("caps a perfect contest one band above the hardest problem", () => {
    const problems = [
      { rating: 1200, solved: true },
      { rating: 1600, solved: true },
    ]
    expect(getPerformance(problems)).toBe(2000)
  })

  it("caps a zero-solve contest one band below the easiest problem", () => {
    const problems = [
      { rating: 1200, solved: false },
      { rating: 1600, solved: false },
    ]
    expect(getPerformance(problems)).toBe(800)
  })

  it("places a half-solved symmetric set at its midpoint", () => {
    const problems = [
      { rating: 1400, solved: true },
      { rating: 1600, solved: false },
    ]
    expect(getPerformance(problems)).toBe(1500)
  })

  it("is higher when a harder problem is solved", () => {
    const solvedEasy = getPerformance([
      { rating: 1000, solved: true },
      { rating: 1800, solved: false },
    ])
    const solvedHard = getPerformance([
      { rating: 1000, solved: false },
      { rating: 1800, solved: true },
    ])
    expect(solvedHard).toBeGreaterThanOrEqual(solvedEasy)
  })
})
