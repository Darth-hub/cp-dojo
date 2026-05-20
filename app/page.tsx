"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import useUser from "@/hooks/useUser"

export default function HomePage() {
  const router = useRouter()
  const { user, isLoading, isVerifying, verificationError, login, logout } = useUser()
  const [handle, setHandle] = useState("")
  const [step, setStep] = useState<"input" | "verify">("input")

  const handleLogin = async () => {
    if (step === "input") {
      setStep("verify")
      return
    }
    const success = await login(handle)
    if (success) router.push("/training")
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f0eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Georgia', serif", color: "#8c7b6b", fontSize: "13px", letterSpacing: "0.2em" }}>
          読み込み中...
        </p>
      </div>
    )
  }

  if (user) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#f5f0eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "Georgia, serif",
      }}>
        <div style={{
          border: "1px solid #c8b8a2",
          padding: "2.5rem",
          maxWidth: "380px",
          width: "100%",
          background: "#faf7f4",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "1px solid #e8ddd0" }}>
            <img
              src={user.avatar_url}
              alt={user.cf_handle}
              style={{ width: "52px", height: "52px", borderRadius: "2px", border: "1px solid #c8b8a2" }}
            />
            <div>
              <h2 style={{ color: "#2c2420", fontSize: "18px", fontWeight: "bold", margin: 0 }}>
                {user.cf_handle}
              </h2>
              <p style={{ color: "#8c7b6b", fontSize: "11px", margin: "4px 0 0", letterSpacing: "0.08em" }}>
                CF {user.cf_rating} · 道場 {user.platform_rating}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button
              onClick={() => router.push("/training")}
              style={{
                width: "100%",
                background: "#2c2420",
                color: "#f5f0eb",
                border: "none",
                padding: "12px",
                fontFamily: "Georgia, serif",
                fontSize: "12px",
                letterSpacing: "0.12em",
                cursor: "pointer",
              }}
            >
              修行へ → training
            </button>
            <button
              onClick={logout}
              style={{
                width: "100%",
                background: "transparent",
                color: "#8c7b6b",
                border: "1px solid #c8b8a2",
                padding: "12px",
                fontFamily: "Georgia, serif",
                fontSize: "12px",
                letterSpacing: "0.08em",
                cursor: "pointer",
              }}
            >
              退出 · leave
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f5f0eb",
      fontFamily: "Georgia, serif",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* top red line — torii gate accent */}
      <div style={{ height: "3px", background: "#c0392b" }} />

      {/* header */}
      <div style={{ padding: "1.5rem 2.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e8ddd0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ color: "#c0392b", fontSize: "20px" }}>⛩</span>
          <span style={{ color: "#2c2420", fontSize: "13px", letterSpacing: "0.15em" }}>CP — 道場</span>
        </div>
        <span style={{ color: "#c8b8a2", fontSize: "11px", letterSpacing: "0.1em" }}>
          鍛錬 · 競争 · 成長
        </span>
      </div>

      <div style={{ flex: 1, display: "flex" }}>
        {/* left panel */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "4rem",
          borderRight: "1px solid #e8ddd0",
        }}>
          <div style={{ maxWidth: "360px" }}>
            <p style={{ color: "#c0392b", fontSize: "11px", letterSpacing: "0.2em", margin: "0 0 1rem" }}>
              競技プログラミング道場
            </p>
            <h1 style={{ color: "#2c2420", fontSize: "48px", fontWeight: "bold", lineHeight: 1.1, margin: "0 0 0.25rem", letterSpacing: "-0.02em" }}>
              Your
            </h1>
            <h1 style={{ color: "#8c7b6b", fontSize: "48px", fontWeight: "bold", lineHeight: 1.1, margin: "0 0 3rem", letterSpacing: "-0.02em" }}>
              Dojo.
            </h1>

            {step === "input" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <input
                  type="text"
                  placeholder="codeforces handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.trim())}
                  onKeyDown={(e) => e.key === "Enter" && handle.trim() && handleLogin()}
                  style={{
                    width: "100%",
                    background: "#faf7f4",
                    color: "#2c2420",
                    border: "1px solid #c8b8a2",
                    borderBottom: "2px solid #2c2420",
                    padding: "12px 16px",
                    fontFamily: "Georgia, serif",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                    letterSpacing: "0.03em",
                  }}
                />
                <button
                  onClick={handleLogin}
                  disabled={!handle.trim()}
                  style={{
                    width: "100%",
                    background: handle.trim() ? "#2c2420" : "#e8ddd0",
                    color: handle.trim() ? "#f5f0eb" : "#c8b8a2",
                    border: "none",
                    padding: "13px",
                    fontFamily: "Georgia, serif",
                    fontSize: "12px",
                    letterSpacing: "0.12em",
                    cursor: handle.trim() ? "pointer" : "not-allowed",
                    transition: "all 0.2s",
                  }}
                >
                  続ける · continue →
                </button>
              </div>
            )}

            {step === "verify" && (
              <div style={{
                border: "1px solid #c8b8a2",
                borderTop: "3px solid #c0392b",
                padding: "1.5rem",
                background: "#faf7f4",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}>
                <div style={{ borderBottom: "1px solid #e8ddd0", paddingBottom: "1rem" }}>
                  <p style={{ color: "#c0392b", fontSize: "10px", letterSpacing: "0.15em", margin: "0 0 4px" }}>
                    本人確認 · VERIFICATION
                  </p>
                  <p style={{ color: "#2c2420", fontSize: "18px", fontWeight: "bold", margin: 0 }}>
                    {handle}
                  </p>
                </div>
                <p style={{ color: "#8c7b6b", fontSize: "12px", lineHeight: 1.8, margin: 0 }}>
                  Submit any code that gives a{" "}
                  <span style={{ color: "#2c2420", fontWeight: "bold" }}>Compilation Error</span>
                  {" "}on the problem below.
                </p>
                <a
                  href="https://codeforces.com/contest/2150/problem/G"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#c0392b", fontSize: "13px", letterSpacing: "0.04em" }}
                >
                  → Codeforces 2150G
                </a>
                {verificationError && (
                  <p style={{ color: "#c0392b", fontSize: "12px", borderLeft: "2px solid #c0392b", paddingLeft: "10px", margin: 0 }}>
                    {verificationError}
                  </p>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", paddingTop: "0.5rem" }}>
                  <button
                    onClick={handleLogin}
                    disabled={isVerifying}
                    style={{
                      width: "100%",
                      background: "#2c2420",
                      color: "#f5f0eb",
                      border: "none",
                      padding: "12px",
                      fontFamily: "Georgia, serif",
                      fontSize: "12px",
                      letterSpacing: "0.08em",
                      cursor: isVerifying ? "wait" : "pointer",
                      opacity: isVerifying ? 0.6 : 1,
                    }}
                  >
                    {isVerifying ? "確認中..." : "提出済み · i submitted →"}
                  </button>
                  <button
                    onClick={() => setStep("input")}
                    style={{
                      width: "100%",
                      background: "transparent",
                      color: "#8c7b6b",
                      border: "1px solid #c8b8a2",
                      padding: "12px",
                      fontFamily: "Georgia, serif",
                      fontSize: "12px",
                      letterSpacing: "0.06em",
                      cursor: "pointer",
                    }}
                  >
                    ← 戻る · back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* right panel */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "4rem",
          background: "#faf7f4",
        }}>
          <p style={{ color: "#c0392b", fontSize: "11px", letterSpacing: "0.2em", marginBottom: "2.5rem" }}>
            道 · THE PATH
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {[
              ["確認", "Verify", "Prove your Codeforces handle via a compilation error."],
              ["修行", "Train", "Generate problems by rating range and tags. Persists across sessions."],
              ["競争", "Contest", "Timed sessions — 1hr, 1.5hr, or 2hr."],
              ["復習", "Upsolve", "Problems you missed wait for you."],
              ["成長", "Improve", "Watch your platform rating climb in Statistics."],
            ].map(([jp, en, desc], i) => (
              <div key={i} style={{ display: "flex", gap: "1.5rem", paddingLeft: "1rem", borderLeft: "1px solid #e8ddd0" }}>
                <div style={{ minWidth: "32px" }}>
                  <p style={{ color: "#c0392b", fontSize: "12px", margin: 0 }}>{jp}</p>
                  <p style={{ color: "#c8b8a2", fontSize: "9px", letterSpacing: "0.1em", margin: "2px 0 0" }}>0{i + 1}</p>
                </div>
                <div>
                  <p style={{ color: "#2c2420", fontSize: "13px", fontWeight: "bold", margin: "0 0 4px", letterSpacing: "0.05em" }}>
                    {en}
                  </p>
                  <p style={{ color: "#8c7b6b", fontSize: "12px", margin: 0, lineHeight: 1.7 }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: "1px", background: "#e8ddd0" }} />
    </div>
  )
}