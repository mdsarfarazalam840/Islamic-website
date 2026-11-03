"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Bell, BookOpen, CalendarDays, Check, Flame, Flag, Play, RotateCcw, Sparkles, Target } from "lucide-react"
import { useKhatmah } from "@/hooks/useKhatmah"
import { useReadingProgress } from "@/hooks/useReadingProgress"
import {
  formatKhatmahDate,
  getKhatmahJuzProgress,
  getKhatmahStats,
  KHATMAH_DURATIONS,
  localDateKey,
  TOTAL_QURAN_AYAHS,
} from "@/lib/khatmah"
import type { JuzEntry } from "@/lib/quran/juz"
import { cn } from "@/lib/utils"

interface KhatmahDashboardProps {
  juzIndex: JuzEntry[]
}

function StatCard({ icon: Icon, label, value, detail }: { icon: typeof Flame; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-gold-dim/15 bg-card/50 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gold-light">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

export function KhatmahDashboard({ juzIndex }: KhatmahDashboardProps) {
  const { plan, createPlan, updatePlan, clearPlan } = useKhatmah()
  const { progress: readingProgress } = useReadingProgress()
  const [duration, setDuration] = useState(30)
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => typeof Notification === "undefined" ? "unsupported" : Notification.permission)

  useEffect(() => {
    if (!plan?.reminderEnabled || typeof Notification === "undefined") return
    const checkReminder = () => {
      const now = new Date()
      const [hours, minutes] = plan.reminderTime.split(":").map(Number)
      const due = now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)
      const today = localDateKey()
      const alreadySent = localStorage.getItem("noor-khatmah-reminder-sent") === today
      const todayActivity = plan.activity[today]?.ayahsRead ?? 0
      if (due && !alreadySent && todayActivity < plan.dailyAyahGoal && Notification.permission === "granted") {
        new Notification("A gentle Quran reminder", { body: `${plan.dailyAyahGoal - todayActivity} ayahs remain in today’s Khatmah goal.` })
        localStorage.setItem("noor-khatmah-reminder-sent", today)
      }
    }
    checkReminder()
    const interval = window.setInterval(checkReminder, 60_000)
    return () => window.clearInterval(interval)
  }, [plan])

  const stats = useMemo(() => plan ? getKhatmahStats(plan) : null, [plan])
  const juzProgress = useMemo(() => plan ? getKhatmahJuzProgress(plan, juzIndex) : [], [juzIndex, plan])

  async function enableReminder(enabled: boolean) {
    if (enabled && typeof Notification !== "undefined") {
      const nextPermission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission()
      setPermission(nextPermission)
    }
    updatePlan({ reminderEnabled: enabled, reminderTime: plan?.reminderTime ?? "20:00" })
  }

  if (!plan || !stats) {
    return (
      <main className="geometric-bg min-h-[calc(100dvh-4rem)]">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
          <header className="mb-8">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold-dim"><Sparkles className="size-3.5" aria-hidden="true" /> Quran journey</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Quran Khatmah</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Build a gentle, personal rhythm for completing the Quran. Your plan stays on this device and works alongside your existing reading position.</p>
          </header>
          <section className="rounded-2xl border border-gold-dim/20 bg-card/50 p-5 sm:p-8" aria-labelledby="plan-setup-title">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold-dim/15 text-gold-light"><Target className="size-5" aria-hidden="true" /></span>
              <div><h2 id="plan-setup-title" className="font-display text-xl font-semibold text-foreground">Choose your pace</h2><p className="mt-1 text-sm text-muted-foreground">A complete Quran contains {TOTAL_QURAN_AYAHS.toLocaleString()} ayahs. Choose a pace that feels sustainable.</p></div>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-3" role="group" aria-label="Khatmah duration">
              {KHATMAH_DURATIONS.map((days) => (
                <button key={days} type="button" onClick={() => setDuration(days)} aria-pressed={duration === days} className={cn("rounded-xl border px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", duration === days ? "border-gold-dim/50 bg-gold-dim/15 text-gold-light" : "border-border/30 bg-background/20 text-muted-foreground hover:border-gold-dim/30 hover:text-foreground")}>
                  <span className="block font-display text-lg font-semibold">{days} days</span><span className="mt-1 block text-xs">{Math.ceil(TOTAL_QURAN_AYAHS / days)} ayahs per day</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => createPlan(duration)} className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg bg-gold-dim px-5 text-sm font-semibold text-space-deep transition-colors hover:bg-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Flag className="size-4" aria-hidden="true" /> Start my Khatmah</button>
          </section>
          {readingProgress && <p className="mt-5 text-center text-xs text-muted-foreground">Your existing Quran position at Surah {readingProgress.surahName}, Ayah {readingProgress.ayahNumber} will remain available in Continue Reading.</p>}
        </div>
      </main>
    )
  }

  return (
    <main className="geometric-bg min-h-[calc(100dvh-4rem)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold-dim"><Sparkles className="size-3.5" aria-hidden="true" /> Quran journey</p><h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Your Khatmah</h1><p className="mt-2 text-sm text-muted-foreground">A {plan.durationDays}-day plan · started {formatKhatmahDate(plan.startedAt.slice(0, 10))}</p></div>
          <Link href={readingProgress ? `/quran/${readingProgress.surahNumber}#ayah-${readingProgress.ayahId}` : "/quran"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gold-dim px-4 text-sm font-semibold text-space-deep transition-colors hover:bg-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Play className="size-4" aria-hidden="true" /> Continue reading</Link>
        </header>

        <section className="rounded-2xl border border-gold-dim/20 bg-card/50 p-5 sm:p-7" aria-labelledby="overall-progress-title">
          <div className="flex items-center justify-between gap-4"><div><h2 id="overall-progress-title" className="font-display text-xl font-semibold text-foreground">Overall progress</h2><p className="mt-1 text-sm text-muted-foreground">{stats.completedAyahs.toLocaleString()} of {TOTAL_QURAN_AYAHS.toLocaleString()} ayahs</p></div><span className="font-display text-3xl font-semibold text-gold-light">{stats.percentage}%</span></div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-space-mid/50" role="progressbar" aria-label="Overall Quran progress" aria-valuenow={stats.percentage} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold-light transition-all" style={{ width: `${stats.percentage}%` }} /></div>
          <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{stats.remainingAyahs.toLocaleString()} ayahs remaining</span><span>{stats.isComplete ? "Khatmah complete — mashaAllah" : `Estimated completion: ${formatKhatmahDate(stats.estimatedCompletionDate)}`}</span></div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Khatmah statistics">
          <StatCard icon={Target} label="Today" value={`${stats.todayAyahs}/${stats.todayGoal}`} detail={stats.todayRemaining ? `${stats.todayRemaining} ayahs remaining` : "Goal complete"} />
          <StatCard icon={Flame} label="Current streak" value={`${stats.currentStreak} ${stats.currentStreak === 1 ? "day" : "days"}`} detail={`Best streak: ${stats.bestStreak} days`} />
          <StatCard icon={CalendarDays} label="Active days" value={String(stats.activeDays)} detail="Days with Quran activity" />
          <StatCard icon={BookOpen} label="Pace" value={`${plan.durationDays} days`} detail={`${plan.dailyAyahGoal} ayahs each day`} />
        </section>

        <section className="mt-8" aria-labelledby="juz-progress-title"><div className="mb-4 flex items-center gap-2"><BookOpen className="size-5 text-gold-light" aria-hidden="true" /><h2 id="juz-progress-title" className="font-display text-xl font-semibold text-foreground">Juz progress</h2></div><div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-10">{juzProgress.map((item) => <Link key={item.juz} href={`/quran/${juzIndex[item.juz - 1]?.startSurah ?? 1}#ayah-${item.startGlobal}`} className={cn("rounded-lg border p-3 text-center transition-colors hover:border-gold-dim/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", item.status === "complete" ? "border-emerald/30 bg-emerald/10" : item.status === "current" ? "border-gold-dim/40 bg-gold-dim/10" : "border-border/30 bg-card/40")} aria-label={`Juz ${item.juz}, ${item.percentage}% complete`}><span className="block text-xs font-semibold text-foreground">Juz {item.juz}</span><span className={cn("mt-1 block text-[10px]", item.status === "complete" ? "text-emerald" : item.status === "current" ? "text-gold-light" : "text-muted-foreground")}>{item.status === "complete" ? <Check className="mx-auto size-3.5" aria-label="Complete" /> : `${item.percentage}%`}</span></Link>)}</div></section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2" aria-label="Plan settings">
          <div className="rounded-2xl border border-border/30 bg-card/40 p-5 sm:p-6"><div className="flex items-center gap-2"><Bell className="size-5 text-gold-light" aria-hidden="true" /><h2 className="font-display text-lg font-semibold text-foreground">Gentle reminders</h2></div><p className="mt-2 text-sm leading-6 text-muted-foreground">A quiet browser reminder after your chosen time, only when today’s goal is unfinished.</p><div className="mt-5 flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={plan.reminderEnabled} onChange={(event) => void enableReminder(event.target.checked)} className="size-4 accent-gold-dim" /> Remind me daily</label><input type="time" value={plan.reminderTime} onChange={(event) => updatePlan({ reminderTime: event.target.value })} disabled={!plan.reminderEnabled} className="rounded-lg border border-input bg-background/60 px-3 py-2 text-sm text-foreground disabled:opacity-50" aria-label="Reminder time" /></div><p className="mt-3 text-xs text-muted-foreground">{permission === "denied" ? "Notifications are blocked in this browser. Your in-page goal still works." : permission === "unsupported" ? "Browser notifications are unavailable here; your plan remains active." : "Reminders are best-effort and can be changed anytime."}</p></div>
          <div className="rounded-2xl border border-border/30 bg-card/40 p-5 sm:p-6"><div className="flex items-center gap-2"><RotateCcw className="size-5 text-gold-light" aria-hidden="true" /><h2 className="font-display text-lg font-semibold text-foreground">Plan pace</h2></div><p className="mt-2 text-sm leading-6 text-muted-foreground">Change your pace whenever life changes. Your progress and streak history stay intact.</p><select value={plan.durationDays} onChange={(event) => { const next = Number(event.target.value); setDuration(next); updatePlan({ durationDays: next }) }} className="mt-5 min-h-11 rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground" aria-label="Khatmah duration">{KHATMAH_DURATIONS.map((days) => <option key={days} value={days}>{days}-day plan · {Math.ceil(TOTAL_QURAN_AYAHS / days)} ayahs/day</option>)}</select><button type="button" onClick={() => { if (window.confirm("Start a new Khatmah plan? Your current plan progress will be reset.")) createPlan(duration, plan.reminderTime) }} className="mt-4 block text-xs text-muted-foreground underline-offset-4 hover:text-gold-light hover:underline">Start a new plan</button><button type="button" onClick={() => { if (window.confirm("Clear your Khatmah plan and its activity history?")) clearPlan() }} className="mt-3 block text-xs text-rose-300/80 underline-offset-4 hover:underline">Clear plan</button></div>
        </section>
      </div>
    </main>
  )
}
