"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeftIcon, SaveIcon, UserPlusIcon, XIcon, GripVerticalIcon } from "lucide-react"

type Employee = {
  id: string
  name: string
  position?: string
}

export default function NewDocumentPage() {
  const router = useRouter()
  const [title, setTitle] = React.useState("")
  const [content, setContent] = React.useState("")
  const [routeType, setRouteType] = React.useState<"SEQUENTIAL" | "PARALLEL">("SEQUENTIAL")
  
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [selectedApprovers, setSelectedApprovers] = React.useState<Employee[]>([])
  
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    fetch("/api/users", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data)) {
          setEmployees(data)
        }
      })
      .catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim() || selectedApprovers.length === 0) return

    setLoading(true)
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          routeType,
          approvers: selectedApprovers.map(a => a.id)
        })
      })

      if (res.ok) {
        router.push("/documents")
      } else {
        const errorData = await res.json()
        alert(errorData.message || "Ошибка при создании документа")
        setLoading(false)
      }
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const handleAddApprover = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const empId = e.target.value
    if (!empId) return
    
    const emp = employees.find(x => x.id === empId)
    if (emp && !selectedApprovers.find(x => x.id === emp.id)) {
      setSelectedApprovers([...selectedApprovers, emp])
    }
    e.target.value = "" // reset select
  }

  const removeApprover = (id: string) => {
    setSelectedApprovers(selectedApprovers.filter(a => a.id !== id))
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "calc(var(--spacing) * 62)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="h-svh overflow-y-auto bg-muted/20">
        <SiteHeader title="Новая служебная записка" />
        
        <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">
          <Button variant="ghost" className="mb-4 gap-2 -ml-3 text-muted-foreground" onClick={() => router.back()}>
            <ArrowLeftIcon className="size-4" />
            Назад к списку
          </Button>

          <form onSubmit={handleSubmit}>
            <Card className="rounded-2xl border-border/80 shadow-xs bg-background/50 backdrop-blur-sm overflow-hidden mb-6">
              <CardHeader className="border-b bg-muted/10 pb-4">
                <CardTitle className="text-xl">Содержание документа</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-semibold">Заголовок</Label>
                  <Input 
                    id="title" 
                    placeholder="Например: Запрос на закупку оборудования..." 
                    value={title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                    required
                    className="rounded-xl bg-background"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="content" className="text-sm font-semibold">Текст записки</Label>
                  <Textarea 
                    id="content" 
                    placeholder="Опишите суть вопроса..." 
                    value={content}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                    required
                    className="min-h-[200px] rounded-xl bg-background resize-y"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/80 shadow-xs bg-background/50 backdrop-blur-sm overflow-hidden mb-6">
              <CardHeader className="border-b bg-muted/10 pb-4">
                <CardTitle className="text-xl">Маршрут согласования</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Тип маршрута</Label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className={`cursor-pointer flex flex-col items-start gap-2 rounded-xl border p-4 transition-all ${routeType === 'SEQUENTIAL' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/50 border-border/60'}`}>
                      <div className="flex items-center gap-2 w-full">
                        <input type="radio" name="routeType" checked={routeType === 'SEQUENTIAL'} onChange={() => setRouteType('SEQUENTIAL')} className="sr-only" />
                        <span className={`size-4 rounded-full border flex items-center justify-center ${routeType === 'SEQUENTIAL' ? 'border-primary' : 'border-muted-foreground/40'}`}>
                          {routeType === 'SEQUENTIAL' && <span className="size-2 rounded-full bg-primary" />}
                        </span>
                        <span className="font-medium text-sm">Последовательный</span>
                      </div>
                      <p className="text-xs text-muted-foreground pl-6">Документ идёт по цепочке строго по очереди от одного к другому.</p>
                    </label>
                    <label className={`cursor-pointer flex flex-col items-start gap-2 rounded-xl border p-4 transition-all ${routeType === 'PARALLEL' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/50 border-border/60'}`}>
                      <div className="flex items-center gap-2 w-full">
                        <input type="radio" name="routeType" checked={routeType === 'PARALLEL'} onChange={() => setRouteType('PARALLEL')} className="sr-only" />
                        <span className={`size-4 rounded-full border flex items-center justify-center ${routeType === 'PARALLEL' ? 'border-primary' : 'border-muted-foreground/40'}`}>
                          {routeType === 'PARALLEL' && <span className="size-2 rounded-full bg-primary" />}
                        </span>
                        <span className="font-medium text-sm">Параллельный</span>
                      </div>
                      <p className="text-xs text-muted-foreground pl-6">Все согласующие получат документ одновременно.</p>
                    </label>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border/60">
                  <Label className="text-sm font-semibold">Согласующие лица</Label>
                  
                  <div className="flex gap-2 items-center">
                    <select 
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      onChange={handleAddApprover}
                      defaultValue=""
                    >
                      <option value="" disabled>-- Выберите сотрудника --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} {emp.position ? `(${emp.position})` : ''}</option>
                      ))}
                    </select>
                  </div>

                  {selectedApprovers.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {selectedApprovers.map((approver, idx) => (
                        <div key={approver.id} className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-background shadow-xs">
                          <div className="flex items-center gap-3">
                            <div className="text-muted-foreground cursor-move flex items-center justify-center p-1">
                              {routeType === 'SEQUENTIAL' ? (
                                <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{idx + 1}</span>
                              ) : (
                                <GripVerticalIcon className="size-4" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{approver.name}</p>
                              {approver.position && <p className="text-xs text-muted-foreground">{approver.position}</p>}
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => removeApprover(approver.id)}>
                            <XIcon className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedApprovers.length === 0 && (
                    <div className="p-6 text-center border border-dashed rounded-xl border-border bg-muted/20">
                      <p className="text-sm text-muted-foreground">Добавьте хотя бы одного согласующего</p>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => router.back()}>Отмена</Button>
              <Button 
                type="submit" 
                className="rounded-xl gap-2" 
                disabled={loading || !title.trim() || !content.trim() || selectedApprovers.length === 0}
              >
                {loading ? <span className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span> : <SaveIcon className="size-4" />}
                Запустить маршрут
              </Button>
            </div>
          </form>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
