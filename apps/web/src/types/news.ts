export type NewsAttachment = {
  id: string
  name: string
  mimeType: string
  size: number
  url: string
  kind: "image" | "video" | "document"
}

export type NewsComment = {
  id: string
  content: string
  parentId?: string | null
  createdAt: string
  author: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  replies?: NewsComment[]
}

export type NewsPost = {
  id: string
  title: string
  content: string
  isImportant?: boolean
  likesCount?: number
  likedByMe?: boolean
  commentsCount?: number
  comments?: NewsComment[]
  attachments?: NewsAttachment[]
  publishedAt: string | null
  createdAt: string
  author: {
    id: string
    name: string
    email: string
    avatar?: string
  }
}

export type SelectedNewsFile = {
  id: string
  file: File
  kind: NewsAttachment["kind"]
  previewUrl: string | null
}

export type CurrentUser = {
  id: string
  name: string
  email: string
}
