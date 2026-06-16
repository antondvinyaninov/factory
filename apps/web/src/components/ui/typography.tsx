import * as React from "react"

import { cn } from "@/lib/utils"

export const typographyStyles = {
  h1: "scroll-m-20 text-4xl font-extrabold tracking-tight text-balance lg:text-5xl",
  h2: "scroll-m-20 text-3xl font-semibold tracking-tight text-balance",
  h3: "scroll-m-20 text-2xl font-semibold tracking-tight text-balance",
  h4: "scroll-m-20 text-xl font-semibold tracking-tight text-balance",
  p: "leading-7 [&:not(:first-child)]:mt-6",
  lead: "text-xl text-muted-foreground",
  large: "text-lg font-semibold",
  small: "text-sm leading-none font-medium",
  muted: "text-sm text-muted-foreground",
  prose:
    "max-w-none whitespace-pre-wrap text-sm leading-7 text-foreground [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:mt-6 [&_blockquote]:border-l-2 [&_blockquote]:pl-6 [&_blockquote]:italic [&_code]:relative [&_code]:rounded [&_code]:bg-muted [&_code]:px-[0.3rem] [&_code]:py-[0.2rem] [&_code]:font-mono [&_code]:text-sm [&_code]:font-semibold [&_ol]:my-6 [&_ol]:ml-6 [&_ol]:list-decimal [&_ul]:my-6 [&_ul]:ml-6 [&_ul]:list-disc [&_li]:mt-2",
  list: "my-6 ml-6 list-disc [&>li]:mt-2",
  blockquote: "mt-6 border-l-2 pl-6 italic",
  inlineCode:
    "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
} as const

function TypographyH1({
  className,
  ...props
}: React.ComponentProps<"h1">) {
  return <h1 className={cn(typographyStyles.h1, className)} {...props} />
}

function TypographyH2({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return <h2 className={cn(typographyStyles.h2, className)} {...props} />
}

function TypographyH3({
  className,
  ...props
}: React.ComponentProps<"h3">) {
  return <h3 className={cn(typographyStyles.h3, className)} {...props} />
}

function TypographyH4({
  className,
  ...props
}: React.ComponentProps<"h4">) {
  return <h4 className={cn(typographyStyles.h4, className)} {...props} />
}

function TypographyP({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn(typographyStyles.p, className)} {...props} />
}

function TypographyLead({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return <p className={cn(typographyStyles.lead, className)} {...props} />
}

function TypographyLarge({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn(typographyStyles.large, className)} {...props} />
}

function TypographySmall({
  className,
  ...props
}: React.ComponentProps<"small">) {
  return <small className={cn(typographyStyles.small, className)} {...props} />
}

function TypographyMuted({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return <p className={cn(typographyStyles.muted, className)} {...props} />
}

function TypographyProse({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn(typographyStyles.prose, className)} {...props} />
}

function TypographyList({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return <ul className={cn(typographyStyles.list, className)} {...props} />
}

function TypographyBlockquote({
  className,
  ...props
}: React.ComponentProps<"blockquote">) {
  return (
    <blockquote
      className={cn(typographyStyles.blockquote, className)}
      {...props}
    />
  )
}

function TypographyInlineCode({
  className,
  ...props
}: React.ComponentProps<"code">) {
  return <code className={cn(typographyStyles.inlineCode, className)} {...props} />
}

export {
  TypographyBlockquote,
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyH4,
  TypographyInlineCode,
  TypographyLarge,
  TypographyLead,
  TypographyList,
  TypographyMuted,
  TypographyP,
  TypographyProse,
  TypographySmall,
}
