export type CachedCurrentUser = {
  id: string
  name: string
  email: string
  role: "SUPER_ADMIN" | "ADMIN" | "USER"
}

const USER_CACHE_TTL_MS = 30_000

let cachedUser:
  | {
      expiresAt: number
      user: CachedCurrentUser
    }
  | undefined
let currentUserPromise: Promise<CachedCurrentUser | null> | undefined

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "/api"
}

export async function getCurrentUserCached() {
  if (cachedUser && cachedUser.expiresAt > Date.now()) {
    return cachedUser.user
  }

  if (currentUserPromise) {
    return currentUserPromise
  }

  currentUserPromise = fetch(`${getApiBaseUrl()}/auth/me`, {
    credentials: "include",
  })
    .then(async (response) => {
      if (!response.ok) {
        return null
      }

      const payload = (await response.json()) as {
        user?: CachedCurrentUser
      }
      const user = payload.user ?? null

      if (user) {
        cachedUser = {
          expiresAt: Date.now() + USER_CACHE_TTL_MS,
          user,
        }
      }

      return user
    })
    .catch(() => null)
    .finally(() => {
      currentUserPromise = undefined
    })

  return currentUserPromise
}

export function clearCurrentUserCache() {
  cachedUser = undefined
  currentUserPromise = undefined
}
