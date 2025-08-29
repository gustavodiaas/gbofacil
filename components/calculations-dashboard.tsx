import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Target, TrendingUp, AlertTriangle, Timer } from "lucide-react"

interface Operation {
  id: string
  name: string
  time: number
  unit: "minutes" | "seconds"
}

interface CalculationsDashboardProps {
  operations: Operation[]
  timeUnit: "minutes" | "seconds"
  taktTime?: number
  taktTimeUnit?: "minutes" | "seconds"
}

export function CalculationsDashboard({ operations, timeUnit, taktTime, taktTimeUnit }: CalculationsDashboardProps) {
  const convertToSeconds = (time: number, unit: "minutes" | "seconds"): number => {
    return unit === "minutes" ? time * 60 : time
  }

  const convertFromSeconds = (timeInSeconds: number, targetUnit: "minutes" | "seconds"): number => {
    return targetUnit === "minutes" ? timeInSeconds / 60 : timeInSeconds
  }

  // Convert all operations to seconds for calculations
  const operationsInSeconds = operations.map((op) => ({
    ...op,
    timeInSeconds: convertToSeconds(op.time, op.unit),
  }))

  const totalTimeInSeconds = operationsInSeconds.reduce((sum, op) => sum + op.timeInSeconds, 0)
  const operationCount = operations.length
  const averageTimeInSeconds = operationCount > 0 ? totalTimeInSeconds / operationCount : 0
  const bottleneckInSeconds = operationsInSeconds.reduce(
    (max, op) => (op.timeInSeconds > max.timeInSeconds ? op : max),
    operationsInSeconds[0],
  )

  // Convert back to display unit
  const totalTime = convertFromSeconds(totalTimeInSeconds, timeUnit)
  const averageTime = convertFromSeconds(averageTimeInSeconds, timeUnit)

  const taktTimeInDisplayUnit =
    taktTime && taktTimeUnit ? convertFromSeconds(convertToSeconds(taktTime, taktTimeUnit), timeUnit) : undefined

  const metrics = [
    {
      title: "Tempo Total",
      value: totalTime.toFixed(1),
      unit: timeUnit,
      icon: Clock,
      color: "text-chart-1",
    },
    {
      title: "Número de Operações",
      value: operationCount.toString(),
      unit: "operações",
      icon: Target,
      color: "text-chart-2",
    },
    {
      title: "Tempo Médio",
      value: averageTime.toFixed(1),
      unit: timeUnit,
      icon: TrendingUp,
      color: "text-chart-3",
    },
    {
      title: "Operação Gargalo",
      value: bottleneckInSeconds?.name || "-",
      unit: bottleneckInSeconds
        ? `${convertFromSeconds(bottleneckInSeconds.timeInSeconds, timeUnit).toFixed(1)} ${timeUnit}`
        : "",
      icon: AlertTriangle,
      color: "text-chart-5",
    },
    ...(taktTimeInDisplayUnit
      ? [
          {
            title: "Takt Time",
            value: taktTimeInDisplayUnit.toFixed(1),
            unit: timeUnit,
            icon: Timer,
            color: "text-chart-4",
          },
        ]
      : []),
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {metrics.map((metric, index) => {
        const Icon = metric.icon
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
              <Icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-balance">{metric.value}</div>
              {metric.unit && (
                <Badge variant="secondary" className="text-xs mt-1">
                  {metric.unit}
                </Badge>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
