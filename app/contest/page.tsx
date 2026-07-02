"use client"
import NavBar from "@/components/shared/NavBar"
import useContest from "@/hooks/useContest"
import { createElement } from "react"

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export default function ContestPage() {
  const {
    problems, duration, problemCount, ratingMin, ratingMax,
    startedAt, timeLeft, isGenerating,
    setDuration, setProblemCount, setRatingMin, setRatingMax,
    generate, start, refresh, finish,
  } = useContest()

  const isRunning = startedAt !== null
  const hasProblems = problems.length > 0

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0eb", fontFamily: "Georgia, serif" }}>
      <NavBar />
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "3rem 2rem" }}>

        <p style={{ color: "#c0392b", fontSize: "11px", letterSpacing: "0.2em", margin: "0 0 0.5rem" }}>
          競争 · CONTEST
        </p>
        <h1 style={{ color: "#2c2420", fontSize: "32px", fontWeight: "bold", margin: "0 0 2.5rem" }}>
          Contest Simulator
        </h1>

        {isRunning && (
          <div style={{
            background: "#faf7f4",
            border: "1px solid #e8ddd0",
            borderRadius: "8px",
            padding: "1.5rem 2rem",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div>
              <p style={{ color: "#8c7b6b", fontSize: "11px", letterSpacing: "0.15em", margin: "0 0 0.25rem" }}>
                残り時間 · TIME LEFT
              </p>
              <p style={{
                color: timeLeft < 300000 ? "#c0392b" : "#2c2420",
                fontSize: "40px",
                fontWeight: "bold",
                margin: 0,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "0.05em",
              }}>
                {formatTime(timeLeft)}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={refresh}
                style={{
                  padding: "0.6rem 1.4rem",
                  background: "transparent",
                  border: "1px solid #c8b8a2",
                  borderRadius: "4px",
                  color: "#2c2420",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontFamily: "Georgia, serif",
                }}
              >
                確認 · refresh
              </button>
              <button
                onClick={finish}
                style={{
                  padding: "0.6rem 1.4rem",
                  background: "#c0392b",
                  border: "none",
                  borderRadius: "4px",
                  color: "#fff",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontFamily: "Georgia, serif",
                }}
              >
                終了 · finish
              </button>
            </div>
          </div>
        )}

        {!isRunning && (
          <div style={{
            background: "#faf7f4",
            border: "1px solid #e8ddd0",
            borderRadius: "8px",
            padding: "1.5rem 2rem",
            marginBottom: "2rem",
          }}>
            <div style={{ marginBottom: "1.25rem" }}>
              <p style={{ color: "#8c7b6b", fontSize: "11px", letterSpacing: "0.15em", margin: "0 0 0.6rem" }}>
                時間 · DURATION
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {[60, 90, 120].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    style={{
                      padding: "0.4rem 1rem",
                      background: duration === d ? "#2c2420" : "transparent",
                      border: "1px solid",
                      borderColor: duration === d ? "#2c2420" : "#c8b8a2",
                      borderRadius: "4px",
                      color: duration === d ? "#f5f0eb" : "#2c2420",
                      fontSize: "13px",
                      cursor: "pointer",
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <p style={{ color: "#8c7b6b", fontSize: "11px", letterSpacing: "0.15em", margin: "0 0 0.6rem" }}>
                問題数 · PROBLEMS
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setProblemCount(n)}
                    style={{
                      padding: "0.4rem 1rem",
                      background: problemCount === n ? "#2c2420" : "transparent",
                      border: "1px solid",
                      borderColor: problemCount === n ? "#2c2420" : "#c8b8a2",
                      borderRadius: "4px",
                      color: problemCount === n ? "#f5f0eb" : "#2c2420",
                      fontSize: "13px",
                      cursor: "pointer",
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ color: "#8c7b6b", fontSize: "11px", letterSpacing: "0.15em", margin: "0 0 0.6rem" }}>
                評価範囲 · RATING RANGE
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <input
                  type="number"
                  value={ratingMin}
                  onChange={(e) => setRatingMin(Number(e.target.value))}
                  step={100} min={800} max={3500}
                  style={{
                    width: "90px",
                    padding: "0.4rem 0.6rem",
                    border: "1px solid #c8b8a2",
                    borderRadius: "4px",
                    background: "#fff",
                    color: "#2c2420",
                    fontSize: "14px",
                    fontFamily: "Georgia, serif",
                  }}
                />
                <span style={{ color: "#8c7b6b", fontSize: "13px" }}>—</span>
                <input
                  type="number"
                  value={ratingMax}
                  onChange={(e) => setRatingMax(Number(e.target.value))}
                  step={100} min={800} max={3500}
                  style={{
                    width: "90px",
                    padding: "0.4rem 0.6rem",
                    border: "1px solid #c8b8a2",
                    borderRadius: "4px",
                    background: "#fff",
                    color: "#2c2420",
                    fontSize: "14px",
                    fontFamily: "Georgia, serif",
                  }}
                />
              </div>
            </div>

            <button
              onClick={generate}
              disabled={isGenerating}
              style={{
                padding: "0.6rem 1.8rem",
                background: "#2c2420",
                border: "none",
                borderRadius: "4px",
                color: "#f5f0eb",
                fontSize: "13px",
                cursor: isGenerating ? "not-allowed" : "pointer",
                opacity: isGenerating ? 0.6 : 1,
                fontFamily: "Georgia, serif",
              }}
            >
              {isGenerating ? "生成中…" : hasProblems ? "再生成 · regenerate" : "生成 · generate"}
            </button>
          </div>
        )}

        {hasProblems && (
          <div style={{
            background: "#faf7f4",
            border: "1px solid #e8ddd0",
            borderRadius: "8px",
            overflow: "hidden",
            marginBottom: "1.5rem",
          }}>
            <div style={{
              padding: "0.75rem 1.5rem",
              borderBottom: "1px solid #e8ddd0",
              display: "grid",
              gridTemplateColumns: "2rem 1fr 5rem",
              gap: "1rem",
            }}>
              <span style={{ color: "#8c7b6b", fontSize: "11px", letterSpacing: "0.15em" }}>#</span>
              <span style={{ color: "#8c7b6b", fontSize: "11px", letterSpacing: "0.15em" }}>問題 · PROBLEM</span>
              <span style={{ color: "#8c7b6b", fontSize: "11px", letterSpacing: "0.15em", textAlign: "right" }}>評価 · RATING</span>
            </div>

            {problems.map((problem, i) => {
              const rowColor =
                problem.status === "solved" ? "rgba(45, 173, 84, 0.18)" :
                problem.status === "wrong" ? "rgba(192, 57, 43, 0.18)" :
                problem.status === "testing" ? "rgba(212, 160, 23, 0.20)" :
                "transparent"

              return (
                <div
                  key={problem.id}
                  style={{
                    padding: "1rem 1.5rem",
                    borderBottom: i < problems.length - 1 ? "1px solid #e8ddd0" : "none",
                    display: "grid",
                    gridTemplateColumns: "2rem 1fr 5rem",
                    gap: "1rem",
                    alignItems: "center",
                    background: rowColor,
                  }}
                >
                  <span style={{ color: "#8c7b6b", fontSize: "13px", fontWeight: "bold" }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>
                    {isRunning
                      ? renderProblemLink(problem.url, problem.name)
                      : <span style={{ color: "#8c7b6b", fontSize: "14px", letterSpacing: "0.1em" }}>???</span>
                    }
                  </span>
                  <span style={{ color: "#8c7b6b", fontSize: "13px", textAlign: "right" }}>
                    {isRunning ? problem.rating : "???"}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {hasProblems && !isRunning && (
          <button
            onClick={start}
            style={{
              padding: "0.7rem 2.5rem",
              background: "#c0392b",
              border: "none",
              borderRadius: "4px",
              color: "#fff",
              fontSize: "14px",
              cursor: "pointer",
              fontFamily: "Georgia, serif",
              letterSpacing: "0.05em",
            }}
          >
            開始 · start contest
          </button>
        )}

      </div>
    </div>
  )
}

function renderProblemLink(url: string, name: string) {
  return createElement(
    "a",
    {
      href: url,
      target: "_blank",
      rel: "noopener noreferrer",
      style: { color: "#c0392b", fontSize: "14px", textDecoration: "none" },
    },
    name
  )
}