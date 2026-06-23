"use client"

import * as React from "react"
import { TypographyH2, TypographyP } from "@/components/ui/typography"
import { Badge } from "@/components/ui/badge"
import { ClockIcon, CalendarIcon, ChevronDownIcon } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type WorkShift = {
  id: string
  startTime: string
  endTime: string | null
  durationMs: number | null
  status: "ACTIVE" | "CLOSED"
}

type GroupedShift = {
  dateStr: string
  totalDurationMs: number
  activeCount: number
  shifts: WorkShift[]
}

function formatDuration(ms: number) {
  if (ms === 0) return "0 ч 0 мин"
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return `${hours} ч ${minutes} мин`
}

export default function TimeTrackingPage() {
  const [shifts, setShifts] = React.useState<WorkShift[]>([])
  const [loading, setLoading] = React.useState(true)
  const [expandedDays, setExpandedDays] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch("/api/work-shifts", { credentials: "include" })
        if (res.ok) {
          const data = await res.json()
          setShifts(data.items || [])
        }
      } catch (err) {
        console.error("Failed to load shift history", err)
      } finally {
        setLoading(false)
      }
    }
    void loadHistory()
  }, [])

  const groupedShifts = React.useMemo(() => {
    const groups: Record<string, GroupedShift> = {}

    shifts.forEach((shift) => {
      const dateStr = new Date(shift.startTime).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })

      if (!groups[dateStr]) {
        groups[dateStr] = {
          dateStr,
          totalDurationMs: 0,
          activeCount: 0,
          shifts: [],
        }
      }

      groups[dateStr].shifts.push(shift)

      if (shift.durationMs) {
        groups[dateStr].totalDurationMs += shift.durationMs
      }
      if (shift.status === "ACTIVE") {
        groups[dateStr].activeCount++
      }
    })

    return Object.values(groups)
  }, [shifts])

  // Open the first day by default when data loads
  React.useEffect(() => {
    if (groupedShifts.length > 0 && Object.keys(expandedDays).length === 0) {
      setExpandedDays({ [groupedShifts[0].dateStr]: true })
    }
  }, [groupedShifts, expandedDays])

  const toggleDay = (dateStr: string) => {
    setExpandedDays((prev) => ({ ...prev, [dateStr]: !prev[dateStr] }))
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 62)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="h-svh overflow-y-auto bg-muted/20">
        <SiteHeader title="Учет рабочего времени" />

        <main className="flex-1 p-4 md:p-6 mx-auto w-full max-w-5xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <TypographyH2 className="tracking-tight">Журнал смен</TypographyH2>
              <TypographyP className="text-muted-foreground mt-1 text-sm">
                История начала и завершения рабочего дня
              </TypographyP>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">
              Загрузка журнала...
            </div>
          ) : groupedShifts.length === 0 ? (
            <div className="rounded-2xl border border-border/80 shadow-xs bg-background overflow-hidden p-12 flex flex-col items-center justify-center text-muted-foreground">
              <ClockIcon className="size-12 mb-4 text-muted/50" />
              <p>Вы еще не открывали ни одной смены.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groupedShifts.map((group) => (
                <div
                  key={group.dateStr}
                  className="rounded-2xl border border-border/80 shadow-xs bg-background overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleDay(group.dateStr)}
                    className="w-full flex items-center justify-between p-4 bg-muted/10 hover:bg-muted/30 transition-colors focus:outline-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <CalendarIcon className="size-5" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-sm md:text-base">{group.dateStr}</h3>
                        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                          {group.shifts.length}{" "}
                          {group.shifts.length === 1
                            ? "сессия"
                            : group.shifts.length > 1 && group.shifts.length < 5
                            ? "сессии"
                            : "сессий"}
                          {group.activeCount > 0 && " • Есть незавершенная смена"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="text-right">
                        <p className="text-[10px] md:text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
                          Отработано
                        </p>
                        <p className="font-bold text-sm md:text-base text-primary">
                          {formatDuration(group.totalDurationMs)}
                        </p>
                      </div>
                      <ChevronDownIcon
                        className={cn(
                          "size-5 text-muted-foreground transition-transform duration-200",
                          expandedDays[group.dateStr] && "rotate-180"
                        )}
                      />
                    </div>
                  </button>

                  {expandedDays[group.dateStr] && (
                    <div className="divide-y divide-border/60 border-t border-border/60">
                      <div className="p-3 bg-muted/5 grid grid-cols-4 md:grid-cols-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground gap-4">
                        <div className="col-span-2 md:col-span-1 pl-2">Сессия</div>
                        <div>Начало</div>
                        <div>Конец</div>
                        <div className="hidden md:block">Длительность</div>
                        <div>Статус</div>
                      </div>
                      {group.shifts.map((shift, index) => {
                        const startDate = new Date(shift.startTime)
                        const endDate = shift.endTime ? new Date(shift.endTime) : null

                        return (
                          <div
                            key={shift.id}
                            className="p-4 grid grid-cols-4 md:grid-cols-5 text-sm items-center gap-4 hover:bg-muted/20 transition-colors"
                          >
                            <div className="col-span-2 md:col-span-1 flex items-center gap-2 font-medium text-muted-foreground pl-2">
                              #{group.shifts.length - index}
                            </div>
                            <div className="font-medium text-foreground">
                              {startDate.toLocaleTimeString("ru-RU", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            <div className="font-medium text-foreground">
                              {endDate
                                ? endDate.toLocaleTimeString("ru-RU", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </div>
                            <div className="hidden md:block text-muted-foreground">
                              {shift.durationMs ? formatDuration(shift.durationMs) : "—"}
                            </div>
                            <div>
                              {shift.status === "ACTIVE" ? (
                                <Badge className="bg-primary hover:bg-primary/90 text-[10px] px-1.5 py-0 uppercase tracking-widest font-bold">
                                  В работе
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 uppercase tracking-widest font-bold"
                                >
                                  Закрыто
                                </Badge>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
