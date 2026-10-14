"use client";
import useTraining from "@/hooks/useTraining";
import tagData from "@/public/data/tag.json";
import { ProblemTag } from "@/types/Codeforces";
import NavBar from "@/components/shared/NavBar";
import useTheme from "@/hooks/useTheme";

export default function TrainingPage() {
  const {
    problems,
    isGenerating,
    isChecking,
    isBuildingModel,
    lastChecked,
    ratingMin,
    ratingMax,
    selectedTags,
    weakTags,
    setRatingMin,
    setRatingMax,
    onTagClick,
    onClearTags,
    applySuggestedTags,
    generate,
    toggleBookmark,
    problemCount,
    setProblemCount,
    checkDone,
  } = useTraining();

  const { tokens } = useTheme();
  const allTags = tagData as ProblemTag[];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: tokens.background,
        fontFamily: "Georgia, serif",
      }}
    >
      <NavBar />
      <div
        style={{ maxWidth: "900px", margin: "0 auto", padding: "3rem 2rem" }}
      >
        {/* page title */}
        <div style={{ marginBottom: "2.5rem" }}>
          <p
            style={{
              color: tokens.accent,
              fontSize: "11px",
              letterSpacing: "0.2em",
              margin: "0 0 0.5rem",
            }}
          >
            修行 · TRAINING
          </p>
          <h1
            style={{
              color: tokens.text,
              fontSize: "32px",
              fontWeight: "bold",
              margin: 0,
            }}
          >
            Problem Set
          </h1>
        </div>

        {/* controls */}
        <div
          style={{
            border: `1px solid ${tokens.borderStrong}`,
            borderTop: `3px solid ${tokens.accent}`,
            padding: "2rem",
            background: tokens.panel,
            marginBottom: "2rem",
          }}
        >
          {/* rating range */}
          <div style={{ marginBottom: "1.5rem" }}>
            <p
              style={{
                color: tokens.muted,
                fontSize: "11px",
                letterSpacing: "0.12em",
                margin: "0 0 0.75rem",
              }}
            >
              評価範囲 · RATING RANGE
            </p>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <input
                type="number"
                value={ratingMin}
                onChange={(e) => setRatingMin(Number(e.target.value))}
                step={100}
                min={800}
                max={3500}
                style={{
                  width: "100px",
                  background: tokens.background,
                  color: tokens.text,
                  border: `1px solid ${tokens.borderStrong}`,
                  borderBottom: `2px solid ${tokens.text}`,
                  padding: "8px 12px",
                  fontFamily: "Georgia, serif",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
              <span style={{ color: tokens.muted, fontSize: "12px" }}>〜</span>
              <input
                type="number"
                value={ratingMax}
                onChange={(e) => setRatingMax(Number(e.target.value))}
                step={100}
                min={800}
                max={3500}
                style={{
                  width: "100px",
                  background: tokens.background,
                  color: tokens.text,
                  border: `1px solid ${tokens.borderStrong}`,
                  borderBottom: `2px solid ${tokens.text}`,
                  padding: "8px 12px",
                  fontFamily: "Georgia, serif",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* problem count */}
          <div style={{ marginBottom: "1.5rem" }}>
            <p
              style={{
                color: tokens.muted,
                fontSize: "11px",
                letterSpacing: "0.12em",
                margin: "0 0 0.75rem",
              }}
            >
              問題数 · PROBLEM COUNT
            </p>
            <input
              type="number"
              value={problemCount}
              onChange={(e) =>
                setProblemCount(
                  Math.min(26, Math.max(1, Number(e.target.value))),
                )
              }
              min={1}
              max={30}
              step={1}
              style={{
                width: "80px",
                background: tokens.background,
                color: tokens.text,
                border: `1px solid ${tokens.borderStrong}`,
                borderBottom: `2px solid ${tokens.text}`,
                padding: "8px 12px",
                fontFamily: "Georgia, serif",
                fontSize: "14px",
                outline: "none",
              }}
            />
          </div>
          {/* weak tag suggestion */}
          {weakTags.length > 0 && (
            <div
              style={{
                marginBottom: "1.5rem",
                padding: "0.75rem 1rem",
                background: tokens.background,
                border: `1px solid ${tokens.border}`,
                borderLeft: `3px solid ${tokens.accent}`,
              }}
            >
              <p
                style={{
                  color: tokens.muted,
                  fontSize: "12px",
                  margin: "0 0 0.5rem",
                }}
              >
                Based on your history, you struggle with:{" "}
                <span style={{ color: tokens.text, fontWeight: "bold" }}>
                  {weakTags.map((t) => t.tag).join(", ")}
                </span>
              </p>
              <span
                onClick={() => {
                  const matched = allTags.filter((t) =>
                    weakTags.some((w) => w.tag === t.value)
                  );
                  applySuggestedTags(matched);
                }}
                style={{
                  color: tokens.accent,
                  fontSize: "11px",
                  letterSpacing: "0.05em",
                  cursor: "pointer",
                }}
              >
                use suggested tags →
              </span>
            </div>
          )}
          {/* tag selector */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "0.75rem",
              }}
            >
              <p
                style={{
                  color: tokens.muted,
                  fontSize: "11px",
                  letterSpacing: "0.12em",
                  margin: 0,
                }}
              >
                タグ · TAGS
              </p>
              {selectedTags.length > 0 && (
                <span
                  onClick={onClearTags}
                  style={{
                    color: tokens.accent,
                    fontSize: "11px",
                    cursor: "pointer",
                    letterSpacing: "0.05em",
                  }}
                >
                  clear all
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {allTags.map((tag) => {
                const selected = selectedTags.find(
                  (t) => t.value === tag.value,
                );
                return (
                  <span
                    key={tag.value}
                    onClick={() => onTagClick(tag)}
                    style={{
                      padding: "4px 10px",
                      border: "1px solid",
                      borderColor: selected ? tokens.accent : tokens.borderStrong,
                      background: selected ? tokens.accent : "transparent",
                      color: selected ? tokens.accentText : tokens.muted,
                      fontSize: "11px",
                      letterSpacing: "0.05em",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {tag.name}
                  </span>
                );
              })}
            </div>
          </div>
          {/* generate button */}

          {isBuildingModel && (
            <p
              style={{
                fontSize: "0.85rem",
                color: tokens.muted,
                margin: "0 0 0.75rem",
              }}
            >
              分析中 · personalizing difficulty from your CF history…
            </p>
          )}

          <button
            onClick={generate}
            disabled={isGenerating}
            style={{
              background: isGenerating ? tokens.border : tokens.text,
              color: isGenerating ? tokens.borderStrong : tokens.background,
              border: "none",
              padding: "12px 2rem",
              fontFamily: "Georgia, serif",
              fontSize: "12px",
              letterSpacing: "0.12em",
              cursor: isGenerating ? "wait" : "pointer",
            }}
          >
            {isGenerating
              ? "生成中..."
              : problems.length > 0
                ? "再生成 · regenerate"
                : "生成 · generate"}
          </button>
        </div>

        {/* problem list */}
        {problems.length > 0 && (
          <div style={{ border: `1px solid ${tokens.borderStrong}`, background: tokens.panel }}>
            <div
              style={{
                padding: "1rem 1.5rem",
                borderBottom: `1px solid ${tokens.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <p
                style={{
                  color: tokens.text,
                  fontSize: "13px",
                  fontWeight: "bold",
                  margin: 0,
                  letterSpacing: "0.05em",
                }}
              >
                問題 · PROBLEMS
              </p>
              <div
                style={{ display: "flex", alignItems: "center", gap: "1rem" }}
              >
                <p style={{ color: tokens.muted, fontSize: "11px", margin: 0 }}>
                  {problems.length} problems
                </p>
                {lastChecked && (
                  <p style={{ color: tokens.muted, fontSize: "11px", margin: 0 }}>
                    更新済み · {new Date(lastChecked).toLocaleTimeString()}
                  </p>
                )}
                <button
                  onClick={checkDone}
                  disabled={isChecking}
                  style={{
                    background: "transparent",
                    color: tokens.muted,
                    border: `1px solid ${tokens.borderStrong}`,
                    padding: "4px 12px",
                    fontFamily: "Georgia, serif",
                    fontSize: "11px",
                    cursor: isChecking ? "not-allowed" : "pointer",
                    opacity: isChecking ? 0.6 : 1,
                  }}
                >
                  {isChecking ? "確認中…" : "確認 · check"}
                </button>
              </div>
            </div>
            {problems.map((problem, i) => (
              <div
                key={problem.id}
                style={{
                  padding: "1rem 1.5rem",
                  borderBottom:
                    i < problems.length - 1 ? `1px solid ${tokens.border}` : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  background:
                    problem.status === "solved"  ? "rgba(45, 173, 84, 0.18)"  :
                    problem.status === "wrong"   ? "rgba(192, 57, 43, 0.18)"  :
                    problem.status === "testing" ? "rgba(212, 160, 23, 0.20)" :
                    "transparent",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    flex: 1,
                  }}
                >
                  <span
                    style={{
                      color: tokens.borderStrong,
                      fontSize: "12px",
                      minWidth: "20px",
                    }}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <a
                    href={problem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: tokens.text,
                      fontSize: "14px",
                      textDecoration: "none",
                      fontWeight: "bold",
                    }}
                  >
                    {problem.name}
                  </a>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "1rem" }}
                >
                  <span style={{ color: tokens.muted, fontSize: "12px" }}>
                    {problem.rating}
                  </span>
                  <span
                    onClick={() => toggleBookmark(problem)}
                    style={{
                      color: problem.bookmarked ? tokens.accent : tokens.borderStrong,
                      fontSize: "16px",
                      cursor: "pointer",
                    }}
                  >
                    {problem.bookmarked ? "★" : "☆"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}