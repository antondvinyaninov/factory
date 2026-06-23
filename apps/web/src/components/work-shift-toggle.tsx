"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PlayCircleIcon, StopCircleIcon, ClockIcon, Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type WorkShift = {
  id: string
  startTime: string
  status: "ACTIVE" | "CLOSED"
}

export function WorkShiftToggle() {
  const [activeShift, setActiveShift] = React.useState<WorkShift | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [elapsed, setElapsed] = React.useState(0)
  const router = useRouter()

  React.useEffect(() => {
    async function loadCurrentShift() {
      try {
        const res = await fetch("/api/work-shifts/current", { credentials: "include" })
        if (res.ok) {
          const text = await res.text()
          const shift = text ? JSON.parse(text) : null
          setActiveShift(shift || null)
        }
      } catch (err) {
        console.error("Failed to load shift", err)
      } finally {
        setLoading(false)
      }
    }
    void loadCurrentShift()
  }, [])

  React.useEffect(() => {
    if (!activeShift) {
      setElapsed(0)
      return
    }

    const interval = setInterval(() => {
      const start = new Date(activeShift.startTime).getTime()
      const now = new Date().getTime()
      setElapsed(Math.max(0, now - start))
    }, 1000)

    return () => clearInterval(interval)
  }, [activeShift])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  async function handleToggle() {
    try {
      setLoading(true)
      if (activeShift) {
        const res = await fetch("/api/work-shifts/end", {
          method: "POST",
          credentials: "include",
        })
        if (res.ok) {
          setActiveShift(null)
          router.refresh()
        }
      } else {
        const res = await fetch("/api/work-shifts/start", {
          method: "POST",
          credentials: "include",
        })
        if (res.ok) {
          const shift = await res.json()
          setActiveShift(shift)
          router.refresh()
        }
      }
    } catch (err) {
      console.error("Failed to toggle shift", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !activeShift) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2 h-8">
        <Loader2Icon className="size-4 animate-spin" />
        <span className="hidden lg:inline">Загрузка...</span>
      </Button>
    )
  }

  if (activeShift) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleToggle}
        disabled={loading}
        className="gap-2 h-8 border-primary text-primary hover:bg-primary/10 hover:text-primary transition-all font-mono"
      >
        {loading ? <Loader2Icon className="size-4 animate-spin" /> : <StopCircleIcon className="size-4" />}
        {formatTime(elapsed)}
      </Button>
    )
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleToggle}
      disabled={loading}
      className="gap-2 h-8 text-muted-foreground hover:text-foreground"
    >
      {loading ? <Loader2Icon className="size-4 animate-spin" /> : <PlayCircleIcon className="size-4" />}
      <span className="hidden lg:inline">Начать работу</span>
    </Button>
  )
}
