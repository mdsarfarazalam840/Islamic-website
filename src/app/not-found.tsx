import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60dvh] gap-4 px-4 text-center">
      <h1 className="text-6xl font-display font-bold text-secondary">404</h1>
      <p className="text-xl text-muted-foreground">Page not found</p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        Return Home
      </Link>
    </div>
  )
}
