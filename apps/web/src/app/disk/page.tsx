"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { DownloadIcon, Trash2Icon, UploadCloudIcon, HardDriveIcon, Loader2Icon, FileTextIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface DiskFile {
  name: string
  size: number
  url: string
  createdAt: string
}

export default function DiskPage() {
  const [files, setFiles] = React.useState<DiskFile[]>([])
  const [isUploading, setIsUploading] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const fetchFiles = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/disk/files")
      if (res.ok) {
        const data = await res.json()
        setFiles(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    fetchFiles()
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/disk/upload", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        await fetchFiles()
      } else {
        const errorData = await res.json().catch(() => null)
        alert(`Ошибка при загрузке файла: ${errorData?.message || res.statusText || 'Неизвестная ошибка'}`)
      }
    } catch (e: any) {
      console.error(e)
      alert(`Ошибка при загрузке файла: ${e.message}`)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDelete = async (filename: string) => {
    if (!confirm(`Точно удалить файл ${filename}?`)) return

    try {
      const res = await fetch(`/api/disk/${encodeURIComponent(filename)}`, {
        method: "DELETE",
      })

      if (res.ok) {
        await fetchFiles()
      } else {
        alert("Ошибка при удалении файла.")
      }
    } catch (e) {
      console.error(e)
      alert("Ошибка при удалении файла.")
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
          <SiteHeader />

          <main className="flex-1 overflow-auto bg-slate-50/50 dark:bg-zinc-950">
            <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold flex items-center gap-2">
                    <HardDriveIcon className="size-6 text-primary" />
                    Корпоративный Диск
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Хранилище общих файлов и дистрибутивов
                  </p>
                </div>
                <div>
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleUpload}
                  />
                  <Button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isUploading}
                    className="gap-2"
                  >
                    {isUploading ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <UploadCloudIcon className="size-4" />
                    )}
                    Загрузить файл
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Loader2Icon className="size-8 animate-spin mb-4" />
                      <p>Загрузка файлов...</p>
                    </div>
                  ) : files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <HardDriveIcon className="size-12 opacity-20 mb-4" />
                      <p>Диск пуст. Загрузите первый файл!</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {files.map((file) => (
                        <div key={file.name} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors">
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className="bg-primary/10 p-2 rounded-lg text-primary">
                              <FileTextIcon className="size-5" />
                            </div>
                            <div className="overflow-hidden">
                              <p className="font-medium truncate" title={file.name}>
                                {file.name}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <span>{formatSize(file.size)}</span>
                                <span>&bull;</span>
                                <span>{new Date(file.createdAt).toLocaleString('ru-RU')}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pl-4">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              render={<a href={file.url} download={file.name} target="_blank" rel="noreferrer" />}
                              title="Скачать"
                            >
                              <DownloadIcon className="size-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                              onClick={() => handleDelete(file.name)}
                              title="Удалить"
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
          <MobileBottomNav />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
