"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Trash2, GripVertical } from "lucide-react"

interface Operation {
  id: string
  name: string
  time: number
  unit: "minutes" | "seconds"
}

interface DraggableOperationsListProps {
  operations: Operation[]
  timeUnit: string
  onReorder: (newOperations: Operation[]) => void
  onRemove: (id: string) => void
}

export function DraggableOperationsList({ operations, timeUnit, onReorder, onRemove }: DraggableOperationsListProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, operationId: string) => {
    setDraggedItem(operationId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/html", operationId)
  }

  const handleDragOver = (e: React.DragEvent, operationId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverItem(operationId)
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
  }

  const handleDrop = (e: React.DragEvent, targetOperationId: string) => {
    e.preventDefault()

    if (!draggedItem || draggedItem === targetOperationId) {
      setDraggedItem(null)
      setDragOverItem(null)
      return
    }

    const draggedIndex = operations.findIndex((op) => op.id === draggedItem)
    const targetIndex = operations.findIndex((op) => op.id === targetOperationId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newOperations = [...operations]
    const [draggedOperation] = newOperations.splice(draggedIndex, 1)
    newOperations.splice(targetIndex, 0, draggedOperation)

    onReorder(newOperations)
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const convertToDisplayUnit = (time: number, fromUnit: "minutes" | "seconds", toUnit: string): number => {
    if (fromUnit === toUnit) return time
    if (fromUnit === "minutes" && toUnit === "seconds") return time * 60
    if (fromUnit === "seconds" && toUnit === "minutes") return time / 60
    return time
  }

  if (operations.length === 0) return null

  return (
    <div className="space-y-2">
      <Label>Operações Adicionadas ({operations.length})</Label>
      <p className="text-xs text-muted-foreground">Arraste para reorganizar a ordem</p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {operations.map((operation, index) => {
          const displayTime = convertToDisplayUnit(operation.time, operation.unit, timeUnit)
          const showConversion = operation.unit !== timeUnit

          return (
            <div
              key={operation.id}
              draggable
              onDragStart={(e) => handleDragStart(e, operation.id)}
              onDragOver={(e) => handleDragOver(e, operation.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, operation.id)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-all cursor-move ${
                draggedItem === operation.id
                  ? "opacity-50 scale-95"
                  : dragOverItem === operation.id
                    ? "bg-accent/20 border-accent"
                    : "bg-muted border-transparent hover:bg-muted/80"
              }`}
            >
              <div className="flex items-center text-muted-foreground">
                <GripVertical className="h-4 w-4" />
                <span className="text-xs font-mono ml-1 min-w-[20px]">{index + 1}</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{operation.name}</p>
                <div className="text-xs text-muted-foreground">
                  <p>
                    {displayTime.toFixed(1)} {timeUnit}
                  </p>
                  {showConversion && (
                    <p className="text-xs opacity-75">
                      Original: {operation.time} {operation.unit}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(operation.id)}
                className="text-destructive hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
