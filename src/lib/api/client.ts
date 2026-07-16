const CLIENT_ID_KEY = "quran_client_id"

function generateId(): string {
  return crypto.randomUUID()
}

export function getClientId(): string {
  if (typeof window === "undefined") return ""
  let id = localStorage.getItem(CLIENT_ID_KEY)
  if (!id) {
    id = generateId()
    localStorage.setItem(CLIENT_ID_KEY, id)
  }
  return id
}

export function resetClientId(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(CLIENT_ID_KEY)
}
