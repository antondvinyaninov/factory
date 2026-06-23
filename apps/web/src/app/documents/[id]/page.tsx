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
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, ClockIcon, FileTextIcon, UserIcon } from "lucide-react"
import { getCurrentUserCached } from "@/lib/auth-client"

type Document = {
  id: string
  title: string
  content: string
  status: "DRAFT" | "IN_PROGRESS" | "APPROVED" | "REJECTED"
  routeType: "SEQUENTIAL" | "PARALLEL"
  createdAt: string
  author: { id: string, name: string }
  approvalRoute: Array<{
    id: string
    order: number
    status: "PENDING" | "APPROVED" | "REJECTED"
    comment?: string
    decidedAt?: string
    user: { id: string, name: string }
  }>
}

function StatusBadge({ status }: { status: Document["status"] }) {
  switch (status) {
    case "DRAFT": return <Badge variant="outline">Черновик</Badge>
    case "IN_PROGRESS": return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"><ClockIcon className="size-3 mr-1"/>На согласовании</Badge>
    case "APPROVED": return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"><CheckCircleIcon className="size-3 mr-1"/>Утверждён</Badge>
    case "REJECTED": return <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"><XCircleIcon className="size-3 mr-1"/>Отклонён</Badge>
  }
}

export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [doc, setDoc] = React.useState<Document | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [actionLoading, setActionLoading] = React.useState(false)
  const [comment, setComment] = React.useState("")
  const [currentUserId, setCurrentUserId] = React.useState<string>("")

  React.useEffect(() => {
    getCurrentUserCached().then(u => { if (u) setCurrentUserId(u.id) })
    
    fetch(`/api/documents/${params.id}`, { credentials: "include" })
      .then(res => {
        if (!res.ok) throw new Error("Not found")
        return res.json()
      })
      .then(data => {
        setDoc(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        router.push("/documents")
      })
  }, [params.id, router])

  const handleAction = async (type: "approve" | "reject") => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/documents/${doc?.id}/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment })
      })

      if (res.ok) {
        const updated = await res.json()
        setDoc(updated)
        setComment("")
      } else {
        const errData = await res.json()
        alert(errData.message || "Ошибка при выполнении действия")
      }
    } catch (err) {
      console.error(err)
      alert("Не удалось отправить запрос")
    } finally {
      setActionLoading(false)
    }
  }

  if (loading || !doc) {
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

  const myRouteItem = doc.approvalRoute.find(a => a.user.id === currentUserId)
  const isMyTurn = (() => {
    if (doc.status !== "IN_PROGRESS") return false
    if (!myRouteItem || myRouteItem.status !== "PENDING") return false
    if (doc.routeType === "PARALLEL") return true
    
    // Sequential logic: Check if all items before me are approved
    const previousPending = doc.approvalRoute.find(a => a.order < myRouteItem.order && a.status === "PENDING")
    return !previousPending
  })()

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "calc(var(--spacing) * 62)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="h-svh overflow-y-auto bg-muted/20">
        <SiteHeader title="Документооборот" />
        
        <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">
          <Button variant="ghost" className="mb-4 gap-2 -ml-3 text-muted-foreground" onClick={() => router.push("/documents")}>
            <ArrowLeftIcon className="size-4" />
            Назад к списку
          </Button>

          <div className="flex flex-col lg:flex-row gap-6 items-start">
            
            {/* Левая колонка - Содержание */}
            <div className="w-full lg:flex-1 space-y-6">
              <Card className="rounded-2xl border-border/80 shadow-xs bg-background/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="border-b bg-muted/10 pb-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileTextIcon className="size-5" />
                      </div>
                      <div>
                        <CardTitle className="text-xl leading-tight">{doc.title}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          Создано {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/60">
                    <UserIcon className="size-4" />
                    <span>Отправитель: <span className="font-medium text-foreground">{doc.author.name}</span></span>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {doc.content}
                  </div>
                </CardContent>
              </Card>

              {/* Блок действий, если моя очередь */}
              {isMyTurn && (
                <Card className="rounded-2xl border-primary/30 shadow-md bg-background overflow-hidden ring-1 ring-primary/20">
                  <CardHeader className="border-b bg-primary/5 pb-4">
                    <CardTitle className="text-base text-primary">Ваше решение</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Комментарий (необязательно)</label>
                      <Textarea 
                        placeholder="Укажите замечания или комментарий к решению..." 
                        value={comment}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
                        className="min-h-[80px] rounded-xl bg-background"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => handleAction("approve")} 
                        disabled={actionLoading}
                        className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs"
                      >
                        <CheckCircleIcon className="size-4" />
                        Согласовать
                      </Button>
                      <Button 
                        onClick={() => handleAction("reject")} 
                        disabled={actionLoading}
                        variant="destructive"
                        className="flex-1 rounded-xl gap-2 shadow-xs"
                      >
                        <XCircleIcon className="size-4" />
                        Отклонить
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Правая колонка - Маршрут */}
            <div className="w-full lg:w-80 shrink-0">
              <Card className="rounded-2xl border-border/80 shadow-xs bg-background/50 backdrop-blur-sm overflow-hidden sticky top-6">
                <CardHeader className="border-b bg-muted/10 pb-4">
                  <CardTitle className="text-base flex items-center justify-between">
                    Маршрут
                    <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
                      {doc.routeType === "SEQUENTIAL" ? "Последовательный" : "Параллельный"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="relative border-l-2 border-muted ml-3 space-y-6 pb-2">
                    {doc.approvalRoute.map((item, idx) => {
                      const isLast = idx === doc.approvalRoute.length - 1
                      return (
                        <div key={item.id} className="relative pl-6">
                          <span className={`absolute -left-[9px] top-1 size-4 rounded-full border-2 border-background flex items-center justify-center 
                            ${item.status === 'APPROVED' ? 'bg-emerald-500' : item.status === 'REJECTED' ? 'bg-red-500' : 'bg-muted-foreground/30'}`}
                          >
                            {item.status === 'APPROVED' && <CheckCircleIcon className="size-3 text-white" />}
                            {item.status === 'REJECTED' && <XCircleIcon className="size-3 text-white" />}
                          </span>
                          
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-sm">{item.user.name}</span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {item.status === 'PENDING' && "Ожидает"}
                              {item.status === 'APPROVED' && <span className="text-emerald-600 dark:text-emerald-400">Согласовано</span>}
                              {item.status === 'REJECTED' && <span className="text-red-600 dark:text-red-400">Отклонено</span>}
                            </span>
                            
                            {item.decidedAt && (
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(item.decidedAt).toLocaleString()}
                              </span>
                            )}
                            
                            {item.comment && (
                              <div className="mt-2 text-xs bg-muted/50 p-2.5 rounded-lg border border-border/60 text-muted-foreground italic relative">
                                <div className="absolute -top-1.5 left-3 size-3 bg-muted/50 border-t border-l border-border/60 rotate-45" />
                                {item.comment}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
