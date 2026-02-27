"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts"
import { Input } from "@/components/ui/input"
import { Pencil } from "lucide-react"

interface Operation {
  id: string
  name: string
  time: number
  unit: "minutes" | "seconds"
}

interface GBOChartProps {
  operations: Operation[]
  timeUnit: "minutes" | "seconds"
  taktTime?: number
  taktTimeUnit?: "minutes" | "seconds"
}

export function GBOChart({ operations, timeUnit, taktTime, taktTimeUnit }: GBOChartProps) {
  const [chartTitle, setChartTitle] = useState("Gráfico de Balanceamento de Operações (GBO)")
  const [isEditingTitle, setIsEditingTitle] = useState(false)

  const convertToSeconds = (time: number, unit: "minutes" | "seconds"): number => {
    return unit === "minutes" ? time * 60 : time
  }

  const convertFromSeconds = (timeInSeconds: number, targetUnit: "minutes" | "seconds"): number => {
    return targetUnit === "minutes" ? timeInSeconds / 60 : timeInSeconds
  }

  // Convert all operations to seconds for calculations, then back to display unit
  const operationsInSeconds = operations.map((op) => ({
    ...op,
    timeInSeconds: convertToSeconds(op.time, op.unit),
  }))

  const operationsInDisplayUnit = operationsInSeconds.map((op) => ({
    ...op,
    timeInDisplayUnit: convertFromSeconds(op.timeInSeconds, timeUnit),
  }))

  const averageTimeInSeconds =
    operationsInSeconds.reduce((sum, op) => sum + op.timeInSeconds, 0) / operationsInSeconds.length
  const averageTime = convertFromSeconds(averageTimeInSeconds, timeUnit)

  const maxTimeInSeconds = Math.max(...operationsInSeconds.map((op) => op.timeInSeconds))

  const taktTimeInDisplayUnit = taktTime ? convertFromSeconds(taktTime, timeUnit) : undefined

  const maxOperationTime = Math.max(...operationsInDisplayUnit.map((op) => op.timeInDisplayUnit))
  const maxOperationWithPadding = maxOperationTime * 1.1
  const taktWithPadding = taktTimeInDisplayUnit ? taktTimeInDisplayUnit * 1.1 : 0
  const yAxisMax = Math.max(maxOperationWithPadding, taktWithPadding)

  const chartData = operationsInDisplayUnit.map((operation, index) => {
    const isMaxTime = operation.timeInSeconds === maxTimeInSeconds
    const exceedsTakt = taktTime ? operation.timeInSeconds > taktTime : false
    const isBottleneck = isMaxTime || exceedsTakt

    return {
      name: operation.name,
      time: operation.timeInDisplayUnit,
      isBottleneck,
      exceedsTakt, // Added flag for bars exceeding takt
      index: index + 1,
      originalUnit: operation.unit,
    }
  })

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{label}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Tempo: </span>
            <span className={data.isBottleneck ? "text-chart-5 font-semibold" : "text-foreground"}>
              {data.time.toFixed(1)} {timeUnit}
            </span>
          </p>
          {data.originalUnit !== timeUnit && (
            <p className="text-xs text-muted-foreground">
              Original: {operations.find((op) => op.name === data.name)?.time.toFixed(1)} {data.originalUnit}
            </p>
          )}
          {data.isBottleneck && <p className="text-xs text-chart-5 font-medium mt-1">🔴 Operação Gargalo</p>}
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
          {isEditingTitle ? (
            <Input
              autoFocus
              value={chartTitle}
              onChange={(e) => setChartTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
              className="text-xl font-semibold h-8 w-full max-w-md"
            />
          ) : (
            <>
              <span>{chartTitle}</span>
              <Pencil className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
            </>
          )}
        </CardTitle>
        <CardDescription>
          Visualização dos tempos de cada operação com destaque para o gargalo, linha de tempo médio e takt time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4 text-sm bg-muted/30 p-3 rounded-lg">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              <strong>Média:</strong> {averageTime.toFixed(1)} {timeUnit}
            </span>
            {taktTimeInDisplayUnit && (
              <span className="text-muted-foreground">
                <strong>Takt:</strong> {taktTimeInDisplayUnit.toFixed(1)} {timeUnit}
              </span>
            )}
          </div>
        </div>

        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} fontSize={12} />
              <YAxis
                label={{ value: `Tempo (${timeUnit})`, angle: -90, position: "insideLeft" }}
                fontSize={12}
                domain={[0, yAxisMax]}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={averageTime} stroke="hsl(var(--chart-3))" strokeDasharray="5 5" />
              {taktTimeInDisplayUnit && (
                <ReferenceLine y={taktTimeInDisplayUnit} stroke="#000000" strokeDasharray="8 4" strokeWidth={2} />
              )}
              <Bar dataKey="time" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.exceedsTakt ? "#ef4444" : entry.isBottleneck ? "#f97316" : "#87CEEB"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-6 mt-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#87CEEB" }}></div>
            <span>Operações Normais</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ef4444" }}></div>
            <span>Excede Takt Time</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#f97316" }}></div>
            <span>Maior Tempo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-chart-3 border-dashed"></div>
            <span>Tempo Médio</span>
          </div>
          {taktTimeInDisplayUnit && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-black" style={{ borderTop: "2px dashed" }}></div>
              <span>Takt Time</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
