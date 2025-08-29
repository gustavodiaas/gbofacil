"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Plus,
  BarChart3,
  Download,
  Upload,
  FileText,
  FileSpreadsheet,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { GBOChart } from "@/components/gbo-chart"
import { CalculationsDashboard } from "@/components/calculations-dashboard"
import { DraggableOperationsList } from "@/components/draggable-operations-list"
import { exportToPDF, exportToExcel, importFromExcel } from "@/components/export-utils"
import { useToast } from "@/hooks/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Operation {
  id: string
  name: string
  time: number
  unit: "minutes" | "seconds"
}

const validateNumber = (value: string, min = 0): { isValid: boolean; error?: string } => {
  if (!value.trim()) return { isValid: false, error: "Campo obrigatório" }
  const num = Number.parseFloat(value)
  if (isNaN(num)) return { isValid: false, error: "Deve ser um número válido" }
  if (num <= min) return { isValid: false, error: `Deve ser maior que ${min}` }
  return { isValid: true }
}

const validateText = (value: string): { isValid: boolean; error?: string } => {
  if (!value.trim()) return { isValid: false, error: "Campo obrigatório" }
  if (value.trim().length < 2) return { isValid: false, error: "Mínimo 2 caracteres" }
  return { isValid: true }
}

export default function GBOAnalysis() {
  const [operations, setOperations] = useState<Operation[]>([])
  const [timeUnit, setTimeUnit] = useState<"minutes" | "seconds">("minutes")
  const [newOperationName, setNewOperationName] = useState("")
  const [newOperationTime, setNewOperationTime] = useState("")
  const [workShiftTime, setWorkShiftTime] = useState("")
  const [dailyDemand, setDailyDemand] = useState("")
  const [demandUnit, setDemandUnit] = useState("peças")
  const [timeUnitTakt, setTimeUnitTakt] = useState<"minutes" | "seconds" | "hours">("minutes")
  const [previousTimeUnitTakt, setPreviousTimeUnitTakt] = useState<"minutes" | "seconds" | "hours">("minutes")
  const [errors, setErrors] = useState<{
    operationName?: string
    operationTime?: string
    workShiftTime?: string
    dailyDemand?: string
  }>({})
  const [isLoading, setIsLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (workShiftTime && previousTimeUnitTakt !== timeUnitTakt) {
      const currentValue = Number.parseFloat(workShiftTime)
      if (!isNaN(currentValue)) {
        let convertedValue = currentValue

        if (previousTimeUnitTakt === "hours") {
          convertedValue = currentValue * 60
        } else if (previousTimeUnitTakt === "seconds") {
          convertedValue = currentValue / 60
        }

        if (timeUnitTakt === "hours") {
          convertedValue = convertedValue / 60
        } else if (timeUnitTakt === "seconds") {
          convertedValue = convertedValue * 60
        }

        setWorkShiftTime(convertedValue.toFixed(2))
      }
      setPreviousTimeUnitTakt(timeUnitTakt)
    }
  }, [timeUnitTakt, workShiftTime, previousTimeUnitTakt])

  const calculateTaktTime = (): number | undefined => {
    if (!workShiftTime || !dailyDemand) return undefined

    const shiftTime = Number.parseFloat(workShiftTime)
    const demand = Number.parseFloat(dailyDemand)

    if (shiftTime <= 0 || demand <= 0) return undefined

    let shiftTimeInSeconds = shiftTime
    if (timeUnitTakt === "minutes") {
      shiftTimeInSeconds = shiftTime * 60
    } else if (timeUnitTakt === "hours") {
      shiftTimeInSeconds = shiftTime * 3600
    }

    return shiftTimeInSeconds / demand
  }

  const addOperation = () => {
    const nameValidation = validateText(newOperationName)
    const timeValidation = validateNumber(newOperationTime)

    const newErrors: typeof errors = {}
    if (!nameValidation.isValid) newErrors.operationName = nameValidation.error
    if (!timeValidation.isValid) newErrors.operationTime = timeValidation.error

    setErrors(newErrors)

    if (!nameValidation.isValid || !timeValidation.isValid) {
      toast({
        title: "Dados inválidos",
        description: "Verifique os campos destacados em vermelho.",
        variant: "destructive",
      })
      return
    }

    const newOperation: Operation = {
      id: Date.now().toString(),
      name: newOperationName.trim(),
      time: Number.parseFloat(newOperationTime),
      unit: timeUnit,
    }

    setOperations([...operations, newOperation])
    setNewOperationName("")
    setNewOperationTime("")
    setErrors({})

    toast({
      title: "✅ Operação adicionada",
      description: `"${newOperation.name}" foi adicionada com sucesso.`,
    })
  }

  const removeOperation = (id: string) => {
    const operation = operations.find((op) => op.id === id)
    setOperations(operations.filter((op) => op.id !== id))

    if (operation) {
      toast({
        title: "Operação removida",
        description: `"${operation.name}" foi removida.`,
      })
    }
  }

  const reorderOperations = (newOperations: Operation[]) => {
    setOperations(newOperations)
    toast({
      title: "✅ Ordem atualizada",
      description: "A ordem das operações foi reorganizada.",
    })
  }

  const validateTaktFields = () => {
    const shiftValidation = validateNumber(workShiftTime)
    const demandValidation = validateNumber(dailyDemand)

    const newErrors: typeof errors = { ...errors }
    if (!shiftValidation.isValid) newErrors.workShiftTime = shiftValidation.error
    else delete newErrors.workShiftTime

    if (!demandValidation.isValid) newErrors.dailyDemand = demandValidation.error
    else delete newErrors.dailyDemand

    setErrors(newErrors)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addOperation()
    }
  }

  const handleExportPDF = async () => {
    if (operations.length === 0) {
      toast({
        title: "Nenhuma operação",
        description: "Adicione operações antes de exportar.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      await exportToPDF(operations, timeUnit)
      toast({
        title: "✅ PDF exportado",
        description: "O arquivo PDF foi baixado com sucesso.",
      })
    } catch (error) {
      toast({
        title: "❌ Erro na exportação",
        description: "Não foi possível exportar o PDF.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportExcel = async () => {
    if (operations.length === 0) {
      toast({
        title: "Nenhuma operação",
        description: "Adicione operações antes de exportar.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      await exportToExcel(operations, timeUnit)
      toast({
        title: "✅ Excel exportado",
        description: "O arquivo Excel foi baixado com sucesso.",
      })
    } catch (error) {
      toast({
        title: "❌ Erro na exportação",
        description: error instanceof Error ? error.message : "Erro desconhecido.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleImportExcel = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      const importedOperations = await importFromExcel(file)
      if (importedOperations.length === 0) {
        toast({
          title: "Nenhuma operação encontrada",
          description: "O arquivo não contém operações válidas.",
          variant: "destructive",
        })
        return
      }

      setOperations(importedOperations)
      toast({
        title: "✅ Importação concluída",
        description: `${importedOperations.length} operações foram importadas.`,
      })
    } catch (error) {
      toast({
        title: "❌ Erro na importação",
        description: error instanceof Error ? error.message : "Erro desconhecido.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />

      <header className="border-b border-border bg-card/50 backdrop-blur-sm tech-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 tech-glow">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Análise GBO
                </h1>
                <p className="text-xs text-muted-foreground">Gráfico de Balanceamento de Operações</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Badge variant="secondary" className="text-sm tech-glow">
                Industrial Analytics
              </Badge>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-transparent tech-glow hover:scale-105 transition-all duration-300"
                  >
                    <HelpCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Ajuda</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Como usar a Análise GBO</DialogTitle>
                    <DialogDescription>
                      Guia completo para utilizar a ferramenta de Gráfico de Balanceamento de Operações
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-semibold mb-2">O que é GBO?</h4>
                      <p className="text-muted-foreground">
                        O Gráfico de Balanceamento de Operações (GBO) é uma ferramenta visual que ajuda a identificar
                        gargalos em processos produtivos, comparando os tempos de cada operação com o Takt Time.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Takt Time</h4>
                      <p className="text-muted-foreground">
                        É o ritmo de produção necessário para atender a demanda do cliente. Calculado como:
                        <strong> Tempo Disponível ÷ Demanda Diária</strong>
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Como interpretar o gráfico:</h4>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        <li>
                          <strong>Barras azuis:</strong> Operações dentro do tempo normal
                        </li>
                        <li>
                          <strong>Barras vermelhas:</strong> Operações gargalo (tempo maior que outras ou que excedem o
                          Takt)
                        </li>
                        <li>
                          <strong>Linha preta pontilhada:</strong> Takt Time de referência
                        </li>
                        <li>
                          <strong>Linha azul pontilhada:</strong> Tempo médio das operações
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Funcionalidades:</h4>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        <li>Adicione operações manualmente ou importe de Excel</li>
                        <li>Arraste operações para reordenar</li>
                        <li>Exporte relatórios em PDF ou Excel</li>
                        <li>Misture unidades de tempo (minutos/segundos)</li>
                      </ul>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:gap-8 xl:grid-cols-3">
          <div className="xl:col-span-1">
            <Card className="tech-card tech-glow">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
                  Inserir Operações
                </CardTitle>
                <CardDescription>
                  Adicione operações com seus respectivos tempos para gerar o gráfico GBO
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 p-4 bg-gradient-to-br from-muted/30 to-accent/5 rounded-xl border border-accent/20 tech-glow">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                    Cálculo do Takt Time
                  </Label>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label className="text-xs">Tempo do Turno</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="8.0"
                          value={workShiftTime}
                          onChange={(e) => {
                            setWorkShiftTime(e.target.value)
                            validateTaktFields()
                          }}
                          onBlur={validateTaktFields}
                          className={errors.workShiftTime ? "border-red-500 focus:border-red-500" : ""}
                          aria-describedby={errors.workShiftTime ? "shift-time-error" : undefined}
                        />
                        {errors.workShiftTime && (
                          <p id="shift-time-error" className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.workShiftTime}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Unidade</Label>
                        <Select
                          value={timeUnitTakt}
                          onValueChange={(value: "minutes" | "seconds" | "hours") => setTimeUnitTakt(value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes">Min</SelectItem>
                            <SelectItem value="hours">Horas</SelectItem>
                            <SelectItem value="seconds">Seg</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Demanda Diária ({demandUnit}/dia)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          placeholder="100"
                          value={dailyDemand}
                          onChange={(e) => {
                            setDailyDemand(e.target.value)
                            validateTaktFields()
                          }}
                          onBlur={validateTaktFields}
                          className={errors.dailyDemand ? "border-red-500 focus:border-red-500" : ""}
                          aria-describedby={errors.dailyDemand ? "demand-error" : undefined}
                        />
                        <Select value={demandUnit} onValueChange={setDemandUnit}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="peças">Peças</SelectItem>
                            <SelectItem value="m²">m²</SelectItem>
                            <SelectItem value="m³">m³</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="litros">Litros</SelectItem>
                            <SelectItem value="unidades">Unidades</SelectItem>
                            <SelectItem value="metros">Metros</SelectItem>
                            <SelectItem value="toneladas">Toneladas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {errors.dailyDemand && (
                        <p id="demand-error" className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.dailyDemand}
                        </p>
                      )}
                    </div>
                    {calculateTaktTime() && (
                      <Alert className="bg-primary/10 border-primary/20">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <AlertDescription>
                          <strong>Takt Time: </strong>
                          {timeUnitTakt === "hours"
                            ? (calculateTaktTime()! / 3600).toFixed(2)
                            : timeUnitTakt === "minutes"
                              ? (calculateTaktTime()! / 60).toFixed(2)
                              : calculateTaktTime()!.toFixed(2)}{" "}
                          {timeUnitTakt}/{demandUnit.toLowerCase()}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time-unit" className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    Unidade de Tempo
                  </Label>
                  <Select value={timeUnit} onValueChange={(value: "minutes" | "seconds") => setTimeUnit(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutos</SelectItem>
                      <SelectItem value="seconds">Segundos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="operation-name" className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      Nome da Operação
                    </Label>
                    <Input
                      id="operation-name"
                      placeholder="Ex: Montagem, Soldagem, Inspeção..."
                      value={newOperationName}
                      onChange={(e) => {
                        setNewOperationName(e.target.value)
                        if (errors.operationName) {
                          const validation = validateText(e.target.value)
                          if (validation.isValid) {
                            setErrors((prev) => ({ ...prev, operationName: undefined }))
                          }
                        }
                      }}
                      onKeyPress={handleKeyPress}
                      className={errors.operationName ? "border-red-500 focus:border-red-500" : ""}
                      aria-describedby={errors.operationName ? "name-error" : undefined}
                    />
                    {errors.operationName && (
                      <p id="name-error" className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.operationName}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="operation-time" className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      Tempo ({timeUnit})
                    </Label>
                    <Input
                      id="operation-time"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0.0"
                      value={newOperationTime}
                      onChange={(e) => {
                        setNewOperationTime(e.target.value)
                        if (errors.operationTime) {
                          const validation = validateNumber(e.target.value)
                          if (validation.isValid) {
                            setErrors((prev) => ({ ...prev, operationTime: undefined }))
                          }
                        }
                      }}
                      onKeyPress={handleKeyPress}
                      className={errors.operationTime ? "border-red-500 focus:border-red-500" : ""}
                      aria-describedby={errors.operationTime ? "time-error" : undefined}
                    />
                    {errors.operationTime && (
                      <p id="time-error" className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.operationTime}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={addOperation}
                    className="w-full transition-all duration-300 hover:scale-[1.02] tech-glow hover:shadow-lg"
                    disabled={!newOperationName.trim() || !newOperationTime.trim() || isLoading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Operação
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent transition-all duration-300 hover:scale-[1.02] tech-glow"
                    onClick={handleImportExcel}
                    disabled={isLoading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Excel
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-transparent transition-all duration-300 hover:scale-[1.02] tech-glow"
                        disabled={operations.length === 0 || isLoading}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={handleExportPDF}>
                        <FileText className="h-4 w-4 mr-2" />
                        Exportar PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportExcel}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Exportar Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <DraggableOperationsList
                  operations={operations}
                  timeUnit={timeUnit}
                  onReorder={reorderOperations}
                  onRemove={removeOperation}
                />
              </CardContent>
            </Card>
          </div>

          <div className="xl:col-span-2 space-y-6 lg:space-y-8">
            {operations.length > 0 ? (
              <>
                <div className="tech-card tech-glow">
                  <CalculationsDashboard
                    operations={operations}
                    timeUnit={timeUnit}
                    taktTime={calculateTaktTime()}
                    taktTimeUnit={timeUnitTakt}
                    demandUnit={demandUnit}
                  />
                </div>
                <div className="tech-card tech-glow">
                  <GBOChart
                    operations={operations}
                    timeUnit={timeUnit}
                    taktTime={calculateTaktTime()}
                    taktTimeUnit={timeUnitTakt}
                    demandUnit={demandUnit}
                  />
                </div>
              </>
            ) : (
              <Card className="tech-card tech-glow">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 rounded-full bg-muted/30 mb-4">
                    <BarChart3 className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">Nenhuma operação adicionada</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Adicione operações com seus tempos para visualizar o gráfico de balanceamento e as métricas de
                    análise.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
