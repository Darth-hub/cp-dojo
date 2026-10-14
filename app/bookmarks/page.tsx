"use client"
import NavBar from "@/components/shared/NavBar"
import useBookmarks from "@/hooks/useBookmarks"
import useTheme from "@/hooks/useTheme"
import { createElement } from "react"

function renderProblemLink(url: string, name: string, color: string) {
  return createElement(
    "a",
    {
      href: url,
      target: "_blank",
      rel: "noopener noreferrer",
      style: { color, fontSize: "14px", textDecoration: "none", fontWeight: "bold" },
    },
    name
  )
}

export default function BookmarksPage() {
  const { bookmarks, isLoading, removeFromBookmarks } = useBookmarks()
  const { tokens } = useTheme()

  return (
    <div style={{ minHeight: "100vh", background: tokens.background, fontFamily: "Georgia, serif" }}>
      <NavBar />
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "3rem 2rem" }}>

        <p style={{ color: tokens.accent, fontSize: "11px", letterSpacing: "0.2em", margin: "0 0 0.5rem" }}>
          保存 · BOOKMARKS
        </p>
        <h1 style={{ color: tokens.text, fontSize: "32px", fontWeight: "bold", margin: "0 0 2.5rem" }}>
          Saved Problems
        </h1>

        {isLoading && <p style={{ color: tokens.muted, fontSize: "13px" }}>読み込み中…</p>}

        {!isLoading && bookmarks.length === 0 && (
          <div style={{
            background: tokens.panel,
            border: `1px solid ${tokens.border}`,
            borderRadius: "8px",
            padding: "3rem 2rem",
            textAlign: "center",
          }}>
            <p style={{ color: tokens.muted, fontSize: "14px", margin: 0 }}>
              No bookmarked problems yet.
            </p>
          </div>
        )}

        {!isLoading && bookmarks.length > 0 && (
          <div style={{
            background: tokens.panel,
            border: `1px solid ${tokens.border}`,
            borderRadius: "8px",
            overflow: "hidden",
          }}>
            <div style={{
              padding: "0.75rem 1.5rem",
              borderBottom: `1px solid ${tokens.border}`,
              display: "grid",
              gridTemplateColumns: "1fr 5rem 3rem",
              gap: "1rem",
            }}>
              <span style={{ color: tokens.muted, fontSize: "11px", letterSpacing: "0.15em" }}>問題 · PROBLEM</span>
              <span style={{ color: tokens.muted, fontSize: "11px", letterSpacing: "0.15em", textAlign: "right" }}>評価 · RATING</span>
              <span></span>
            </div>

            {bookmarks.map((bookmark, i) => (
              <div
                key={`${bookmark.contest_id}-${bookmark.index}`}
                style={{
                  padding: "1rem 1.5rem",
                  borderBottom: i < bookmarks.length - 1 ? `1px solid ${tokens.border}` : "none",
                  display: "grid",
                  gridTemplateColumns: "1fr 5rem 3rem",
                  gap: "1rem",
                  alignItems: "center",
                }}
              >
                <span>{renderProblemLink(bookmark.url, bookmark.name, tokens.accent)}</span>
                <span style={{ color: tokens.muted, fontSize: "13px", textAlign: "right" }}>
                  {bookmark.rating}
                </span>
                <span
                  onClick={() => removeFromBookmarks(bookmark)}
                  style={{
                    color: tokens.accent,
                    fontSize: "16px",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                  title="Remove bookmark"
                >
                  ★
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}