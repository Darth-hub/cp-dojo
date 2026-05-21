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
  <div style={{ minHeight: "100vh", fontFamily: "Georgia, serif", position: "relative", overflow: "hidden" }}>
    
    {/* background scene */}
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "linear-gradient(180deg, #e8837a 0%, #d4635a 25%, #c84b42 45%, #b8404a 65%, #8b3040 85%, #6b2535 100%)",
      zIndex: 0,
    }}>
      {/* moon */}
      <div style={{ position: "absolute", top: "40px", left: "50%", transform: "translateX(-50%)", width: "80px", height: "80px", background: "radial-gradient(circle, #fff8f0 0%, #ffeedd 60%, #ffddcc 100%)", borderRadius: "50%", opacity: 0.9 }} />

      {/* fuji */}
      <div style={{ position: "absolute", bottom: "160px", left: "55%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "200px solid transparent", borderRight: "200px solid transparent", borderBottom: "240px solid #c8b8c0" }} />
      <div style={{ position: "absolute", bottom: "160px", left: "55%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "160px solid transparent", borderRight: "160px solid transparent", borderBottom: "200px solid #d8ccd4" }} />
      <div style={{ position: "absolute", bottom: "350px", left: "55%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "70px solid transparent", borderRight: "70px solid transparent", borderBottom: "80px solid #f5f0f2" }} />
      <div style={{ position: "absolute", bottom: "355px", left: "55%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "45px solid transparent", borderRight: "45px solid transparent", borderBottom: "55px solid #fff" }} />

      {/* hills */}
      <div style={{ position: "absolute", bottom: "155px", left: "30%", width: 0, height: 0, borderLeft: "150px solid transparent", borderRight: "150px solid transparent", borderBottom: "80px solid #7a5060" }} />
      <div style={{ position: "absolute", bottom: "155px", left: "55%", width: 0, height: 0, borderLeft: "200px solid transparent", borderRight: "200px solid transparent", borderBottom: "60px solid #6b4555" }} />

      {/* pagoda */}
      <div style={{ position: "absolute", bottom: "155px", left: "40px" }}>
        <div style={{ width: "14px", height: "14px", background: "#1a0f0f", borderRadius: "50%", margin: "0 auto" }} />
        <div style={{ width: "6px", height: "40px", background: "#1a0f0f", margin: "0 auto" }} />
        {[
          [56, 10, 28, 14],
          [48, 10, 24, 12],
          [42, 10, 20, 10],
          [35, 10, 16, 8],
          [28, 10, 12, 6],
        ].map(([roofW, bodyH, bodyW, roofH], i) => (
          <div key={i}>
            <div style={{ width: 0, height: 0, borderLeft: `${roofW}px solid transparent`, borderRight: `${roofW}px solid transparent`, borderBottom: `${roofH}px solid #1a0f0f`, margin: "0 auto" }} />
            <div style={{ width: `${bodyW * 2}px`, height: `${bodyH}px`, background: "#c0392b", margin: "0 auto" }} />
          </div>
        ))}
        <div style={{ width: "80px", height: "10px", background: "#8b1a1a", margin: "0 auto" }} />
      </div>

      {/* bridge */}
      <div style={{ position: "absolute", bottom: "155px", right: "80px", width: "120px", height: "40px" }}>
        <div style={{ position: "absolute", top: 0, width: "100%", height: "5px", background: "#c0392b", borderRadius: "2px" }} />
        <div style={{ position: "absolute", top: "12px", width: "100%", height: "4px", background: "#c0392b" }} />
        {[0, 30, 60, 90, 116].map((left, i) => (
          <div key={i} style={{ position: "absolute", top: 0, left: `${left}px`, width: "4px", height: "40px", background: "#c0392b" }} />
        ))}
      </div>

      {/* cherry blossom branches - left */}
      <svg style={{ position: "absolute", top: 0, left: 0, width: "220px", height: "220px" }} viewBox="0 0 220 220">
        <g stroke="#2c1810" strokeWidth="3" fill="none">
          <path d="M0,0 Q40,30 80,60 Q100,80 130,100"/>
          <path d="M80,60 Q90,40 110,30"/>
          <path d="M80,60 Q60,80 50,110"/>
          <path d="M130,100 Q150,90 170,85"/>
        </g>
        <g fill="#d4607a" opacity="0.85">
          <circle cx="110" cy="30" r="6"/><circle cx="118" cy="24" r="5"/><circle cx="104" cy="24" r="5"/>
          <circle cx="170" cy="85" r="6"/><circle cx="178" cy="79" r="5"/>
          <circle cx="50" cy="110" r="6"/><circle cx="58" cy="104" r="5"/>
        </g>
      </svg>

      {/* cherry blossom branches - right */}
      <svg style={{ position: "absolute", top: 0, right: 0, width: "220px", height: "220px" }} viewBox="0 0 220 220">
        <g stroke="#2c1810" strokeWidth="3" fill="none" transform="scale(-1,1) translate(-220,0)">
          <path d="M0,0 Q40,30 80,60 Q100,80 130,100"/>
          <path d="M80,60 Q90,40 110,30"/>
          <path d="M80,60 Q60,80 50,110"/>
          <path d="M130,100 Q150,90 170,85"/>
        </g>
        <g fill="#d4607a" opacity="0.85" transform="scale(-1,1) translate(-220,0)">
          <circle cx="110" cy="30" r="6"/><circle cx="118" cy="24" r="5"/><circle cx="104" cy="24" r="5"/>
          <circle cx="170" cy="85" r="6"/><circle cx="178" cy="79" r="5"/>
          <circle cx="50" cy="110" r="6"/><circle cx="58" cy="104" r="5"/>
        </g>
      </svg>

      {/* water */}
      <div style={{ position: "absolute", bottom: "155px", width: "100%", height: "3px", background: "rgba(200,140,120,0.4)" }} />
      <div style={{ position: "absolute", bottom: 0, width: "100%", height: "160px", background: "linear-gradient(180deg, #8b3040 0%, #5a1a28 100%)", opacity: 0.8 }} />

      {/* falling petals */}
      <style>{`
        @keyframes fall1 { 0% { transform: translateY(-10px) translateX(0) rotate(0deg); opacity:1; } 100% { transform: translateY(110vh) translateX(60px) rotate(720deg); opacity:0; } }
        @keyframes fall2 { 0% { transform: translateY(-10px) translateX(0) rotate(45deg); opacity:0.9; } 100% { transform: translateY(110vh) translateX(-80px) rotate(-540deg); opacity:0; } }
        @keyframes fall3 { 0% { transform: translateY(-10px) translateX(0) rotate(20deg); opacity:0.95; } 100% { transform: translateY(110vh) translateX(40px) rotate(480deg); opacity:0; } }
        .petal { position:absolute; width:10px; height:7px; background:#f4a0b5; border-radius:50% 0 50% 0; }
      `}</style>
      {[
        [3,0,"fall1","6s","0s","#f4a0b5"],
        [12,10,"fall2","7s","1s","#f9c0d0"],
        [22,0,"fall1","5.5s","2s","#f4a0b5"],
        [33,15,"fall3","7s","0.5s","#f9c0d0"],
        [44,0,"fall2","6.5s","3s","#f4a0b5"],
        [54,10,"fall1","5s","1.5s","#f9c0d0"],
        [63,0,"fall3","7.5s","2.5s","#f4a0b5"],
        [73,15,"fall2","6s","0.8s","#f9c0d0"],
        [83,0,"fall1","7s","3.5s","#f4a0b5"],
        [92,10,"fall3","5.5s","1.2s","#f9c0d0"],
        [18,0,"fall1","8s","4s","#f4a0b5"],
        [77,0,"fall2","6.5s","2.2s","#f9c0d0"],
      ].map(([left, top, anim, dur, delay, color], i) => (
        <div key={i} className="petal" style={{ left: `${left}%`, top: `${top}px`, animation: `${anim} ${dur} linear infinite`, animationDelay: delay as string, background: color as string }} />
      ))}
    </div>

    {/* overlay for readability */}
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.15)", zIndex: 1 }} />

    {/* content */}
    <div style={{ position: "relative", zIndex: 2, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* header */}
      <div style={{ padding: "1.5rem 2.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ color: "#f4a0b5", fontSize: "20px" }}>⛩</span>
          <span style={{ color: "#fff8f0", fontSize: "13px", letterSpacing: "0.15em" }}>CP — 道場</span>
        </div>
      </div>

      {/* login box - centered */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{
          border: "1px solid rgba(244,160,181,0.4)",
          padding: "2.5rem",
          maxWidth: "400px",
          width: "100%",
          background: "rgba(20,8,10,0.7)",
          backdropFilter: "blur(8px)",
        }}>
          <p style={{ color: "#f4a0b5", fontSize: "11px", letterSpacing: "0.2em", margin: "0 0 0.5rem" }}>競技プログラミング道場</p>
          <h1 style={{ color: "#fff8f0", fontSize: "36px", fontWeight: "bold", margin: "0 0 2rem", letterSpacing: "-0.02em" }}>Your Dojo.</h1>

          {step === "input" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <input
                type="text"
                placeholder="codeforces handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value.trim())}
                onKeyDown={(e) => e.key === "Enter" && handle.trim() && handleLogin()}
                style={{
                  width: "100%", background: "rgba(255,248,240,0.1)", color: "#fff8f0",
                  border: "1px solid rgba(244,160,181,0.4)", borderBottom: "2px solid #f4a0b5",
                  padding: "12px 16px", fontFamily: "Georgia, serif", fontSize: "14px",
                  outline: "none", boxSizing: "border-box", letterSpacing: "0.03em",
                }}
              />
              <button
                onClick={handleLogin}
                disabled={!handle.trim()}
                style={{
                  width: "100%", background: handle.trim() ? "#c0392b" : "rgba(255,255,255,0.1)",
                  color: "#fff8f0", border: "1px solid rgba(244,160,181,0.4)",
                  padding: "13px", fontFamily: "Georgia, serif", fontSize: "12px",
                  letterSpacing: "0.12em", cursor: handle.trim() ? "pointer" : "not-allowed",
                }}
              >
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
                <p style={{ color: "#f4a0b5", fontSize: "12px", borderLeft: "2px solid #c0392b", paddingLeft: "10px", margin: 0 }}>
                  {verificationError}
                </p>
              )}
              <button onClick={handleLogin} disabled={isVerifying} style={{ width: "100%", background: "#c0392b", color: "#fff8f0", border: "none", padding: "12px", fontFamily: "Georgia, serif", fontSize: "12px", letterSpacing: "0.08em", cursor: isVerifying ? "wait" : "pointer", opacity: isVerifying ? 0.6 : 1 }}>
                {isVerifying ? "確認中..." : "提出済み · i submitted →"}
              </button>
              <button onClick={() => setStep("input")} style={{ width: "100%", background: "transparent", color: "rgba(255,248,240,0.6)", border: "1px solid rgba(244,160,181,0.3)", padding: "12px", fontFamily: "Georgia, serif", fontSize: "12px", cursor: "pointer" }}>
                ← 戻る · back
              </button>
            </div>
          )}
        </div>
      </div>

      {/* guide at bottom */}
      <div style={{ padding: "2rem 2.5rem", display: "flex", gap: "3rem", justifyContent: "center", flexWrap: "wrap", borderTop: "1px solid rgba(244,160,181,0.2)" }}>
        {[["確認","Verify"],["修行","Train"],["競争","Contest"],["復習","Upsolve"],["成長","Improve"]].map(([jp, en], i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <p style={{ color: "#f4a0b5", fontSize: "13px", margin: "0 0 2px" }}>{jp}</p>
            <p style={{ color: "rgba(255,248,240,0.5)", fontSize: "11px", letterSpacing: "0.08em", margin: 0 }}>{en}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
)
}