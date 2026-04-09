import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "button-sci inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "border border-cyan-400/35 bg-[linear-gradient(135deg,rgba(34,211,238,0.24),rgba(99,102,241,0.18))] text-cyan-50 shadow-glow-cyan hover:-translate-y-0.5 hover:border-cyan-300/55 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.38),0_0_34px_rgba(34,211,238,0.26)] focus-visible:ring-cyan-400/20",
        destructive:
          "border border-red-500/40 bg-[linear-gradient(135deg,rgba(220,38,38,0.3),rgba(127,29,29,0.24))] text-red-50 hover:-translate-y-0.5 hover:border-red-400/60 hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-slate-700/70 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(6,10,22,0.84))] text-slate-200 shadow-xs hover:-translate-y-0.5 hover:border-cyan-400/40 hover:text-cyan-200 hover:shadow-glow-indigo",
        secondary:
          "border border-indigo-500/28 bg-[linear-gradient(135deg,rgba(99,102,241,0.2),rgba(76,29,149,0.16))] text-indigo-100 hover:-translate-y-0.5 hover:border-indigo-400/45 hover:shadow-glow-indigo",
        ghost:
          "text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-200 dark:hover:bg-cyan-500/10",
        neon:
          "border border-cyan-400/45 bg-transparent text-cyan-300 shadow-glow-cyan hover:-translate-y-0.5 hover:bg-cyan-400/10 hover:text-cyan-100",
        holo:
          "border border-purple-400/35 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(168,85,247,0.16),rgba(99,102,241,0.12))] text-slate-100 shadow-glow-purple hover:-translate-y-0.5 hover:border-purple-300/55",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
