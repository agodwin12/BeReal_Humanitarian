import { cloneElement, isValidElement, type ReactNode } from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Brand CTA rules (UI guide §4): rounded-[10px], min-height 46px, no pills,
// coral only for the primary action, light borders, soft shadows.
//
// Hover = "water fill": a ::before layer (rounded leading edge, 130% wide so
// the curve is clipped once full) slides in from the left behind the label.
// `isolate` + `before:-z-10` keeps it above the button background but under
// the text/icon. Each variant only picks the fill colour and end text colour.
const buttonVariants = cva(
  "group/button relative isolate inline-flex shrink-0 cursor-pointer items-center justify-center gap-2.5 overflow-hidden rounded-[10px] border border-transparent bg-clip-padding text-[0.89rem] leading-none font-bold whitespace-nowrap transition-[transform,box-shadow,border-color,color] duration-[220ms] ease-[cubic-bezier(.22,1,.36,1)] outline-none select-none hover:-translate-y-px active:translate-y-0 focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:-z-10 before:w-[130%] before:-translate-x-full before:rounded-r-full before:transition-transform before:duration-[480ms] before:ease-[cubic-bezier(.22,1,.36,1)] before:content-[''] hover:before:translate-x-0 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        coral:
          "bg-brand-coral-500 text-white shadow-[0_8px_18px_rgb(242_96_88/0.20)] before:bg-brand-coral-700 hover:shadow-[0_10px_24px_rgb(242_96_88/0.26)]",
        purple: "bg-brand-purple-600 text-white before:bg-brand-purple-800",
        "outline-purple":
          "border-brand-purple-500 bg-white/80 text-brand-purple-800 before:bg-brand-purple-600 hover:border-brand-purple-600 hover:text-white",
        "outline-light":
          "border-white/75 bg-transparent text-white before:bg-white hover:border-white hover:text-brand-purple-900",
        default: "bg-primary text-primary-foreground before:bg-brand-purple-900",
        outline:
          "border-border bg-background text-foreground before:bg-brand-purple-50 hover:text-brand-purple-800",
        ghost: "before:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 before:hidden hover:translate-y-0 hover:underline",
      },
      size: {
        default: "min-h-11 px-5 py-3",
        lg: "min-h-[46px] px-[1.35rem] py-[0.8rem]",
        sm: "min-h-9 rounded-[8px] px-3.5 py-2 text-[0.8rem]",
        icon: "size-10",
        "icon-sm": "size-8 rounded-[8px]",
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
  children,
  ...props
}: Omit<ButtonPrimitive.Props, "render"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const resolvedClassName = cn(buttonVariants({ variant, size, className }))

  // Base UI composes through a `render` prop rather than Radix's `asChild`.
  // This keeps `<Button asChild><Link>…</Link></Button>` working by lifting
  // the child's own children to where `render` expects them.
  if (asChild && isValidElement<{ children?: ReactNode }>(children)) {
    return (
      <ButtonPrimitive
        data-slot="button"
        className={resolvedClassName}
        render={cloneElement(children, {})}
        nativeButton={false}
        {...props}
      >
        {children.props.children}
      </ButtonPrimitive>
    )
  }

  return (
    <ButtonPrimitive
      data-slot="button"
      className={resolvedClassName}
      {...props}
    >
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
