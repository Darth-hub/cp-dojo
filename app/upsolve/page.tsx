"use client"
import NavBar from "@/components/shared/NavBar"
import useUpsolve from "@/hooks/useUpsolve"
import { createElement } from "react"
import { SessionProblem } from "@/types/SessionProblem"

function renderProblemLink(url: string, name: string) {
  return createElement(
    "a",
    {
      href: url,
      target: "_blank",
      rel: "noopener noreferrer",
      style: { color: "#c0392b", fontSize: "14px", textDecoration: "none", fontWeight: "bold" },
    },
    name
  )
}

export default function UpsolvePage() {
  const { problems, isLoading, toggleBookmark, markUpsolved } = useUpsolve()

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0eb", fontFamily: "Georgia, serif" }}>
      <NavBar />
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "3rem 2rem" }}>

        <p style={{ color: "#c0392b", fontSize: "11px", letterSpacing: "0.2em", margin: "0 0 0.5rem" }}>
          復習 · UPSOLVE
        </p>
        <h1 style={{ color: "#2c2420", fontSize: "32px", fontWeight: "bold", margin: "0 0 2.5rem" }}>
          Missed Problems
        </h1>

        {isLoading && (
          <p style={{ color: "#8c7b6b", fontSize: "13px" }}>読み込み中…</p>
        )}

        {!isLoading && problems.length === 0 && (
          <div style={{
            background: "#faf7f4",
            border: "1px solid #e8ddd0",
            borderRadius: "8px",
            padding: "3rem 2rem",
            textAlign: "center",
          }}>
            <p style={{ color: "#8c7b6b", fontSize: "14px", margin: 0 }}>
              No missed problems — you&apos;re all caught up.
            </p>
          </div>
        )}

        {!isLoading && problems.length > 0 && (
          <div style={{
            background: "#faf7f4",
            border: "1px solid #e8ddd0",
            borderRadius: "8px",
            overflow: "hidden",
          }}>
            <div style={{
              padding: "0.75rem 1.5rem",
              borderBottom: "1px solid #e8ddd0",
              display: "grid",
              gridTemplateColumns: "1fr 5rem 3rem 8rem",
              gap: "1rem",
            }}>
              <span style={{ color: "#8c7b6b", fontSize: "11px", letterSpacing: "0.15em" }}>問題 · PROBLEM</span>
              <span style={{ color: "#8c7b6b", fontSize: "11px", letterSpacing: "0.15em", textAlign: "right" }}>評価 · RATING</span>
              <span></span>
              <span></span>
            </div>

            {problems.map((problem: SessionProblem, i: number) => (
              <div
                key={problem.id}
                style={{
                  padding: "1rem 1.5rem",
                  borderBottom: i < problems.length - 1 ? "1px solid #e8ddd0" : "none",
                  display: "grid",
                  gridTemplateColumns: "1fr 5rem 3rem 8rem",
                  gap: "1rem",
                  alignItems: "center",
                }}
              >
                <span>{renderProblemLink(problem.url, problem.name)}</span>
                <span style={{ color: "#8c7b6b", fontSize: "13px", textAlign: "right" }}>
                  {problem.rating}
                </span>
                <span
                  onClick={() => toggleBookmark(problem)}
                  style={{
                    color: problem.bookmarked ? "#c0392b" : "#c8b8a2",
                    fontSize: "16px",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  {problem.bookmarked ? "★" : "☆"}
                </span>
                <button
                  onClick={() => markUpsolved(problem)}
                  style={{
                    padding: "0.4rem 0.9rem",
                    background: "transparent",
                    border: "1px solid #c8b8a2",
                    borderRadius: "4px",
                    color: "#2c2420",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontFamily: "Georgia, serif",
                  }}
                >
                  復習済み · done
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}