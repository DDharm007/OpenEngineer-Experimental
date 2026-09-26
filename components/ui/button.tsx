import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[12px] text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 backdrop-filter backdrop-blur-lg",
  {
    variants: {
      variant: {
        default: "bg-zinc-900/80 text-white hover:bg-zinc-800/90 border border-zinc-700/50 hover:border-zinc-600/70 [box-shadow:0px_4px_16px_rgba(0,0,0,0.3),inset_0px_1px_0px_rgba(255,255,255,0.1)] hover:translate-y-[-2px] hover:scale-[1.02] hover:[box-shadow:0px_6px_20px_rgba(0,0,0,0.4),inset_0px_1px_0px_rgba(255,255,255,0.15)] active:translate-y-[0px] active:scale-[0.98] active:[box-shadow:0px_2px_8px_rgba(0,0,0,0.2)] disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100",
        secondary: "bg-white/10 text-white hover:bg-white/20 border border-white/20 hover:border-white/30 [box-shadow:0px_4px_16px_rgba(0,0,0,0.2),inset_0px_1px_0px_rgba(255,255,255,0.2)] hover:translate-y-[-2px] hover:scale-[1.02] hover:[box-shadow:0px_6px_20px_rgba(0,0,0,0.3),inset_0px_1px_0px_rgba(255,255,255,0.25)] active:translate-y-[0px] active:scale-[0.98] disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100",
        outline: "border border-white/30 bg-transparent hover:bg-white/10 text-white [box-shadow:0px_4px_16px_rgba(255,255,255,0.1)] hover:translate-y-[-2px] hover:scale-[1.02] hover:[box-shadow:0px_6px_20px_rgba(255,255,255,0.15)] active:translate-y-[0px] active:scale-[0.98] disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100",
        destructive: "bg-red-500/80 text-white hover:bg-red-600/90 border border-red-400/50 hover:border-red-300/70 [box-shadow:0px_4px_16px_rgba(239,68,68,0.3),inset_0px_1px_0px_rgba(255,255,255,0.1)] hover:translate-y-[-2px] hover:scale-[1.02] hover:[box-shadow:0px_6px_20px_rgba(239,68,68,0.4)] active:translate-y-[0px] active:scale-[0.98] disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100",
        code: "bg-[#36322F]/80 text-white hover:bg-[#4a4542]/90 border border-[#5a5047]/50 hover:border-[#6a5a57]/70 [box-shadow:0px_4px_16px_rgba(54,50,47,0.3),inset_0px_1px_0px_rgba(255,255,255,0.1)] hover:translate-y-[-2px] hover:scale-[1.02] hover:[box-shadow:0px_6px_20px_rgba(54,50,47,0.4)] active:translate-y-[0px] active:scale-[0.98] disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100",
        orange: "bg-orange-500/80 text-white hover:bg-orange-600/90 border border-orange-400/50 hover:border-orange-300/70 [box-shadow:0px_4px_16px_rgba(234,88,12,0.3),inset_0px_1px_0px_rgba(255,255,255,0.1)] hover:translate-y-[-2px] hover:scale-[1.02] hover:[box-shadow:0px_6px_20px_rgba(234,88,12,0.4)] active:translate-y-[0px] active:scale-[0.98] disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100",
        ghost: "hover:bg-accent hover:text-accent-foreground backdrop-filter backdrop-blur-lg",
        premium: "bg-gradient-to-r from-purple-600/80 to-pink-600/80 text-white hover:from-purple-500/90 hover:to-pink-500/90 border border-purple-400/50 hover:border-purple-300/70 [box-shadow:0px_4px_16px_rgba(139,0,255,0.3),inset_0px_1px_0px_rgba(255,255,255,0.2)] hover:translate-y-[-2px] hover:scale-[1.02] hover:[box-shadow:0px_6px_20px_rgba(139,0,255,0.5),0px_0px_30px_rgba(139,0,255,0.3)] active:translate-y-[0px] active:scale-[0.98] disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100",
        glass: "bg-white/10 text-white hover:bg-white/20 border border-white/20 hover:border-white/30 backdrop-filter backdrop-blur-xl [box-shadow:0px_8px_32px_rgba(0,0,0,0.3),inset_0px_1px_0px_rgba(255,255,255,0.2)] hover:translate-y-[-2px] hover:scale-[1.02] hover:[box-shadow:0px_12px_40px_rgba(0,0,0,0.4),inset_0px_1px_0px_rgba(255,255,255,0.25)] active:translate-y-[0px] active:scale-[0.98] disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 py-1 text-sm",
        lg: "h-12 px-6 py-3 text-base",
        xl: "h-14 px-8 py-4 text-lg"
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? "button" : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }