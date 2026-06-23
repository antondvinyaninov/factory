"use client"

import * as React from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  EllipsisVerticalIcon,
  HeartIcon,
  MessageCircleIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  typographyStyles,
  TypographyMuted,
  TypographyProse,
} from "@/components/ui/typography"
import type { NewsPost, NewsComment, NewsAttachment } from "@/types/news"
import { NewsAttachments, AttachmentPreviewSheet } from "./news-attachments"

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

function addCommentToPost(
  item: NewsPost,
  comment: NewsComment,
  parentCommentId?: string,
) {
  if (!parentCommentId) {
    return {
      ...item,
      comments: [...(item.comments ?? []), comment],
      commentsCount: (item.commentsCount ?? 0) + 1,
    }
  }

  return {
    ...item,
    comments: (item.comments ?? []).map((rootComment) =>
      rootComment.id === parentCommentId
        ? {
            ...rootComment,
            replies: [...(rootComment.replies ?? []), comment],
          }
        : rootComment,
    ),
    commentsCount: (item.commentsCount ?? 0) + 1,
  }
}

function replaceCommentInPost(
  item: NewsPost,
  commentId: string,
  nextComment: NewsComment,
) {
  return {
    ...item,
    comments: (item.comments ?? []).map((rootComment) => {
      if (rootComment.id === commentId) {
        return nextComment
      }

      return {
        ...rootComment,
        replies: (rootComment.replies ?? []).map((reply) =>
          reply.id === commentId ? nextComment : reply,
        ),
      }
    }),
  }
}

function removeCommentFromPost(item: NewsPost, commentId: string) {
  return {
    ...item,
    comments: (item.comments ?? [])
      .filter((rootComment) => rootComment.id !== commentId)
      .map((rootComment) => ({
        ...rootComment,
        replies: (rootComment.replies ?? []).filter(
          (reply) => reply.id !== commentId,
        ),
      })),
    commentsCount: Math.max(0, (item.commentsCount ?? 1) - 1),
  }
}

