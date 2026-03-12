import { Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface StepperControlProps {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
  className?: string
}

function StepperControl({
  label,
  value,
  min = 0,
  max = 20,
  onChange,
  className,
}: StepperControlProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-8 text-center text-base font-semibold text-foreground tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export { StepperControl }
