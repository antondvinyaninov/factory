"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeftIcon, SendIcon } from "lucide-react"

type Category = { id: string, name: string, description: string | null }

export default function NewTicketPage() {
  const router = useRouter()
  const [categories, setCategories] = React.useState<Category[]>([])
  
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [categoryId, setCategoryId] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    fetch("/api/tickets/categories", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data)
          if (data.length > 0) setCategoryId(data[0].id)
        } else {
          setCategories([])
        }
      })
      .catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !categoryId) return

    setLoading(true)
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, categoryId })
      })

      if (res.ok) {
        router.push("/helpdesk")
      } else {
        const errorData = await res.json()
        alert(errorData.message || "Ошибка при создании заявки")
        setLoading(false)
      }
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "calc(var(--spacing) * 62)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="h-svh overflow-y-auto bg-muted/20">
        <SiteHeader title="Новая заявка" />
        
        <main className="flex-1 p-4 md:p-6 max-w-3xl mx-auto w-full">
          <Button variant="ghost" className="mb-4 gap-2 -ml-3 text-muted-foreground" onClick={() => router.back()}>
            <ArrowLeftIcon className="size-4" />
            Назад
          </Button>

          <form onSubmit={handleSubmit}>
            <Card className="rounded-2xl border-border/80 shadow-xs bg-background/50 backdrop-blur-sm overflow-hidden mb-6">
              <CardHeader className="border-b bg-muted/10 pb-4">
                <CardTitle className="text-xl">Опишите вашу проблему</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Категория</Label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {categories.map(cat => (
                      <label key={cat.id} className={`cursor-pointer flex flex-col items-start gap-2 rounded-xl border p-4 transition-all ${categoryId === cat.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/50 border-border/60'}`}>
                        <div className="flex items-center gap-2 w-full">
                          <input type="radio" name="categoryId" checked={categoryId === cat.id} onChange={() => setCategoryId(cat.id)} className="sr-only" />
                          <span className={`size-4 rounded-full border flex items-center justify-center shrink-0 ${categoryId === cat.id ? 'border-primary' : 'border-muted-foreground/40'}`}>
                            {categoryId === cat.id && <span className="size-2 rounded-full bg-primary" />}
                          </span>
                          <span className="font-medium text-sm leading-tight">{cat.name}</span>
                        </div>
                        {cat.description && <p className="text-xs text-muted-foreground pl-6">{cat.description}</p>}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-border/60">
                  <Label htmlFor="title" className="text-sm font-semibold">Суть проблемы (Кратко)</Label>
                  <Input 
                    id="title" 
                    placeholder="Например: Перегорела лампа в кабинете 204" 
                    value={title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                    required
                    className="rounded-xl bg-background"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold">Подробности</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Опишите детали..." 
                    value={description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                    required
                    className="min-h-[150px] rounded-xl bg-background resize-y"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => router.back()}>Отмена</Button>
              <Button 
                type="submit" 
                className="rounded-xl gap-2" 
                disabled={loading || !title.trim() || !description.trim() || !categoryId}
              >
                {loading ? <span className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span> : <SendIcon className="size-4" />}
                Отправить заявку
              </Button>
            </div>
          </form>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