export function NewsPostCard({
  initialItem,
  currentUser,
  onDelete,
}: {
  initialItem: NewsPost
  currentUser: { id: string; name: string; email: string } | null
  onDelete?: (id: string) => void
}) {
  const [item, setItem] = React.useState<NewsPost>(initialItem)
  const [isEditing, setIsEditing] = React.useState(false)
  const [editingTitle, setEditingTitle] = React.useState("")
  const [editingContent, setEditingContent] = React.useState("")
  const [savingId, setSavingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState("")
  const [isCommentsExpanded, setIsCommentsExpanded] = React.useState(false)
  const [replyingToCommentId, setReplyingToCommentId] = React.useState<string | null>(null)
  const [commentingId, setCommentingId] = React.useState<string | null>(null)
  const [pendingLike, setPendingLike] = React.useState(false)
  const [previewAttachment, setPreviewAttachment] = React.useState<NewsAttachment | null>(null)

  React.useEffect(() => {
    setItem(initialItem)
  }, [initialItem])

  const isAuthor = item.author.id === currentUser?.id
  const attachments = item.attachments ?? []
  const comments = item.comments ?? []
  const visibleComments = isCommentsExpanded ? comments : comments.slice(-3)

  function startEditing() {
    setError("")
    setIsEditing(true)
    setEditingTitle(item.title)
    setEditingContent(item.content)
  }

  function cancelEditing() {
    setIsEditing(false)
    setEditingTitle("")
    setEditingContent("")
  }

  async function handleUpdate() {
    setError("")
    setSavingId(item.id)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/news/${item.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: editingTitle,
            content: editingContent,
          }),
        },
      )

      if (!response.ok) {
        setError("Не удалось сохранить новость")
        return
      }

      const payload = (await response.json()) as { item: NewsPost }

      cancelEditing()
      setItem((prev) => ({
        ...prev,
        ...payload.item,
        comments: prev.comments,
        commentsCount: prev.commentsCount,
        likedByMe: prev.likedByMe,
        likesCount: prev.likesCount,
      }))
    } catch {
      setError("Не удалось подключиться к API")
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete() {
    if (!window.confirm("Удалить эту новость?")) {
      return
    }

    setError("")
    setDeletingId(item.id)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/news/${item.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      )

      if (!response.ok) {
        setError("Не удалось удалить новость")
        return
      }

      if (isEditing) {
        cancelEditing()
      }

      onDelete?.(item.id)
    } catch {
      setError("Не удалось подключиться к API")
    } finally {
      setDeletingId(null)
    }
  }

  async function handleToggleLike() {
    if (pendingLike) {
      return
    }

    setPendingLike(true)
    setError("")

    const likedByMe = !item.likedByMe
    
    // Optimistic update
    const previousItem = { ...item }
    setItem((prev) => ({
      ...prev,
      likedByMe,
      likesCount: Math.max(0, (prev.likesCount ?? 0) + (likedByMe ? 1 : -1)),
    }))

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/news/${item.id}/like`,
        {
          method: "POST",
          credentials: "include",
        },
      )

      if (!response.ok) {
        setItem(previousItem)
        setError("Не удалось обновить лайк")
        return
      }

      const payload = (await response.json()) as {
        liked: boolean
        likesCount: number
      }

      setItem((prev) => ({
        ...prev,
        likedByMe: payload.liked,
        likesCount: payload.likesCount,
      }))
    } catch {
      setItem(previousItem)
      setError("Не удалось подключиться к API")
    } finally {
      setPendingLike(false)
    }
  }

  async function handleCreateComment(
    event: React.FormEvent<HTMLFormElement>,
    parentCommentId?: string,
  ) {
    event.preventDefault()
    setError("")
    setCommentingId(parentCommentId ?? item.id)

    const form = event.currentTarget
    const formData = new FormData(form)
    const content = String(formData.get("content") ?? "").trim()
    const targetParentCommentId =
      parentCommentId || String(formData.get("parentId") ?? "").trim() || undefined

    if (!content) {
      setCommentingId(null)
      return
    }

    const optimisticComment: NewsComment = {
      id: `pending-${Date.now()}`,
      content,
      parentId: targetParentCommentId ?? null,
      createdAt: new Date().toISOString(),
      author: currentUser ?? {
        id: "current-user",
        name: "Вы",
        email: "",
      },
      replies: [],
    }

    form.reset()
    setReplyingToCommentId(null)

    setItem((prev) => addCommentToPost(prev, optimisticComment, targetParentCommentId))

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/news/${item.id}/comments`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            parentId: targetParentCommentId,
          }),
        },
      )

      if (!response.ok) {
        setItem((prev) => removeCommentFromPost(prev, optimisticComment.id))
        setError("Не удалось добавить комментарий")
        return
      }

      const payload = (await response.json()) as { comment: NewsComment }

      setItem((prev) => replaceCommentInPost(prev, optimisticComment.id, payload.comment))
    } catch {
      setItem((prev) => removeCommentFromPost(prev, optimisticComment.id))
      setError("Не удалось подключиться к API")
    } finally {
      setCommentingId(null)
    }
  }

  return (
    <>
      <AttachmentPreviewSheet
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
      <Card key={item.id} id={`post-${item.id}`}>
        <CardHeader className="gap-4">
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/employees/${item.author.id}`}
              className="flex min-w-0 items-center gap-3 rounded-xl transition-opacity hover:opacity-80"
            >
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
                <div className="truncate text-sm font-medium">
                  {item.author.name || item.author.email}
                </div>
                <CardDescription className={typographyStyles.muted}>
                  {dateFormatter.format(
                    new Date(item.publishedAt ?? item.createdAt),
                  )}
                </CardDescription>
              </div>
            </Link>
            {isAuthor ? (
              <div className="flex shrink-0 items-center gap-2">
                {isEditing ? (
                  <Button type="button" variant="ghost" onClick={cancelEditing}>
                    Отмена
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground data-open:bg-muted"
                        />
                      }
                    >
                      <EllipsisVerticalIcon />
                      <span className="sr-only">Действия с новостью</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={startEditing}>
                        <PencilIcon />
                        <span>Редактировать</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={deletingId === item.id}
                        onClick={handleDelete}
                      >
                        <TrashIcon />
                        <span>{deletingId === item.id ? "Удаляем..." : "Удалить"}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {attachments.length > 0 ? (
            <NewsAttachments
              attachments={attachments}
              onOpenAttachment={setPreviewAttachment}
            />
          ) : null}
          {isEditing ? (
            <div className="flex flex-col gap-3">
              <Input
                value={editingTitle}
                minLength={3}
                onChange={(event) => setEditingTitle(event.target.value)}
              />
              <textarea
                value={editingContent}
                minLength={10}
                className="min-h-32 resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                onChange={(event) => setEditingContent(event.target.value)}
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  disabled={savingId === item.id}
                  onClick={handleUpdate}
                >
                  {savingId === item.id ? "Сохраняем..." : "Сохранить"}
                </Button>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              <CardTitle className={typographyStyles.h3}>{item.title}</CardTitle>
              <TypographyProse>{item.content}</TypographyProse>
            </div>
          )}
          <div className="grid gap-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "gap-2 rounded-full",
                  item.likedByMe &&
                    "border-red-500 bg-red-500 text-white hover:bg-red-600 hover:text-white",
                )}
                onClick={handleToggleLike}
              >
                <HeartIcon
                  className={cn("size-4", item.likedByMe && "fill-current")}
                />
                {item.likesCount ?? 0}
              </Button>
              <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm text-muted-foreground">
                <MessageCircleIcon className="size-4" />
                {item.commentsCount ?? comments.length}
              </div>
            </div>

            {comments.length > 0 ? (
              <div className="grid gap-3">
                {comments.length > visibleComments.length ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-start px-0 text-muted-foreground"
                    onClick={() => setIsCommentsExpanded(true)}
                  >
                    Показать все комментарии ({comments.length})
                  </Button>
                ) : null}
                {visibleComments.map((comment) => (
                  <div key={comment.id} className="grid gap-3 rounded-xl bg-muted/35 p-3">
                    <div className="flex gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(comment.author.name, comment.author.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-medium">
                            {comment.author.name || comment.author.email}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {dateFormatter.format(new Date(comment.createdAt))}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                          {comment.content}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="mt-1 px-0 text-muted-foreground"
                          onClick={() => setReplyingToCommentId(comment.id)}
                        >
                          Ответить
                        </Button>
                      </div>
                    </div>
                    {(comment.replies?.length ?? 0) > 0 ||
                    replyingToCommentId === comment.id ? (
                      <div className="relative ml-5 grid gap-3 pl-9">
                        <div className="absolute bottom-0 left-2 top-1 w-4 rounded-full bg-muted" />
                        {(comment.replies?.length ?? 0) > 0 ? (
                          <TypographyMuted className="relative text-xs">
                            {comment.author.name || comment.author.email} ответил ·{" "}
                            {comment.replies?.length} ответов
                          </TypographyMuted>
                        ) : null}
                        {comment.replies?.map((reply) => (
                          <div key={reply.id} className="relative flex gap-2">
                            <Avatar className="size-7">
                              <AvatarFallback className="text-[10px]">
                                {getInitials(reply.author.name, reply.author.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="text-sm font-medium">
                                  {reply.author.name || reply.author.email}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {dateFormatter.format(new Date(reply.createdAt))}
                                </span>
                              </div>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                                {reply.content}
                              </p>
                            </div>
                          </div>
                        ))}
                        {replyingToCommentId === comment.id ? (
                          <form
                            className="relative grid gap-2 rounded-xl bg-background/80 p-3"
                            onSubmit={(event) => handleCreateComment(event, comment.id)}
                          >
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>ответ</span>
                              <span className="font-medium text-primary">
                                {comment.author.name || comment.author.email}
                              </span>
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => setReplyingToCommentId(null)}
                              >
                                ×
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <input type="hidden" name="parentId" value={comment.id} />
                              <Input
                                name="content"
                                placeholder="Написать ответ"
                                minLength={1}
                                maxLength={1000}
                                defaultValue={`${
                                  comment.author.name || comment.author.email
                                }, `}
                                disabled={commentingId === comment.id}
                              />
                              <Button
                                type="submit"
                                size="sm"
                                disabled={commentingId === comment.id}
                              >
                                Ответить
                              </Button>
                            </div>
                          </form>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            <form
              className="flex items-center gap-3"
              onSubmit={(event) => handleCreateComment(event)}
            >
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">
                  {getInitials(currentUser?.name ?? "", currentUser?.email ?? "")}
                </AvatarFallback>
              </Avatar>
              <Input
                name="content"
                placeholder="Написать комментарий..."
                className="flex-1 rounded-full bg-muted/50 px-4"
                disabled={commentingId === item.id}
              />
            </form>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
