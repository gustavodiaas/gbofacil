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
  FileSpreadsheet,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  FileImage,
} from "lucide-react"
import { GBOChart } from "@/components/gbo-chart"
import { CalculationsDashboard } from "@/components/calculations-dashboard"
import { DraggableOperationsList } from "@/components/draggable-operations-list"
import { exportToExcel, importFromExcel } from "@/components/export-utils"
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
      toast({ title: "Dados inválidos", description: "Verifique os campos destacados.", variant: "destructive" })
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
    toast({ title: "✅ Operação adicionada", description: `"${newOperation.name}" foi adicionada.` })
  }

  const removeOperation = (id: string) => {
    const operation = operations.find((op) => op.id === id)
    setOperations(operations.filter((op) => op.id !== id))
    if (operation) toast({ title: "Operação removida", description: `"${operation.name}" foi removida.` })
  }

  const reorderOperations = (newOperations: Operation[]) => {
    setOperations(newOperations)
    toast({ title: "✅ Ordem atualizada", description: "A ordem das operações foi reorganizada." })
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
    if (e.key === "Enter") addOperation()
  }

  const handleExportExcel = async () => {
    if (operations.length === 0) return
    setIsLoading(true)
    try {
      await exportToExcel(operations, timeUnit)
      toast({ title: "✅ Excel exportado", description: "A planilha foi baixada." })
    } catch (error) {
      toast({ title: "❌ Erro", description: "Falha ao exportar Excel.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportChartPDF = () => {
    if (operations.length === 0) return
    // Aciona a impressão nativa do navegador focada apenas no gráfico
    window.print()
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
        toast({ title: "Aviso", description: "O arquivo não contém operações válidas.", variant: "destructive" })
        return
      }
      setOperations(importedOperations)
      toast({ title: "✅ Importação concluída", description: `${importedOperations.length} operações carregadas.` })
    } catch (error) {
      toast({ title: "❌ Erro", description: "Falha na importação.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <>
      {/* CSS embutido para isolar o gráfico na hora da impressão/PDF nativo */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .print-chart, .print-chart * { visibility: visible; }
          .print-chart { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            padding: 20px !important;
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}} />

      <div className="min-h-screen bg-background">
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />

      <div className="pt-6 pb-8 px-4 w-full flex justify-center z-50">
        <header className="glass-panel tech-glow rounded-2xl w-full max-w-5xl px-6 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 relative group overflow-hidden">
              <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              {/* Logo Vetorial Integrado */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary relative z-10">
                <path d="M3 3v18h18" />
                <path d="M18 9l-5 5-4-4-5 5" />
                <circle cx="18" cy="9" r="2.5" fill="currentColor" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Análise GBO
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary/80 font-bold">Terminal GBO</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                  <HelpCircle className="h-5 w-5" />
                  <span className="sr-only">Ajuda</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto glass-panel border-primary/20">
                <DialogHeader>
                  <DialogTitle className="text-primary flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 9l-5 5-4-4-5 5"/><circle cx="18" cy="9" r="2.5" fill="currentColor"/></svg>
                    Manual Técnico GBO
                  </DialogTitle>
                  <DialogDescription>Protocolo Analítico de Balanceamento</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm mt-4 text-muted-foreground">
                  <p>
                    O <strong>GBO (Gráfico de Balanceamento de Operações)</strong> é uma ferramenta analítica de fluxo. Ele plota os tempos de ciclo individuais de cada operação em relação ao Takt Time estabelecido.
                  </p>
                  <p>
                    <strong>Objetivo:</strong> Identificar restrições sistêmicas (gargalos) e fornecer uma base de dados limpa para o nivelamento da capacidade produtiva, reduzindo ociosidade e superprodução.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>
      </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-[10px] font-bold tracking-wider uppercase border-primary/30 text-primary bg-primary/5 hidden md:flex px-3 py-1 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.15)] inset-0">
              Active
            </Badge>
            <div className="h-6 w-px bg-border/50 hidden sm:block"></div>
            <ThemeToggle />
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                  <HelpCircle className="h-5 w-5" />
                  <span className="sr-only">Ajuda</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto glass-panel border-primary/20">
                <DialogHeader>
                  <DialogTitle className="text-primary flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" /> Manual do Sistema
                  </DialogTitle>
                  <DialogDescription>Protocolo de uso da Análise GBO</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm mt-4">
                  <p className="text-muted-foreground">
                    O GBO identifica gargalos comparando os tempos operacionais com o Takt Time. Utilize os controles para mapear o fluxo.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>
      </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-6 lg:gap-8 xl:grid-cols-3">
            <div className="xl:col-span-1">
              <Card className="tech-card tech-glow">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
                    Inserir Operações
                  </CardTitle>
                  <CardDescription>Adicione operações para gerar o gráfico GBO</CardDescription>
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
                            onChange={(e) => { setWorkShiftTime(e.target.value); validateTaktFields(); }}
                            onBlur={validateTaktFields}
                            className={errors.workShiftTime ? "border-red-500 focus:border-red-500" : ""}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Unidade</Label>
                          <Select value={timeUnitTakt} onValueChange={(v: any) => setTimeUnitTakt(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
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
                            onChange={(e) => { setDailyDemand(e.target.value); validateTaktFields(); }}
                            onBlur={validateTaktFields}
                            className={errors.dailyDemand ? "border-red-500 focus:border-red-500" : ""}
                          />
                          <Select value={demandUnit} onValueChange={setDemandUnit}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
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
                      </div>
                      {calculateTaktTime() && (
                        <Alert className="bg-primary/10 border-primary/20">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <AlertDescription>
                            <strong>Takt Time: </strong>
                            {timeUnitTakt === "hours" ? (calculateTaktTime()! / 3600).toFixed(2)
                              : timeUnitTakt === "minutes" ? (calculateTaktTime()! / 60).toFixed(2)
                              : calculateTaktTime()!.toFixed(2)} {timeUnitTakt}/{demandUnit.toLowerCase()}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      Unidade de Tempo
                    </Label>
                    <Select value={timeUnit} onValueChange={(v: any) => setTimeUnit(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutos</SelectItem>
                        <SelectItem value="seconds">Segundos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                        Nome da Operação
                      </Label>
                      <Input
                        placeholder="Ex: Montagem, Soldagem..."
                        value={newOperationName}
                        onChange={(e) => {
                          setNewOperationName(e.target.value)
                          if (errors.operationName) setErrors((prev) => ({ ...prev, operationName: undefined }))
                        }}
                        onKeyPress={handleKeyPress}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                        Tempo ({timeUnit})
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0.0"
                        value={newOperationTime}
                        onChange={(e) => {
                          setNewOperationTime(e.target.value)
                          if (errors.operationTime) setErrors((prev) => ({ ...prev, operationTime: undefined }))
                        }}
                        onKeyPress={handleKeyPress}
                      />
                    </div>
                    <Button
                      onClick={addOperation}
                      className="w-full tech-glow"
                      disabled={!newOperationName.trim() || !newOperationTime.trim() || isLoading}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Adicionar Operação
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" size="sm" className="flex-1 tech-glow" onClick={handleImportExcel} disabled={isLoading}>
                      <Upload className="h-4 w-4 mr-2" /> Importar
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1 tech-glow" disabled={operations.length === 0 || isLoading}>
                          <Download className="h-4 w-4 mr-2" /> Exportar
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={handleExportChartPDF}>
                          <FileImage className="h-4 w-4 mr-2" /> Exportar Gráfico (PDF)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportExcel}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Planilha (Excel)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <DraggableOperationsList operations={operations} timeUnit={timeUnit} onReorder={reorderOperations} onRemove={removeOperation} />
                </CardContent>
              </Card>
            </div>

            <div className="xl:col-span-2 space-y-6 lg:space-y-8">
              {operations.length > 0 ? (
                <>
                  <div className="tech-card tech-glow">
                    <CalculationsDashboard operations={operations} timeUnit={timeUnit} taktTime={calculateTaktTime()} taktTimeUnit={timeUnitTakt} demandUnit={demandUnit} />
                  </div>
                  {/* A classe print-chart avisa o CSS que APENAS ESTA DIV será impressa */}
                  <div className="tech-card tech-glow p-4 rounded-lg bg-card print-chart">
                    <GBOChart operations={operations} timeUnit={timeUnit} taktTime={calculateTaktTime()} taktTimeUnit={timeUnitTakt} demandUnit={demandUnit} />
                  </div>
                </>
              ) : (
                <Card className="tech-card tech-glow">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="p-4 rounded-full bg-muted/30 mb-4">
                      <BarChart3 className="h-16 w-16 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-muted-foreground mb-2">Nenhuma operação adicionada</h3>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
