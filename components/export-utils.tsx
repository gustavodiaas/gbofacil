"use client"

import jsPDF from "jspdf"
import * as XLSX from "xlsx"

interface Operation {
  id: string
  name: string
  time: number
  unit: "minutes" | "seconds" // Added missing unit property to match main interface
}

const convertToSeconds = (time: number, unit: "minutes" | "seconds"): number => {
  return unit === "minutes" ? time * 60 : time
}

const convertFromSeconds = (timeInSeconds: number, targetUnit: "minutes" | "seconds"): number => {
  return targetUnit === "minutes" ? timeInSeconds / 60 : timeInSeconds
}

export const exportToPDF = (operations: Operation[], timeUnit: "minutes" | "seconds", chartRef?: HTMLElement) => {
  const pdf = new jsPDF()

  // Add title
  pdf.setFontSize(20)
  pdf.text("Análise GBO - Gráfico de Balanceamento de Operações", 20, 30)

  // Add date
  pdf.setFontSize(12)
  pdf.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 20, 45)

  const operationsInSeconds = operations.map((op) => ({
    ...op,
    timeInSeconds: convertToSeconds(op.time, op.unit),
  }))

  const totalTimeInSeconds = operationsInSeconds.reduce((sum, op) => sum + op.timeInSeconds, 0)
  const averageTimeInSeconds = totalTimeInSeconds / operationsInSeconds.length
  const bottleneckInSeconds = operationsInSeconds.reduce(
    (max, op) => (op.timeInSeconds > max.timeInSeconds ? op : max),
    operationsInSeconds[0],
  )

  const totalTime = convertFromSeconds(totalTimeInSeconds, timeUnit)
  const averageTime = convertFromSeconds(averageTimeInSeconds, timeUnit)

  // Add metrics
  pdf.setFontSize(14)
  pdf.text("Métricas:", 20, 65)
  pdf.setFontSize(11)
  pdf.text(`Tempo Total: ${totalTime.toFixed(1)} ${timeUnit}`, 20, 80)
  pdf.text(`Número de Operações: ${operations.length}`, 20, 90)
  pdf.text(`Tempo Médio: ${averageTime.toFixed(1)} ${timeUnit}`, 20, 100)
  pdf.text(
    `Operação Gargalo: ${bottleneckInSeconds.name} (${convertFromSeconds(bottleneckInSeconds.timeInSeconds, timeUnit).toFixed(1)} ${timeUnit})`,
    20,
    110,
  )

  // Add operations table
  pdf.setFontSize(14)
  pdf.text("Operações:", 20, 130)

  let yPosition = 145
  pdf.setFontSize(11)
  pdf.text("Operação", 20, yPosition)
  pdf.text(`Tempo (${timeUnit})`, 120, yPosition)
  pdf.text("Status", 170, yPosition)

  yPosition += 10
  pdf.line(20, yPosition, 190, yPosition) // Header line

  operationsInSeconds.forEach((op, index) => {
    yPosition += 15
    if (yPosition > 270) {
      // New page if needed
      pdf.addPage()
      yPosition = 30
    }

    const displayTime = convertFromSeconds(op.timeInSeconds, timeUnit)
    pdf.text(op.name, 20, yPosition)
    pdf.text(displayTime.toFixed(1), 120, yPosition)
    pdf.text(op.timeInSeconds === bottleneckInSeconds.timeInSeconds ? "Gargalo" : "Normal", 170, yPosition)
  })

  // Save the PDF
  pdf.save(`analise-gbo-${new Date().toISOString().split("T")[0]}.pdf`)
}

export const exportToExcel = (operations: Operation[], timeUnit: "minutes" | "seconds") => {
  const operationsInSeconds = operations.map((op) => ({
    ...op,
    timeInSeconds: convertToSeconds(op.time, op.unit),
  }))

  const totalTimeInSeconds = operationsInSeconds.reduce((sum, op) => sum + op.timeInSeconds, 0)
  const averageTimeInSeconds = totalTimeInSeconds / operationsInSeconds.length
  const bottleneckInSeconds = operationsInSeconds.reduce(
    (max, op) => (op.timeInSeconds > max.timeInSeconds ? op : max),
    operationsInSeconds[0],
  )

  const totalTime = convertFromSeconds(totalTimeInSeconds, timeUnit)
  const averageTime = convertFromSeconds(averageTimeInSeconds, timeUnit)

  // Create metrics sheet data
  const metricsData = [
    ["Métrica", "Valor", "Unidade"],
    ["Tempo Total", totalTime.toFixed(1), timeUnit],
    ["Número de Operações", operations.length, "operações"],
    ["Tempo Médio", averageTime.toFixed(1), timeUnit],
    [
      "Operação Gargalo",
      bottleneckInSeconds.name,
      `${convertFromSeconds(bottleneckInSeconds.timeInSeconds, timeUnit).toFixed(1)} ${timeUnit}`,
    ],
    [],
    ["Data de Exportação", new Date().toLocaleDateString("pt-BR"), ""],
  ]

  // Create operations sheet data
  const operationsData = [
    ["Operação", `Tempo (${timeUnit})`, "Unidade Original", "Status", "% do Total"],
    ...operationsInSeconds.map((op) => [
      op.name,
      convertFromSeconds(op.timeInSeconds, timeUnit).toFixed(1),
      `${op.time.toFixed(1)} ${op.unit}`,
      op.timeInSeconds === bottleneckInSeconds.timeInSeconds ? "Gargalo" : "Normal",
      `${((op.timeInSeconds / totalTimeInSeconds) * 100).toFixed(1)}%`,
    ]),
  ]

  // Create workbook
  const wb = XLSX.utils.book_new()

  // Add metrics sheet
  const metricsWs = XLSX.utils.aoa_to_sheet(metricsData)
  XLSX.utils.book_append_sheet(wb, metricsWs, "Métricas")

  // Add operations sheet
  const operationsWs = XLSX.utils.aoa_to_sheet(operationsData)
  XLSX.utils.book_append_sheet(wb, operationsWs, "Operações")

  // Save the file
  XLSX.writeFile(wb, `analise-gbo-${new Date().toISOString().split("T")[0]}.xlsx`)
}

export const importFromExcel = (file: File): Promise<Operation[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })

        // Try to find operations data in any sheet
        const operations: Operation[] = []

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

          // Look for operations data (should have at least name and time columns)
          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i]
            if (row && row.length >= 2 && typeof row[0] === "string" && typeof row[1] === "number") {
              // Skip header rows that contain "Operação" or "Métrica"
              if (row[0].toLowerCase().includes("operação") || row[0].toLowerCase().includes("métrica")) {
                continue
              }

              operations.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: row[0],
                time: Number(row[1]),
                unit: "minutes", // Added default unit for imported operations
              })
            }
          }

          // If we found operations, break
          if (operations.length > 0) break
        }

        resolve(operations)
      } catch (error) {
        reject(new Error("Erro ao processar arquivo Excel. Verifique se o formato está correto."))
      }
    }

    reader.onerror = () => reject(new Error("Erro ao ler arquivo"))
    reader.readAsArrayBuffer(file)
  })
}
