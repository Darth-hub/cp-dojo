import { NextRequest, NextResponse } from "next/server"

const PROTECTED_ROUTES = ["/training", "/contest", "/upsolve", "/statistics", "/bookmarks"]
const HANDLE_COOKIE_KEY = "cpdojo-handle"

export function middleware(request: NextRequest) {
  const handle = request.cookies.get(HANDLE_COOKIE_KEY)?.value
  const isProtected = PROTECTED_ROUTES.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtected && !handle) {
    return NextResponse.redirect(new URL("/", request.url))
  }
}

export const config = {
  matcher: ["/training", "/contest", "/upsolve", "/statistics", "/bookmarks"],
}