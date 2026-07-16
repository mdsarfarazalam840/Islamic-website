import { getClientId } from "./client"

const API_BASE = "/api"

interface ReadingProgress {
  surah_number: number
  last_ayah_number: number
  completed: number
  updated_at: string
}

export async function getProgress(): Promise<ReadingProgress[]> {
  const clientId = getClientId()
  if (!clientId) return []
  const res = await fetch(
    `${API_BASE}/progress?client_id=${encodeURIComponent(clientId)}`,
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.progress ?? []
}

export async function updateProgress(
  surahNumber: number,
  lastAyahNumber: number,
  completed = false,
): Promise<boolean> {
  const clientId = getClientId()
  if (!clientId) return false
  const res = await fetch(`${API_BASE}/progress`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      surah_number: surahNumber,
      last_ayah_number: lastAyahNumber,
      completed,
    }),
  })
  return res.ok
}

export async function getSurahProgress(surahNumber: number): Promise<ReadingProgress | null> {
  const all = await getProgress()
  return all.find((p) => p.surah_number === surahNumber) ?? null
}
