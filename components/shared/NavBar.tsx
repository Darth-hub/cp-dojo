"use client";
import { useRouter, usePathname } from "next/navigation";

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

  return (
    <div>
      <div style={{ height: "3px", background: "#c0392b" }} />
      <div
        style={{
          padding: "1.25rem 2.5rem",
          borderBottom: "1px solid #e8ddd0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#f5f0eb",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            onClick={() => router.push("/")}
            style={{ color: "#c0392b", fontSize: "20px", cursor: "pointer" }}
          >
            ⛩
          </span>
          <span
            style={{
              color: "#2c2420",
              fontSize: "13px",
              letterSpacing: "0.15em",
            }}
          >
            CP · 道場 · Dojo
          </span>
        </div>
        <nav style={{ display: "flex", gap: "2rem" }}>
          {NAV_ITEMS.map(([label, path]) => (
            <span
              key={path}
              onClick={() => router.push(path)}
              style={{
                color: pathname === path ? "#c0392b" : "#8c7b6b",
                fontSize: "12px",
                letterSpacing: "0.1em",
                cursor: "pointer",
                borderBottom: pathname === path ? "1px solid #c0392b" : "none",
                paddingBottom: "2px",
              }}
            >
              {label}
            </span>
          ))}
        </nav>
      </div>
    </div>
  );
}
