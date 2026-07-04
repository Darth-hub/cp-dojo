"use client";
import { useRouter, usePathname } from "next/navigation";
import useTheme from "@/hooks/useTheme";

const NAV_ITEMS = [
  ["修行 · Training", "/training"],
  ["競争 · Contest", "/contest"],
  ["復習 · Upsolve", "/upsolve"],
  ["保存 · Bookmarks", "/bookmarks"],
  ["統計 · Statistics", "/statistics"],
];

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, tokens, toggleTheme } = useTheme();

  return (
    <div>
      <div style={{ height: "3px", background: tokens.accent }} />
      <div
        style={{
          padding: "1.25rem 2.5rem",
          borderBottom: `1px solid ${tokens.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: tokens.background,
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            onClick={() => router.push("/")}
            style={{ color: tokens.accent, fontSize: "20px", cursor: "pointer" }}
          >
            ⛩
          </span>
          <span
            style={{
              color: tokens.text,
              fontSize: "13px",
              letterSpacing: "0.15em",
            }}
          >
            CP · 道場 · Dojo
          </span>
        </div>
        <nav style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          {NAV_ITEMS.map(([label, path]) => (
            <span
              key={path}
              onClick={() => router.push(path)}
              style={{
                color: pathname === path ? tokens.accent : tokens.muted,
                fontSize: "12px",
                letterSpacing: "0.1em",
                cursor: "pointer",
                borderBottom: pathname === path ? `1px solid ${tokens.accent}` : "none",
                paddingBottom: "2px",
              }}
            >
              {label}
            </span>
          ))}
          <span
            onClick={toggleTheme}
            style={{
              color: tokens.muted,
              fontSize: "12px",
              letterSpacing: "0.1em",
              cursor: "pointer",
              border: `1px solid ${tokens.borderStrong}`,
              borderRadius: "4px",
              padding: "4px 10px",
            }}
          >
            {theme === "light" ? "暗 · dark" : "明 · light"}
          </span>
        </nav>
      </div>
    </div>
  );
}