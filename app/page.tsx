"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import useUser from "@/hooks/useUser"

const PETALS = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 6.2 + 3) % 100}%`,
  delay: `${(i * 1.9) % 15}s`,
  duration: `${12 + (i % 5) * 1.5}s`,
  size: 5 + (i % 3) * 2,
  drift: `${(i % 2 === 0 ? 1 : -1) * (20 + (i % 4) * 8)}px`,
}))

export default function HomePage() {
  const router = useRouter()
  const { user, isLoading, isVerifying, verificationError, login, logout } = useUser()
  const [handle, setHandle] = useState("")
  const [step, setStep] = useState<"input" | "verify">("input")

  const handleLogin = async () => {
    if (step === "input") { setStep("verify"); return }
    const success = await login(handle)
    if (success) router.push("/training")
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f0eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "Georgia, serif", color: "#8c7b6b", fontSize: "13px", letterSpacing: "0.2em" }}>
          読み込み中...
        </p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", fontFamily: "Georgia, serif", position: "relative", overflow: "hidden" }}>

      {/* deep dusk gradient, full viewport always */}
      <div style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(180deg, #e8b8a8 0%, #c96f6a 22%, #8a3f4a 42%, #4a1f30 62%, #23101c 82%, #120810 100%)",
        zIndex: 0,
      }} />

      {/* moon — single large glow, no illustrated buildings */}
      <div style={{
        position: "fixed",
        top: "14vh",
        left: "50%",
        transform: "translateX(-50%)",
        width: "clamp(140px, 16vw, 260px)",
        height: "clamp(140px, 16vw, 260px)",
        borderRadius: "50%",
        background: "radial-gradient(circle, #fef6e2 0%, #fce8c8 40%, rgba(252,232,200,0.15) 70%, transparent 100%)",
        zIndex: 0,
      }} />

      {/* mountain ridge — one soft ink-brush silhouette, full width, always fills bottom regardless of screen size */}
      <svg
        style={{ position: "fixed", bottom: 0, left: 0, width: "100%", height: "42vh", zIndex: 0 }}
        viewBox="0 0 1000 300"
        preserveAspectRatio="none"
      >
        <path
          d="M0,300 L0,180 Q120,60 260,150 Q360,80 480,170 Q600,40 720,160 Q860,90 1000,190 L1000,300 Z"
          fill="#2a1420"
          opacity={0.9}
        />
        <path
          d="M0,300 L0,220 Q150,140 320,210 Q460,150 600,215 Q760,150 1000,225 L1000,300 Z"
          fill="#150a12"
          opacity={0.95}
        />
      </svg>

      {/* hanko stamp mark — top left, simple, bold, replaces illustrated pagoda/torii */}
      <div style={{
        position: "fixed",
        top: "clamp(20px, 4vh, 48px)",
        left: "clamp(20px, 4vw, 60px)",
        width: "clamp(48px, 5vw, 68px)",
        height: "clamp(48px, 5vw, 68px)",
        border: "2px solid #3a1420",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#3a1420",
        fontSize: "clamp(20px, 2.2vw, 28px)",
        zIndex: 2,
        opacity: 0.85,
      }}>
        道
      </div>

      {/* falling petals — minimal, sparse, restrained */}
      {PETALS.map((p, i) => (
        <div
          key={i}
          style={{
            position: "fixed",
            top: 0,
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: "1px",
            background: "#f4a0b5",
            zIndex: 1,
            animation: `petal-fall ${p.duration} linear infinite`,
            animationDelay: p.delay,
            ["--drift" as string]: p.drift,
          } as React.CSSProperties}
        />
      ))}

      {/* content */}
      <div style={{ position: "relative", zIndex: 3, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "1.5rem 2.5rem", paddingLeft: "clamp(140px, 15vw, 180px)", display: "flex", alignItems: "center" }}>
          <span style={{ color: "#fff8f0", fontSize: "13px", letterSpacing: "0.2em" }}>CP · 道場 · DOJO</span>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{
            border: "1px solid rgba(244,160,181,0.35)",
            padding: "2.5rem",
            maxWidth: "400px",
            width: "100%",
            background: "rgba(15,6,10,0.55)",
            backdropFilter: "blur(10px)",
          }}>
            {user ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "1px solid rgba(244,160,181,0.25)" }}>
                  <img src={user.avatar_url} alt={user.cf_handle} style={{ width: "52px", height: "52px", border: "1px solid rgba(244,160,181,0.4)" }} />
                  <div>
                    <h2 style={{ color: "#fff8f0", fontSize: "20px", fontWeight: "bold", margin: 0 }}>{user.cf_handle}</h2>
                    <p style={{ color: "rgba(255,248,240,0.6)", fontSize: "11px", margin: "4px 0 0", letterSpacing: "0.08em" }}>
                      CF {user.cf_rating} · 道場 {user.platform_rating}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <button onClick={() => router.push("/training")} style={{ width: "100%", background: "#c0392b", color: "#fff8f0", border: "1px solid rgba(244,160,181,0.4)", padding: "13px", fontFamily: "Georgia, serif", fontSize: "12px", letterSpacing: "0.12em", cursor: "pointer" }}>
                    修行へ → training
                  </button>
                  <button onClick={logout} style={{ width: "100%", background: "transparent", color: "rgba(255,248,240,0.6)", border: "1px solid rgba(244,160,181,0.3)", padding: "12px", fontFamily: "Georgia, serif", fontSize: "12px", letterSpacing: "0.08em", cursor: "pointer" }}>
                    退出 · leave
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ color: "#f4a0b5", fontSize: "11px", letterSpacing: "0.2em", margin: "0 0 0.5rem" }}>競技プログラミング道場</p>
                <h1 style={{ color: "#fff8f0", fontSize: "36px", fontWeight: "bold", margin: "0 0 2rem", letterSpacing: "-0.02em" }}>Your Dojo.</h1>

                {step === "input" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <input type="text" placeholder="codeforces handle" value={handle}
                      onChange={(e) => setHandle(e.target.value.trim())}
                      onKeyDown={(e) => e.key === "Enter" && handle.trim() && handleLogin()}
                      style={{ width: "100%", background: "rgba(255,248,240,0.08)", color: "#fff8f0", border: "1px solid rgba(244,160,181,0.4)", borderBottom: "2px solid #f4a0b5", padding: "12px 16px", fontFamily: "Georgia, serif", fontSize: "14px", outline: "none", boxSizing: "border-box", letterSpacing: "0.03em" }}
                    />
                    <button onClick={handleLogin} disabled={!handle.trim()}
                      style={{ width: "100%", background: handle.trim() ? "#c0392b" : "rgba(255,255,255,0.08)", color: "#fff8f0", border: "1px solid rgba(244,160,181,0.4)", padding: "13px", fontFamily: "Georgia, serif", fontSize: "12px", letterSpacing: "0.12em", cursor: handle.trim() ? "pointer" : "not-allowed" }}>
                      続ける · continue →
                    </button>
                  </div>
                )}

                {step === "verify" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ borderBottom: "1px solid rgba(244,160,181,0.3)", paddingBottom: "1rem" }}>
                      <p style={{ color: "#f4a0b5", fontSize: "10px", letterSpacing: "0.15em", margin: "0 0 4px" }}>本人確認 · VERIFICATION</p>
                      <p style={{ color: "#fff8f0", fontSize: "18px", fontWeight: "bold", margin: 0 }}>{handle}</p>
                    </div>
                    <p style={{ color: "rgba(255,248,240,0.7)", fontSize: "12px", lineHeight: 1.8, margin: 0 }}>
                      Submit any code that gives a <span style={{ color: "#f4a0b5", fontWeight: "bold" }}>Compilation Error</span> on the problem below.
                    </p>
                    <a href="https://codeforces.com/contest/2150/problem/G" target="_blank" rel="noopener noreferrer" style={{ color: "#f4a0b5", fontSize: "13px" }}>
                      → Codeforces 2150G
                    </a>
                    {verificationError && (
                      <p style={{ color: "#f4a0b5", fontSize: "12px", borderLeft: "2px solid #c0392b", paddingLeft: "10px", margin: 0 }}>{verificationError}</p>
                    )}
                    <button onClick={handleLogin} disabled={isVerifying} style={{ width: "100%", background: "#c0392b", color: "#fff8f0", border: "none", padding: "12px", fontFamily: "Georgia, serif", fontSize: "12px", letterSpacing: "0.08em", cursor: isVerifying ? "wait" : "pointer", opacity: isVerifying ? 0.6 : 1 }}>
                      {isVerifying ? "確認中..." : "提出済み · i submitted →"}
                    </button>
                    <button onClick={() => setStep("input")} style={{ width: "100%", background: "transparent", color: "rgba(255,248,240,0.6)", border: "1px solid rgba(244,160,181,0.3)", padding: "12px", fontFamily: "Georgia, serif", fontSize: "12px", cursor: "pointer" }}>
                      ← 戻る · back
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {!user && (
          <div style={{ padding: "2rem 2.5rem", display: "flex", gap: "3rem", justifyContent: "center", flexWrap: "wrap" }}>
            {[["確認","Verify"],["修行","Train"],["競争","Contest"],["復習","Upsolve"],["成長","Improve"]].map(([jp, en], i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <p style={{ color: "#f4a0b5", fontSize: "13px", margin: "0 0 2px" }}>{jp}</p>
                <p style={{ color: "rgba(255,248,240,0.5)", fontSize: "11px", letterSpacing: "0.08em", margin: 0 }}>{en}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}