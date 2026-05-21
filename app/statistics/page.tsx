"use client"
import NavBar from "@/components/shared/NavBar"

export default function StatisticsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f0eb", fontFamily: "Georgia, serif" }}>
      <NavBar />
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "3rem 2rem" }}>
        <p style={{ color: "#c0392b", fontSize: "11px", letterSpacing: "0.2em", margin: "0 0 0.5rem" }}>
           統計 · STATISTICS
        </p>
        <h1 style={{ color: "#2c2420", fontSize: "32px", fontWeight: "bold", margin: 0 }}>
          Contest
        </h1>
      </div>
    </div>
  )
}