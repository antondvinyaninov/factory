import * as React from "react"
import Image from "next/image"
import {
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  TypographyMuted,
  TypographySmall,
} from "@/components/ui/typography"
import type { NewsAttachment, NewsPost } from "@/types/news"

export function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} КБ`
  }
  return `${(size / 1024 / 1024).toFixed(1)} МБ`
}

export function canPreviewDocument(attachment: NewsAttachment) {
  return (
    attachment.mimeType === "application/pdf" ||
    attachment.mimeType.startsWith("text/")
  )
}

export function newsPostHasAttachmentKind(
  item: NewsPost,
  kind: NewsAttachment["kind"],
) {
  return item.attachments?.some((attachment) => attachment.kind === kind) ?? false
}

export function AttachmentPreviewSheet({
  attachment,
  onClose,
}: {
  attachment: NewsAttachment | null
  onClose: () => void
}) {
  return (
    <Sheet open={Boolean(attachment)} onOpenChange={(open) => !open && onClose()}>
      {attachment ? (
        <SheetContent
          side="right"
          className="!w-[min(1120px,calc(100vw-1rem))] !max-w-none gap-0 overflow-hidden p-0"
        >
          <SheetHeader className="border-b pr-12">
            <SheetTitle className="truncate">{attachment.name}</SheetTitle>
            <SheetDescription>
              {formatFileSize(attachment.size)}
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-muted/30 p-4">
            {attachment.kind === "image" ? (
              <Image
                src={attachment.url}
                alt={attachment.name}
                width={1600}
                height={1000}
                unoptimized
                className="max-h-[calc(100vh-11rem)] w-auto max-w-full rounded-lg object-contain shadow-sm"
              />
            ) : null}
            {attachment.kind === "video" ? (
              <video
                src={attachment.url}
                controls
                className="max-h-[calc(100vh-11rem)] w-full rounded-lg bg-black shadow-sm"
              />
            ) : null}
            {attachment.kind === "document" && canPreviewDocument(attachment) ? (
              <iframe
                src={attachment.url}
                title={attachment.name}
                className="h-[calc(100vh-11rem)] w-full rounded-lg border bg-background shadow-sm"
              />
            ) : null}
            {attachment.kind === "document" && !canPreviewDocument(attachment) ? (
              <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border bg-background p-8 text-center shadow-sm">
                <span className="flex size-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileTextIcon className="size-8" />
                </span>
                <div className="grid gap-1">
                  <TypographySmall>Предпросмотр недоступен</TypographySmall>
                  <TypographyMuted>
                    Этот формат документа лучше скачать или открыть отдельно.
                  </TypographyMuted>
                </div>
              </div>
            ) : null}
          </div>
          <SheetFooter className="border-t sm:flex-row sm:justify-end">
            <a
              href={attachment.url}
              download={attachment.name}
              className={buttonVariants({ variant: "outline" })}
            >
              <DownloadIcon className="mr-2 size-4" />
              Скачать
            </a>
            <a
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "secondary" })}
            >
              <ExternalLinkIcon className="mr-2 size-4" />
              Открыть отдельно
            </a>
          </SheetFooter>
        </SheetContent>
      ) : null}
    </Sheet>
  )
}

export function NewsAttachments({
  attachments,
  onOpenAttachment,
}: {
  attachments: NewsAttachment[]
  onOpenAttachment: (attachment: NewsAttachment) => void
}) {
  const images = attachments.filter((attachment) => attachment.kind === "image")
  const videos = attachments.filter((attachment) => attachment.kind === "video")
  const documents = attachments.filter(
    (attachment) => attachment.kind === "document",
  )

  return (
    <div className="flex flex-col gap-4">
      {images.length > 0 ? (
        <div className="grid gap-3">
          {images.map((attachment) => (
            <button
              key={attachment.id}
              type="button"
              className="mx-auto w-full max-w-[640px] overflow-hidden rounded-lg border bg-muted/30 text-left"
              onClick={() => onOpenAttachment(attachment)}
            >
              <Image
                src={attachment.url}
                alt={attachment.name}
                width={800}
                height={450}
                unoptimized
                className="aspect-video h-auto w-full object-contain transition-transform hover:scale-[1.02]"
              />
            </button>
          ))}
        </div>
      ) : null}

      {videos.length > 0 ? (
        <div className="grid gap-3">
          {videos.map((attachment) => (
            <button
              key={attachment.id}
              type="button"
              className="mx-auto w-full max-w-[640px] overflow-hidden rounded-lg border bg-black text-left"
              onClick={() => onOpenAttachment(attachment)}
            >
              <video
                src={attachment.url}
                className="aspect-video h-auto w-full object-contain"
                muted
              />
            </button>
          ))}
        </div>
      ) : null}

      {documents.length > 0 ? (
        <div className="grid gap-2">
          {documents.map((attachment) => (
            <button
              key={attachment.id}
              type="button"
              className="flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted/50"
              onClick={() => onOpenAttachment(attachment)}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FileTextIcon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {attachment.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatFileSize(attachment.size)}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
