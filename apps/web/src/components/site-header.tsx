import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { TypographyH1 } from "@/components/ui/typography"
import { Button } from "@/components/ui/button"
import { SlidersHorizontalIcon } from "lucide-react"

export function SiteHeader({
  title = "Панель управления порталом",
  onOpenFilters,
}: {
  title?: string
  onOpenFilters?: () => void
}) {
  return (
    <header className="sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur transition-[width,height] ease-linear supports-backdrop-filter:bg-background/80 md:peer-data-[variant=inset]:rounded-t-xl group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <img
          src="/logo-portal.svg"
          alt="Логотип портала"
          className="size-7 shrink-0 md:hidden"
        />
        <SidebarTrigger className="-ml-1 hidden md:inline-flex" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <TypographyH1 className="text-base font-medium tracking-normal lg:text-base">
          {title}
        </TypographyH1>
        <div className="ml-auto flex items-center gap-2">
          {onOpenFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="xl:hidden"
              onClick={onOpenFilters}
            >
              <SlidersHorizontalIcon />
              <span className="sr-only">Открыть фильтры</span>
            </Button>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
