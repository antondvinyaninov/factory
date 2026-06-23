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
import { PlusIcon, FileTextIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from "lucide-react"

type Document = {
  id: string
  title: string
  status: "DRAFT" | "IN_PROGRESS" | "APPROVED" | "REJECTED"
  routeType: "SEQUENTIAL" | "PARALLEL"
  createdAt: string
  author: { name: string }
}

function StatusBadge({ status }: { status: Document["status"] }) {
  switch (status) {
    case "DRAFT": return <Badge variant="outline">Черновик</Badge>
    case "IN_PROGRESS": return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"><ClockIcon className="size-3 mr-1"/>На согласовании</Badge>
    case "APPROVED": return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"><CheckCircleIcon className="size-3 mr-1"/>Утверждён</Badge>
    case "REJECTED": return <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"><XCircleIcon className="size-3 mr-1"/>Отклонён</Badge>
  }
}

export default function DocumentsPage() {
  const [documents, setDocuments] = React.useState<Document[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch("/api/documents", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        setDocuments(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "calc(var(--spacing) * 62)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="h-svh overflow-y-auto bg-muted/20">
        <SiteHeader title="Документооборот" />
        
        <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Служебные записки</h1>
              <p className="text-sm text-muted-foreground mt-1">Создание и согласование внутренних документов</p>
            </div>
            <Link href="/documents/new">
              <Button className="rounded-xl shadow-xs gap-2">
                <PlusIcon className="size-4" />
                Создать записку
              </Button>
            </Link>
          </div>

          <Card className="rounded-2xl border-border/80 shadow-xs bg-background/50 backdrop-blur-sm overflow-hidden">
            <Tabs defaultValue="all" className="w-full">
              <div className="border-b px-4 pt-2">
                <TabsList className="bg-transparent border-b-0">
                  <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4">Все документы</TabsTrigger>
                  <TabsTrigger value="need_action" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4">Ждут моего решения</TabsTrigger>
                </TabsList>
              </div>

              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center">
                    <span className="size-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></span>
                    Загрузка документов...
                  </div>
                ) : documents.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center">
                    <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <FileTextIcon className="size-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-1">Нет документов</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-6">Вы еще не создавали служебных записок и вам не поступало документов на подпись.</p>
                    <Link href="/documents/new">
                      <Button variant="outline" className="rounded-xl">Создать первую записку</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {documents.map((doc) => (
                      <Link key={doc.id} href={`/documents/${doc.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/40 transition-colors gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                            <FileTextIcon className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm truncate">{doc.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                              <span>Автор: {doc.author.name}</span>
                              <span className="size-1 rounded-full bg-muted-foreground/30" />
                              <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-13 sm:ml-0">
                          <StatusBadge status={doc.status} />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Tabs>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
