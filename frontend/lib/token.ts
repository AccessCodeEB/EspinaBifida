const ACCESS_KEY  = "eb_token"
const REFRESH_KEY = "eb_refresh_token"

export const tokenStorage = {
  get: (): string | null => {
    if (typeof window === "undefined") return null
    return localStorage.getItem(ACCESS_KEY)
  },
  set: (token: string) => {
    if (typeof window === "undefined") return
    localStorage.setItem(ACCESS_KEY, token)
  },
  clear: () => {
    if (typeof window === "undefined") return
    localStorage.removeItem(ACCESS_KEY)
  },

  getRefresh: (): string | null => {
    if (typeof window === "undefined") return null
    return localStorage.getItem(REFRESH_KEY)
  },
  setRefresh: (token: string) => {
    if (typeof window === "undefined") return
    localStorage.setItem(REFRESH_KEY, token)
  },
  clearRefresh: () => {
    if (typeof window === "undefined") return
    localStorage.removeItem(REFRESH_KEY)
  },

  clearAll: () => {
    if (typeof window === "undefined") return
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}
