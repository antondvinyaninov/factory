"use client"

import * as React from "react"
import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { PlusIcon, LifeBuoyIcon, ClockIcon, CheckCircleIcon, XCircleIcon, AlertCircleIcon, UserIcon } from "lucide-react"

type Ticket = {
  id: string
  title: string
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
  category: { name: string }
  createdAt: string
  author: { name: string }
  assignee: { name: string } | null
  _count: { comments: number }
}

function StatusBadge({ status }: { status: Ticket["status"] }) {
  switch (status) {
    case "OPEN": return <Badge variant="outline" className="border-gray-300 text-gray-600"><AlertCircleIcon className="size-3 mr-1"/>Открыто</Badge>
    case "IN_PROGRESS": return <Badge variant="secondary" className="bg-blue-100 text-blue-700"><ClockIcon className="size-3 mr-1"/>В работе</Badge>
    case "RESOLVED": return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700"><CheckCircleIcon className="size-3 mr-1"/>Решено</Badge>
    case "CLOSED": return <Badge variant="secondary" className="bg-gray-100 text-gray-500"><XCircleIcon className="size-3 mr-1"/>Закрыто</Badge>
  }
}

export default function HelpdeskPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>([])
  const [allTickets, setAllTickets] = React.useState<Ticket[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    Promise.all([
      fetch("/api/tickets?filter=my", { credentials: "include" }).then(r => r.json()),
      fetch("/api/tickets?filter=all", { credentials: "include" }).then(r => r.json())
    ])
    .then(([myRes, allRes]) => {
      setTickets(Array.isArray(myRes) ? myRes : [])
      setAllTickets(Array.isArray(allRes) ? allRes : [])
      setLoading(false)
    })
    .catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  // Канбан колонки
  const kanbanColumns: Record<Ticket["status"], string> = {
    OPEN: "Открытые",
    IN_PROGRESS: "В работе",
    RESOLVED: "Решенные",
    CLOSED: "Закрытые"
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("ticketId", id)
  }

  const handleDrop = async (e: React.DragEvent, status: Ticket["status"]) => {
    e.preventDefault()
    const id = e.dataTransfer.getData("ticketId")
    if (!id) return

    // Optimitic update
    const updatedTickets = allTickets.map(t => t.id === id ? { ...t, status } : t)
    setAllTickets(updatedTickets)

    try {
      await fetch(`/api/tickets/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "calc(var(--spacing) * 62)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="h-svh overflow-y-auto bg-muted/20">
        <SiteHeader title="Служба поддержки" />
        
        <main className="flex-1 p-4 md:p-6 mx-auto w-full">
          <div className="flex items-center justify-between mb-6 max-w-6xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Заявки (Helpdesk)</h1>
              <p className="text-sm text-muted-foreground mt-1">Обращения в АХО и ИТ</p>
            </div>
            <Link href="/helpdesk/new">
              <Button className="rounded-xl shadow-xs gap-2">
                <PlusIcon className="size-4" />
                Создать заявку
              </Button>
            </Link>
          </div>

          <Tabs defaultValue="my" className="w-full max-w-6xl mx-auto">
            <TabsList className="mb-4">
              <TabsTrigger value="my">Мои заявки</TabsTrigger>
              <TabsTrigger value="kanban">Канбан-доска (Для исполнителей)</TabsTrigger>
            </TabsList>

            <TabsContent value="my">
              <Card className="rounded-2xl border-border/80 shadow-xs bg-background/50 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-0">
                  {loading ? (
                    <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center">
                      <span className="size-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></span>
                      Загрузка заявок...
                    </div>
                  ) : tickets.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center">
                      <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <LifeBuoyIcon className="size-8 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-1">Нет заявок</h3>
                      <p className="text-sm text-muted-foreground max-w-sm mb-6">У вас пока нет активных обращений в службу поддержки.</p>
                      <Link href="/helpdesk/new">
                        <Button variant="outline" className="rounded-xl">Создать первую заявку</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {tickets.map((ticket) => (
                        <Link key={ticket.id} href={`/helpdesk/${ticket.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/40 transition-colors gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                              <LifeBuoyIcon className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm truncate">{ticket.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                <span>{ticket.category.name}</span>
                                <span className="size-1 rounded-full bg-muted-foreground/30" />
                                <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                {ticket._count.comments > 0 && (
                                  <>
                                    <span className="size-1 rounded-full bg-muted-foreground/30" />
                                    <span>💬 {ticket._count.comments}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <StatusBadge status={ticket.status} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="kanban">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                {(Object.keys(kanbanColumns) as Array<Ticket["status"]>).map(status => (
                  <div 
                    key={status} 
                    className="flex flex-col bg-muted/40 rounded-2xl p-4 min-h-[500px]"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, status)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-sm">{kanbanColumns[status]}</h3>
                      <Badge variant="secondary" className="text-xs">{allTickets.filter(t => t.status === status).length}</Badge>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      {allTickets.filter(t => t.status === status).map(ticket => (
                        <div 
                          key={ticket.id} 
                          draggable 
                          onDragStart={(e) => handleDragStart(e, ticket.id)}
                          className="bg-background border border-border/60 rounded-xl p-3 shadow-xs cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal leading-4">{ticket.category.name.split(' ')[0]}</Badge>
                            <span className="text-[10px] text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                          </div>
                          <Link href={`/helpdesk/${ticket.id}`} className="font-medium text-sm hover:underline block mb-3 leading-tight">
                            {ticket.title}
                          </Link>
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex flex-col gap-1">
                              <span className="flex items-center gap-1"><UserIcon className="size-3"/> от: {ticket.author.name.split(' ')[0]}</span>
                              <span className="flex items-center gap-1 text-primary"><UserIcon className="size-3"/> кому: {ticket.assignee ? ticket.assignee.name.split(' ')[0] : 'Не назначен'}</span>
                            </div>
                            {ticket._count.comments > 0 && <span>💬 {ticket._count.comments}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
