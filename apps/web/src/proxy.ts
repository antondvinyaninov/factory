import { NextResponse, type NextRequest } from "next/server"

const SESSION_COOKIE_NAME = "factory_session"

export function proxy(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE_NAME)
  const { pathname } = request.nextUrl

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (!session && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|uploads|_next/static|_next/image|favicon.ico|logo-portal.svg).*)",
  ],
}
