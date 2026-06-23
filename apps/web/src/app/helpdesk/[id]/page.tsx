"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, ClockIcon, AlertCircleIcon, UserIcon, SendIcon, UserPlusIcon } from "lucide-react"
import { getCurrentUserCached } from "@/lib/auth-client"

type Ticket = {
  id: string
  title: string
  description: string
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
  category: { name: string }
  createdAt: string
  author: { id: string, name: string }
  assignee: { id: string, name: string } | null
  comments: Array<{
    id: string
    content: string
    createdAt: string
    author: { id: string, name: string }
  }>
}

function StatusBadge({ status }: { status: Ticket["status"] }) {
  switch (status) {
    case "OPEN": return <Badge variant="outline" className="border-gray-300 text-gray-600"><AlertCircleIcon className="size-3 mr-1"/>Открыто</Badge>
    case "IN_PROGRESS": return <Badge variant="secondary" className="bg-blue-100 text-blue-700"><ClockIcon className="size-3 mr-1"/>В работе</Badge>
    case "RESOLVED": return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700"><CheckCircleIcon className="size-3 mr-1"/>Решено</Badge>
    case "CLOSED": return <Badge variant="secondary" className="bg-gray-100 text-gray-500"><XCircleIcon className="size-3 mr-1"/>Закрыто</Badge>
  }
}

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [ticket, setTicket] = React.useState<Ticket | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [comment, setComment] = React.useState("")
  const [actionLoading, setActionLoading] = React.useState(false)
  const [currentUserId, setCurrentUserId] = React.useState<string>("")
  const [currentUserRole, setCurrentUserRole] = React.useState<string>("")

  const loadTicket = React.useCallback(() => {
    fetch(`/api/tickets/${params.id}`, { credentials: "include" })
      .then(res => {
        if (!res.ok) throw new Error("Not found")
        return res.json()
      })
      .then(data => {
        setTicket(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        router.push("/helpdesk")
      })
  }, [params.id, router])

  React.useEffect(() => {
    getCurrentUserCached().then(u => { 
      if (u) {
        setCurrentUserId(u.id)
        setCurrentUserRole(u.role) // Assuming role is available, otherwise checking if they are not the author
      }
    })
    loadTicket()
  }, [loadTicket])

  const handleStatusChange = async (status: Ticket["status"], assigneeId?: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/tickets/${ticket?.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, assigneeId })
      })

      if (res.ok) {
        loadTicket()
      } else {
        alert("Ошибка при изменении статуса")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!comment.trim()) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/tickets/${ticket?.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment })
      })

      if (res.ok) {
        setComment("")
        loadTicket()
      } else {
        alert("Ошибка при добавлении комментария")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading || !ticket) {
    return (
      <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 62)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
        <AppSidebar variant="inset" />
        <SidebarInset className="h-svh bg-muted/20">
          <SiteHeader title="Загрузка..." />
          <div className="flex-1 flex items-center justify-center">
            <span className="size-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></span>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  const isAuthor = ticket.author.id === currentUserId
  const isAssignee = ticket.assignee?.id === currentUserId
  const canTakeWork = !isAuthor && !ticket.assignee

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "calc(var(--spacing) * 62)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="h-svh overflow-y-auto bg-muted/20 flex flex-col">
        <SiteHeader title="Служба поддержки" />
        
        <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full flex flex-col h-full">
          <Button variant="ghost" className="mb-4 gap-2 -ml-3 text-muted-foreground w-fit shrink-0" onClick={() => router.push("/helpdesk")}>
            <ArrowLeftIcon className="size-4" />
            Назад к списку
          </Button>

          <div className="flex flex-col lg:flex-row gap-6 items-start flex-1 min-h-0">
            
            {/* Левая колонка - Содержание */}
            <div className="w-full lg:flex-[2] space-y-6 flex flex-col">
              <Card className="rounded-2xl border-border/80 shadow-xs bg-background/50 backdrop-blur-sm overflow-hidden shrink-0">
                <CardHeader className="border-b bg-muted/10 pb-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="w-fit mb-1">{ticket.category.name}</Badge>
                      <CardTitle className="text-xl leading-tight">{ticket.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Создано {new Date(ticket.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4 mb-6 bg-muted/30 p-3 rounded-xl border border-border/60 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UserIcon className="size-4" />
                      <span>Автор: <span className="font-medium text-foreground">{ticket.author.name}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UserIcon className="size-4 text-primary" />
                      <span>Исполнитель: <span className="font-medium text-foreground">{ticket.assignee ? ticket.assignee.name : "Не назначен"}</span></span>
                    </div>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {ticket.description}
                  </div>
                </CardContent>
              </Card>

              {/* Действия */}
              <div className="flex flex-wrap gap-3 shrink-0">
                {canTakeWork && (
                  <Button onClick={() => handleStatusChange("IN_PROGRESS", currentUserId)} disabled={actionLoading} className="rounded-xl gap-2">
                    <UserPlusIcon className="size-4"/> Взять в работу
                  </Button>
                )}
                {isAssignee && ticket.status === "IN_PROGRESS" && (
                  <Button onClick={() => handleStatusChange("RESOLVED")} disabled={actionLoading} className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <CheckCircleIcon className="size-4"/> Отметить как решено
                  </Button>
                )}
                {isAuthor && ticket.status === "RESOLVED" && (
                  <Button onClick={() => handleStatusChange("CLOSED")} disabled={actionLoading} variant="outline" className="rounded-xl gap-2">
                    <XCircleIcon className="size-4"/> Закрыть заявку окончательно
                  </Button>
                )}
              </div>
            </div>

            {/* Правая колонка - Чат */}
            <div className="w-full lg:flex-[1.5] flex flex-col h-full min-h-[500px]">
              <Card className="rounded-2xl border-border/80 shadow-xs bg-background overflow-hidden flex flex-col h-full">
                <CardHeader className="border-b bg-muted/10 py-3 px-4 shrink-0">
                  <CardTitle className="text-base">Комментарии и обсуждение</CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col overflow-hidden relative">
                  
                  {/* Список сообщений */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {ticket.comments.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        Нет комментариев. Задайте вопрос или уточните детали.
                      </div>
                    ) : (
                      ticket.comments.map(c => {
                        const isMe = c.author.id === currentUserId
                        return (
                          <div key={c.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <span className="text-[10px] text-muted-foreground mb-1 px-1">
                              {c.author.name} • {new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                              {c.content}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Форма отправки */}
                  {ticket.status !== "CLOSED" && (
                    <div className="p-3 bg-muted/30 border-t shrink-0 flex gap-2">
                      <Textarea 
                        placeholder="Напишите комментарий..." 
                        value={comment}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
                        className="min-h-[40px] h-[40px] max-h-[120px] rounded-xl bg-background resize-y py-2.5"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment();
                          }
                        }}
                      />
                      <Button 
                        size="icon" 
                        className="rounded-xl shrink-0 h-[40px] w-[40px]" 
                        disabled={!comment.trim() || actionLoading}
                        onClick={handleAddComment}
                      >
                        <SendIcon className="size-4" />
                      </Button>
                    </div>
                  )}

                </CardContent>
              </Card>
            </div>

          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
