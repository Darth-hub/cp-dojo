"use client"
import NavBar from "@/components/shared/NavBar"
import useStatistics from "@/hooks/useStatistics"

const statusColor = (status: string) => {
  if (status === "solved") return "#2dad54"
  if (status === "wrong") return "#c0392b"
  if (status === "testing") return "#d4a017"
  return "#e8ddd0"
}

function RatingChart({ points }: { points: { platform_rating: number; recorded_at: string }[] }) {
  if (points.length < 2) {
    return (
      <p style={{ color: "#8c7b6b", fontSize: "13px" }}>
        Not enough data yet — finish more contests to see your rating trend.
      </p>
    )
  }

  const width = 820
  const height = 180
  const padding = 20
  const ratings = points.map((p) => p.platform_rating)
  const min = Math.min(...ratings) - 50
  const max = Math.max(...ratings) + 50
  const range = max - min || 1

  const coords = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * (width - padding * 2)
    const y = height - padding - ((p.platform_rating - min) / range) * (height - padding * 2)
    return { x, y, rating: p.platform_rating }
  })

  const pathD = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ")

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      <path d={pathD} fill="none" stroke="#c0392b" strokeWidth={2} />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={3} fill="#c0392b" />
      ))}
    </svg>
  )
}

export default function StatisticsPage() {
  const { contestSessions, ratingHistory, trainingStats, isLoading } = useStatistics()

  const currentRating = ratingHistory.length > 0
    ? ratingHistory[ratingHistory.length - 1].platform_rating
    : 1200

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0eb", fontFamily: "Georgia, serif" }}>
      <NavBar />
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "3rem 2rem" }}>

        <p style={{ color: "#c0392b", fontSize: "11px", letterSpacing: "0.2em", margin: "0 0 0.5rem" }}>
          統計 · STATISTICS
        </p>
        <h1 style={{ color: "#2c2420", fontSize: "32px", fontWeight: "bold", margin: "0 0 2.5rem" }}>
          Statistics
        </h1>

        {isLoading && <p style={{ color: "#8c7b6b", fontSize: "13px" }}>読み込み中…</p>}

        {!isLoading && (
          <>
            {/* CONTEST SECTION */}
            <section style={{ marginBottom: "3.5rem" }}>
              <p style={{ color: "#c0392b", fontSize: "11px", letterSpacing: "0.2em", margin: "0 0 0.5rem" }}>
                競争 · CONTEST
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", marginBottom: "1.5rem" }}>
                <h2 style={{ color: "#2c2420", fontSize: "24px", fontWeight: "bold", margin: 0 }}>
                  Rating: {currentRating}
                </h2>
                <span style={{ color: "#8c7b6b", fontSize: "13px" }}>
                  {contestSessions.length} contest{contestSessions.length === 1 ? "" : "s"} completed
                </span>
              </div>

              <div style={{
                background: "#faf7f4",
                border: "1px solid #e8ddd0",
                borderRadius: "8px",
                padding: "1.5rem 2rem",
                marginBottom: "1.5rem",
              }}>
                <RatingChart points={ratingHistory} />
              </div>

              {contestSessions.length === 0 ? (
                <div style={{
                  background: "#faf7f4",
                  border: "1px solid #e8ddd0",
                  borderRadius: "8px",
                  padding: "2rem",
                  textAlign: "center",
                }}>
                  <p style={{ color: "#8c7b6b", fontSize: "14px", margin: 0 }}>
                    No completed contests yet.
                  </p>
                </div>
              ) : (
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
                    gridTemplateColumns: "1fr 6rem 8rem",
                    gap: "1rem",
                  }}>
                    <span style={{ color: "#8c7b6b", fontSize: "11px", letterSpacing: "0.15em" }}>DATE</span>
                    <span style={{ color: "#8c7b6b", fontSize: "11px", letterSpacing: "0.15em", textAlign: "right" }}>PERFORMANCE</span>
                    <span style={{ color: "#8c7b6b", fontSize: "11px", letterSpacing: "0.15em", textAlign: "right" }}>PROBLEMS</span>
                  </div>
                  {contestSessions.map((session, i) => (
                    <div
                      key={session.id}
                      style={{
                        padding: "1rem 1.5rem",
                        borderBottom: i < contestSessions.length - 1 ? "1px solid #e8ddd0" : "none",
                        display: "grid",
                        gridTemplateColumns: "1fr 6rem 8rem",
                        gap: "1rem",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ color: "#2c2420", fontSize: "13px" }}>
                        {session.ended_at ? new Date(session.ended_at).toLocaleDateString() : "—"}
                      </span>
                      <span style={{ color: "#8c7b6b", fontSize: "13px", textAlign: "right" }}>
                        {session.performance ?? "—"}
                      </span>
                      <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                        {session.problems.map((p) => (
                          <span
                            key={p.id}
                            title={p.name}
                            style={{
                              width: "16px",
                              height: "16px",
                              borderRadius: "2px",
                              background: statusColor(p.status),
                              display: "inline-block",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* TRAINING SECTION */}
            <section>
              <p style={{ color: "#c0392b", fontSize: "11px", letterSpacing: "0.2em", margin: "0 0 0.5rem" }}>
                修行 · TRAINING
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", marginBottom: "1.5rem" }}>
                <h2 style={{ color: "#2c2420", fontSize: "24px", fontWeight: "bold", margin: 0 }}>
                  {trainingStats?.totalSolved ?? 0} / {trainingStats?.totalAttempted ?? 0} solved
                </h2>
                {trainingStats && trainingStats.totalAttempted > 0 && (
                  <span style={{ color: "#8c7b6b", fontSize: "13px" }}>
                    {Math.round((trainingStats.totalSolved / trainingStats.totalAttempted) * 100)}% solve rate
                  </span>
                )}
              </div>

              {!trainingStats || trainingStats.totalAttempted === 0 ? (
                <div style={{
                  background: "#faf7f4",
                  border: "1px solid #e8ddd0",
                  borderRadius: "8px",
                  padding: "2rem",
                  textAlign: "center",
                }}>
                  <p style={{ color: "#8c7b6b", fontSize: "14px", margin: 0 }}>
                    No training data yet.
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                  <div style={{
                    background: "#faf7f4",
                    border: "1px solid #e8ddd0",
                    borderRadius: "8px",
                    padding: "1.5rem",
                  }}>
                    <p style={{ color: "#8c7b6b", fontSize: "11px", letterSpacing: "0.15em", margin: "0 0 1rem" }}>
                      タグ別 · BY TAG
                    </p>
                    {trainingStats.byTag.slice(0, 8).map((t) => (
                      <div key={t.tag} style={{ marginBottom: "0.75rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#2c2420", marginBottom: "0.25rem" }}>
                          <span>{t.tag}</span>
                          <span style={{ color: "#8c7b6b" }}>{t.solved}/{t.attempted}</span>
                        </div>
                        <div style={{ background: "#e8ddd0", borderRadius: "3px", height: "6px", overflow: "hidden" }}>
                          <div style={{
                            width: `${(t.solved / t.attempted) * 100}%`,
                            background: "#2dad54",
                            height: "100%",
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    background: "#faf7f4",
                    border: "1px solid #e8ddd0",
                    borderRadius: "8px",
                    padding: "1.5rem",
                  }}>
                    <p style={{ color: "#8c7b6b", fontSize: "11px", letterSpacing: "0.15em", margin: "0 0 1rem" }}>
                      評価別 · BY RATING
                    </p>
                    {trainingStats.byRating.map((r) => (
                      <div key={r.rating} style={{ marginBottom: "0.75rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#2c2420", marginBottom: "0.25rem" }}>
                          <span>{r.rating}</span>
                          <span style={{ color: "#8c7b6b" }}>{r.solved}/{r.attempted}</span>
                        </div>
                        <div style={{ background: "#e8ddd0", borderRadius: "3px", height: "6px", overflow: "hidden" }}>
                          <div style={{
                            width: `${(r.solved / r.attempted) * 100}%`,
                            background: "#2dad54",
                            height: "100%",
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}

      </div>
    </div>
  )
}