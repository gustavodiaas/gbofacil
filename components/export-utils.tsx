import * as XLSX from "xlsx"

interface Operation {
  id: string
  name: string
  time: number
  unit: "minutes" | "seconds"
}

export const exportToExcel = async (operations: Operation[], timeUnit: string) => {
  const data = operations.map((op, index) => ({
    "Ordem": index + 1,
    "Nome da Operação": op.name,
    "Tempo": op.time,
    "Unidade": op.unit
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Operacoes")
  XLSX.writeFile(wb, "analise-gbo.xlsx")
}

export const downloadTemplate = () => {
  const data = [
    { "Nome da Operação": "Corte de material", "Tempo": 2.5, "Unidade": "minutes" },
    { "Nome da Operação": "Dobra e preparo", "Tempo": 45, "Unidade": "seconds" },
    { "Nome da Operação": "Montagem final", "Tempo": 1.2, "Unidade": "minutes" }
  ]
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Modelo")
  XLSX.writeFile(wb, "modelo-importacao-gbo.xlsx")
}

export const importFromExcel = async (file: File): Promise<Operation[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(worksheet)

        const operations = json.map((row: any) => {
          // Busca pelas colunas do modelo ou aproximações
          const name = row["Nome da Operação"] || row["Nome"] || row["Operação"] || "Sem Nome"
          const time = Number(row["Tempo"]) || Number(row["Time"]) || 0
          const rawUnit = String(row["Unidade"] || row["Unit"] || "minutes").toLowerCase()
          const unit = rawUnit.includes("sec") || rawUnit.includes("seg") ? "seconds" : "minutes"

          return {
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            name,
            time,
            unit,
          }
        }).filter(op => op.time > 0) // Ignora linhas vazias ou sem tempo válido

        resolve(operations)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = (error) => reject(error)
    reader.readAsArrayBuffer(file)
  })
}
