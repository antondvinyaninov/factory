"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

type NewsPost = {
  id: string
  title: string
  content: string
  publishedAt: string | null
  createdAt: string
  author: {
    name: string
    email: string
    avatar?: string
  }
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function getInitials(name: string, email: string) {
  const source = name || email
  const parts = source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

export default function NewsPage() {
  const [items, setItems] = React.useState<NewsPost[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [error, setError] = React.useState("")

  const loadNews = React.useCallback(async () => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/news`,
        {
          credentials: "include",
        },
      )

      if (!response.ok) {
        setError("Не удалось загрузить новости")
        return
      }

      const payload = (await response.json()) as { items?: NewsPost[] }
      setItems(payload.items ?? [])
    } catch {
      setError("Не удалось подключиться к API")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadNews()
  }, [loadNews])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsPublishing(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/news`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: String(formData.get("title") ?? ""),
            content: String(formData.get("content") ?? ""),
          }),
        },
      )

      if (!response.ok) {
        setError("Не удалось опубликовать новость")
        return
      }

      form.reset()
      await loadNews()
    } catch {
      setError("Не удалось подключиться к API")
    } finally {
      setIsPublishing(false)
    }
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
      <SidebarInset>
        <SiteHeader title="Новости" />
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <Card>
            <CardHeader>
              <CardTitle>Опубликовать новость</CardTitle>
              <CardDescription>
                Создайте объявление для сотрудников портала.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <Input
                  name="title"
                  placeholder="Заголовок новости"
                  minLength={3}
                  required
                />
                <textarea
                  name="content"
                  placeholder="Текст новости"
                  minLength={10}
                  required
                  className="min-h-32 resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={isPublishing}>
                    {isPublishing ? "Публикуем..." : "Опубликовать"}
                  </Button>
                  {error ? (
                    <p className="text-sm text-destructive">{error}</p>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-semibold">Лента новостей</h2>
              <p className="text-sm text-muted-foreground">
                Последние опубликованные объявления и сообщения.
              </p>
            </div>

            {isLoading ? (
              <Card>
                <CardContent className="text-muted-foreground">
                  Загружаем новости...
                </CardContent>
              </Card>
            ) : null}

            {!isLoading && items.length === 0 ? (
              <Card>
                <CardContent className="text-muted-foreground">
                  Новостей пока нет. Опубликуйте первую запись.
                </CardContent>
              </Card>
            ) : null}

            {items.map((item) => (
              <Card key={item.id}>
                <CardHeader className="gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar size="lg">
                      {item.author.avatar ? (
                        <AvatarImage
                          src={item.author.avatar}
                          alt={item.author.name || item.author.email}
                        />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 font-medium text-primary">
                        {getInitials(item.author.name, item.author.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {item.author.name || item.author.email}
                      </div>
                      <CardDescription>
                        {dateFormatter.format(
                          new Date(item.publishedAt ?? item.createdAt),
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap leading-7">{item.content}</p>
                </CardContent>
              </Card>
            ))}
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
