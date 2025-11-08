import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Save, Calculator, Settings, Info, Download, ChevronDown, ChevronUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import html2canvas from "html2canvas";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SalesPlanConfig {
  id: string;
  plan_type: string;
  config: any;
  is_active: boolean;
}

const SalesPlanConfig = () => {
  const [configs, setConfigs] = useState<Record<string, SalesPlanConfig>>({});
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');
  
  // CrediContado Config
  const [availableInstallments, setAvailableInstallments] = useState<number[]>([]);
  const [percentages, setPercentages] = useState<Record<number, number>>({});
  
  // Crédito Config
  const [monthlyInterestRate, setMonthlyInterestRate] = useState(2.5);
  const [retanqueoInterestRate, setRetanqueoInterestRate] = useState(1.60);
  const [avalCobrador, setAvalCobrador] = useState(1.5);
  const [testCapital, setTestCapital] = useState(1000000);
  const [testTerm, setTestTerm] = useState(12);
  const [amortizationTable, setAmortizationTable] = useState<any[]>([]);
  const [testAmortizationType, setTestAmortizationType] = useState<'arpesod' | 'retanqueo'>('arpesod');
  
  // Estados para simulaciones en Venta Crédito
  const [testInicialMayor, setTestInicialMayor] = useState(false);
  const [testInicialMayorValue, setTestInicialMayorValue] = useState(0);
  const [testRetanqueoEdC, setTestRetanqueoEdC] = useState(false);
  const [testSaldoArpesod, setTestSaldoArpesod] = useState(0);
  const [testRetanqueoFS, setTestRetanqueoFS] = useState(false);
  const [testSaldoFinansuenos, setTestSaldoFinansuenos] = useState(0);
  const [testAdjustedBasePrice, setTestAdjustedBasePrice] = useState(0);
  const [testOriginalMonthlyPayment, setTestOriginalMonthlyPayment] = useState(0);
  
  // Nuevo Modelo Crédito
  const [newModelBasePrice, setNewModelBasePrice] = useState(0);
  const [newModelTermType, setNewModelTermType] = useState<'corto' | 'largo' | ''>('');
  const [newModelInstallments, setNewModelInstallments] = useState<number>(3);
  const [newModelClientType, setNewModelClientType] = useState<string>('AAA');
  const [newModelMonthlyRate, setNewModelMonthlyRate] = useState(2.5);
  const [newModelRetanqueoRate, setNewModelRetanqueoRate] = useState(1.60);
  const [newModelTecAdm, setNewModelTecAdm] = useState(5);
  const [newModelSeguro1, setNewModelSeguro1] = useState(4);
  const [newModelSeguro2Formula, setNewModelSeguro2Formula] = useState(0.17);
  const [newModelRateType, setNewModelRateType] = useState<'mensual' | 'retanqueo'>('mensual');
  const [newModelAmortizationTable, setNewModelAmortizationTable] = useState<any[]>([]);
  const [newModelTotalInitial, setNewModelTotalInitial] = useState(0);
  const [newModelMinimumInitial, setNewModelMinimumInitial] = useState(0);
  const [newModelAdditionalInitial, setNewModelAdditionalInitial] = useState(0);
  const [newModelInitialPercent, setNewModelInitialPercent] = useState(0);
  const [newModelDiscountPercent, setNewModelDiscountPercent] = useState(0);
  const [newModelDiscountAmount, setNewModelDiscountAmount] = useState(0);
  const [newModelNewBaseFS, setNewModelNewBaseFS] = useState(0);
  const [newModelFinancedAmount, setNewModelFinancedAmount] = useState(0);
  const [newModelInicialMayorLargo, setNewModelInicialMayorLargo] = useState(false);
  const [newModelInicialMayorValueLargo, setNewModelInicialMayorValueLargo] = useState(0);
  const [clientTypeConfig, setClientTypeConfig] = useState<Record<string, { ci: number; fga: number }>>({
    'AAA': { ci: 0, fga: 0.25 },
    'AA': { ci: 0, fga: 0.25 },
    'A': { ci: 5, fga: 0.50 },
    'BBB': { ci: 5, fga: 0.50 },
    'BB': { ci: 10, fga: 1.00 },
    'B': { ci: 10, fga: 1.50 },
  });
  
  // Configuración de rangos de descuento para corto plazo
  const [discountRanges, setDiscountRanges] = useState([
    { minPercent: 70, maxPercent: 100, discount: 25 },
    { minPercent: 45, maxPercent: 69.999, discount: 20 },
    { minPercent: 29.999, maxPercent: 44.999, discount: 15 },
  ]);

  const [showHistory, setShowHistory] = useState(false);
  const [discountHistory, setDiscountHistory] = useState<any[]>([]);

  useEffect(() => {
    loadConfigs();
    fetchDiscountHistory();
    loadUserEmail();
  }, []);

  const loadUserEmail = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      setUserEmail(user.email);
    }
  };

  const fetchDiscountHistory = async () => {
    const { data, error } = await supabase
      .from('discount_ranges_history')
      .select('*')
      .eq('plan_type', 'nuevo_modelo_credito')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching discount history:', error);
      return;
    }

    setDiscountHistory(data || []);
    
    // Cargar el rango más reciente como actual
    if (data && data.length > 0) {
      const latestRanges = data[0].ranges as Array<{minPercent: number, maxPercent: number, discount: number}>;
      setDiscountRanges(latestRanges);
    }
  };

  const saveDiscountRanges = async () => {
    const { error } = await supabase
      .from('discount_ranges_history')
      .insert({
        ranges: discountRanges,
        plan_type: 'nuevo_modelo_credito',
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });

    if (error) {
      console.error('Error saving discount ranges:', error);
      toast.error("No se pudo guardar la tabla");
      return;
    }

    toast.success("Tabla guardada exitosamente");
    fetchDiscountHistory();
  };

  const loadConfigs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sales_plan_config")
      .select("*");

    if (error) {
      toast.error("Error al cargar configuraciones");
      console.error(error);
    } else {
      const configMap: Record<string, SalesPlanConfig> = {};
      data?.forEach(config => {
        configMap[config.plan_type] = config;
      });
      setConfigs(configMap);
      
      // Load CrediContado config
      if (configMap.credicontado) {
        const config = configMap.credicontado.config;
        setAvailableInstallments(config.available_installments || []);
        setPercentages(config.percentage_per_installment || {});
      }
      
      // Load Crédito config
      if (configMap.credito) {
        const config = configMap.credito.config;
        const creditoMonthlyRate = config.monthly_interest_rate || 2.5;
        setMonthlyInterestRate(creditoMonthlyRate);
        setRetanqueoInterestRate(config.retanqueo_interest_rate || 1.60);
        setAvalCobrador(config.aval_cobrador_percentage || 1.5);
        // Sincronizar con el nuevo modelo
        setNewModelMonthlyRate(creditoMonthlyRate);
        setNewModelRetanqueoRate(config.retanqueo_interest_rate || 1.60);
      }
    }
    setLoading(false);
  };

  const handleInstallmentToggle = (installment: number, checked: boolean) => {
    if (checked) {
      setAvailableInstallments([...availableInstallments, installment].sort((a, b) => a - b));
      if (!percentages[installment]) {
        setPercentages({ ...percentages, [installment]: 5 });
      }
    } else {
      setAvailableInstallments(availableInstallments.filter(i => i !== installment));
    }
  };

  const handleAmortizationTypeChange = (type: 'arpesod' | 'retanqueo') => {
    setTestAmortizationType(type);
    setAmortizationTable([]);
    // Resetear simulaciones
    setTestInicialMayor(false);
    setTestInicialMayorValue(0);
    setTestRetanqueoEdC(false);
    setTestSaldoArpesod(0);
    setTestRetanqueoFS(false);
    setTestSaldoFinansuenos(0);
    setTestAdjustedBasePrice(0);
    setTestOriginalMonthlyPayment(0);
  };

  const handlePercentageChange = (installment: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    setPercentages({ ...percentages, [installment]: numValue });
  };

  const saveCrediContadoConfig = async () => {
    const config = {
      available_installments: availableInstallments,
      percentage_per_installment: percentages,
    };

    const { error } = await supabase
      .from("sales_plan_config")
      .update({ config })
      .eq("plan_type", "credicontado");

    if (error) {
      toast.error("Error al guardar configuración");
      console.error(error);
    } else {
      toast.success("Configuración de CrediContado guardada");
      loadConfigs();
    }
  };

  const calculateAmortization = () => {
    let capital = testCapital;
    // Determinar tasa según el tipo seleccionado en radio button
    // "Crédito Arpesod" usa monthlyInterestRate, "Retanqueo FS" usa retanqueoInterestRate
    const interestRate = testAmortizationType === 'arpesod' ? monthlyInterestRate : retanqueoInterestRate;
    let monthlyRate = interestRate / 100;
    const avalRate = avalCobrador / 100;
    const term = testTerm;
    
    const originalCapital = testCapital;
    
    // Calcular cuota original con el capital original
    const r_original = monthlyRate;
    const n_original = term;
    const onePlusR_original = 1 + r_original;
    const onePlusRtoN_original = Math.pow(onePlusR_original, n_original);
    const baseMonthlyPayment_original = originalCapital * (r_original * onePlusRtoN_original) / (onePlusRtoN_original - 1);
    const avalPayment_original = originalCapital * avalRate;
    const originalPayment = baseMonthlyPayment_original + avalPayment_original;
    
    setTestOriginalMonthlyPayment(originalPayment);
    
    // Aplicar lógica según las opciones seleccionadas
    if (testAmortizationType === 'arpesod') {
      // Lógica para Crédito Arpesod
      if (testRetanqueoEdC && testSaldoArpesod > 0) {
        // Retanqueo EdC a FS
        const currentMonthlyPayment = Math.ceil(originalPayment / 1000) * 1000;
        const pagoTotal = currentMonthlyPayment * term;
        const nuevoTotal = pagoTotal + testSaldoArpesod;
        const nuevaCuotaSinRedondear = nuevoTotal / term;
        const nuevaCuotaObjetivo = Math.ceil(nuevaCuotaSinRedondear / 1000) * 1000;
        
        // Función auxiliar para calcular la cuota mensual SIN redondear dada una base
        const calcularCuotaSinRedondear = (base: number): number => {
          const r = monthlyRate;
          const n = term;
          const fixedPaymentWithoutAval = base * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
          const avalFijo = base * avalRate;
          return fixedPaymentWithoutAval + avalFijo;
        };
        
        // Buscar la base cuya cuota sin redondear sea más cercana al objetivo
        let mejorBase = originalCapital;
        let menorDiferencia = Infinity;
        
        const baseMin = Math.max(originalCapital, nuevoTotal * 0.5);
        const baseMax = nuevoTotal * 1.5;
        
        for (let base = baseMin; base <= baseMax; base += 1000) {
          const cuotaSinRedondear = calcularCuotaSinRedondear(base);
          const cuotaRedondeada = Math.ceil(cuotaSinRedondear / 1000) * 1000;
          
          if (cuotaRedondeada >= nuevaCuotaObjetivo) {
            const diferencia = Math.abs(cuotaSinRedondear - nuevaCuotaObjetivo);
            
            if (diferencia < menorDiferencia) {
              menorDiferencia = diferencia;
              mejorBase = base;
            }
            
            if (diferencia < 100) {
              break;
            }
          }
        }
        
        const nuevaBase = Math.round(mejorBase / 1000) * 1000;
        capital = nuevaBase;
        setTestAdjustedBasePrice(nuevaBase);
      } else if (testInicialMayor && testInicialMayorValue > 0) {
        // Inicial Mayor
        const roundedOriginalPayment = Math.ceil(originalPayment / 1000) * 1000;
        
        if (testInicialMayorValue < roundedOriginalPayment) {
          toast.error(`La inicial mayor debe ser al menos $${roundedOriginalPayment.toLocaleString()}`);
          return;
        }
        
        const excess = testInicialMayorValue - roundedOriginalPayment;
        capital = originalCapital - excess;
        setTestAdjustedBasePrice(capital);
      }
    } else if (testAmortizationType === 'retanqueo') {
      // Lógica para cuando el radio button "Retanqueo FS" está seleccionado
      // Esto ya usa automáticamente retanqueoInterestRate (línea 184)
      
      if (testRetanqueoFS && testSaldoFinansuenos > 0) {
        // Checkbox "Retanqueo FS a FS": suma el saldo de FinanSueños al capital
        capital = originalCapital + testSaldoFinansuenos;
        setTestAdjustedBasePrice(capital);
      } else if (testInicialMayor && testInicialMayorValue > 0) {
        // Inicial Mayor con tasa de retanqueo
        const roundedOriginalPayment = Math.ceil(originalPayment / 1000) * 1000;
        
        if (testInicialMayorValue < roundedOriginalPayment) {
          toast.error(`La inicial mayor debe ser al menos $${roundedOriginalPayment.toLocaleString()}`);
          return;
        }
        
        const excess = testInicialMayorValue - roundedOriginalPayment;
        capital = originalCapital - excess;
        setTestAdjustedBasePrice(capital);
      }
    }
    
    // Calcular cuota base usando método francés (cuota fija)
    // PMT = P × (r × (1+r)^n) / ((1+r)^n - 1)
    const r = monthlyRate;
    const n = term;
    const onePlusR = 1 + r;
    const onePlusRtoN = Math.pow(onePlusR, n);
    const baseMonthlyPayment = capital * (r * onePlusRtoN) / (onePlusRtoN - 1);
    
    // Aval fijo mensual (porcentaje del capital ajustado)
    const avalPayment = capital * avalRate;
    
    const table = [];
    let remainingCapital = capital;

    for (let month = 1; month <= term; month++) {
      // Interés sobre saldo pendiente
      const interest = remainingCapital * monthlyRate;
      
      // Abono a capital (va aumentando cada mes)
      const capitalPayment = baseMonthlyPayment - interest;
      
      // Total mensual = abono a capital + interés + aval
      const totalMonthlyBeforeRounding = capitalPayment + interest + avalPayment;
      
      // Redondear al millar superior
      const totalMonthly = Math.ceil(totalMonthlyBeforeRounding / 1000) * 1000;
      
      table.push({
        month,
        capital: capitalPayment,
        interest,
        aval: avalPayment,
        total: totalMonthly,
        remainingCapital: remainingCapital - capitalPayment,
      });
      
      remainingCapital -= capitalPayment;
    }
    
    setAmortizationTable(table);
  };

  const saveCreditoConfig = async () => {
    const config = {
      monthly_interest_rate: monthlyInterestRate,
      retanqueo_interest_rate: retanqueoInterestRate,
      aval_cobrador_percentage: avalCobrador,
      available_terms: configs.credito?.config?.available_terms || [9, 11, 14, 17],
    };

    const { error } = await supabase
      .from("sales_plan_config")
      .update({ config })
      .eq("plan_type", "credito");

    if (error) {
      toast.error("Error al guardar configuración");
      console.error(error);
    } else {
      toast.success("Configuración de Crédito guardada");
      // Sincronizar tasas con el nuevo modelo
      setNewModelMonthlyRate(monthlyInterestRate);
      setNewModelRetanqueoRate(retanqueoInterestRate);
      loadConfigs();
    }
  };

  if (loading) {
    return <p>Cargando configuraciones...</p>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="credicontado">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="credicontado">Venta CrediContado</TabsTrigger>
          <TabsTrigger value="credito">Venta Crédito</TabsTrigger>
          <TabsTrigger value="nuevomodelo">Nuevo Modelo Crédito</TabsTrigger>
        </TabsList>

        <TabsContent value="credicontado">
          <Card>
            <CardHeader>
              <CardTitle>Configuración CrediContado</CardTitle>
              <CardDescription>
                Define las cuotas disponibles y el porcentaje adicional por cada cuota
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {[2, 3, 4, 5, 6].map((installment) => (
                  <div key={installment} className="flex items-center gap-4">
                    <Checkbox
                      id={`installment-${installment}`}
                      checked={availableInstallments.includes(installment)}
                      onCheckedChange={(checked) => handleInstallmentToggle(installment, checked as boolean)}
                    />
                    <Label htmlFor={`installment-${installment}`} className="flex-1">
                      {installment} cuotas
                    </Label>
                    {availableInstallments.includes(installment) && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={percentages[installment] || 0}
                          onChange={(e) => handlePercentageChange(installment, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">% adicional</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button onClick={saveCrediContadoConfig} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credito">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración Venta Crédito</CardTitle>
                <CardDescription>
                  Define la tasa de interés y el aval cobrador
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="monthlyInterest">Tasa de Interés Mensual (%)</Label>
                    <Input
                      id="monthlyInterest"
                      type="number"
                      step="0.1"
                      value={monthlyInterestRate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMonthlyInterestRate(val === '' ? 0 : parseFloat(val));
                      }}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="retanqueoInterest">Tasa de Interés Retanqueo (%)</Label>
                    <Input
                      id="retanqueoInterest"
                      type="number"
                      step="0.01"
                      value={retanqueoInterestRate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRetanqueoInterestRate(val === '' ? 0 : parseFloat(val));
                      }}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="avalCobrador">Aval Cobrador (% mensual)</Label>
                    <Input
                      id="avalCobrador"
                      type="number"
                      step="0.1"
                      value={avalCobrador}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAvalCobrador(val === '' ? 0 : parseFloat(val));
                      }}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                </div>

                <Button onClick={saveCreditoConfig} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Configuración
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tabla de Amortización de Prueba</CardTitle>
                <CardDescription>
                  Verifica el cálculo con valores de ejemplo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 mb-4">
                  <Label className="text-base font-semibold">Tipo de Prueba</Label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="arpesod"
                        name="testType"
                        value="arpesod"
                        checked={testAmortizationType === 'arpesod'}
                        onChange={(e) => handleAmortizationTypeChange(e.target.value as 'arpesod' | 'retanqueo')}
                        className="w-4 h-4"
                      />
                      <label htmlFor="arpesod" className="cursor-pointer">Crédito Arpesod</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="retanqueo"
                        name="testType"
                        value="retanqueo"
                        checked={testAmortizationType === 'retanqueo'}
                        onChange={(e) => handleAmortizationTypeChange(e.target.value as 'arpesod' | 'retanqueo')}
                        className="w-4 h-4"
                      />
                      <label htmlFor="retanqueo" className="cursor-pointer">Retanqueo FS</label>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="testCapital" className="text-sm font-medium">Capital de Prueba</Label>
                    <Input
                      id="testCapital"
                      type="number"
                      value={testCapital}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTestCapital(val === '' ? 0 : parseFloat(val));
                      }}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="testTerm" className="text-sm font-medium">Plazo (meses)</Label>
                    <Input
                      id="testTerm"
                      type="number"
                      value={testTerm}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTestTerm(val === '' ? 0 : parseInt(val));
                      }}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                </div>

                {/* Opciones de simulación */}
                <div className="space-y-4 border-t pt-4">
                  <Label className="text-base font-semibold">Opciones de Simulación</Label>
                  
                  {/* Cuota Inicial Mayor */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="testInicialMayor"
                        checked={testInicialMayor}
                        onCheckedChange={(checked) => setTestInicialMayor(checked as boolean)}
                      />
                      <Label htmlFor="testInicialMayor" className="cursor-pointer">Cuota Inicial Mayor</Label>
                    </div>
                    {testInicialMayor && (
                      <Input
                        type="number"
                        placeholder="Valor de la cuota inicial mayor"
                        value={testInicialMayorValue || ''}
                        onChange={(e) => setTestInicialMayorValue(parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                      />
                    )}
                  </div>

                  {/* Retanqueo EdC a FS - solo visible en modo Arpesod */}
                  {testAmortizationType === 'arpesod' && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="testRetanqueoEdC"
                          checked={testRetanqueoEdC}
                          onCheckedChange={(checked) => {
                            setTestRetanqueoEdC(checked as boolean);
                            if (checked) {
                              setTestRetanqueoFS(false);
                              setTestSaldoFinansuenos(0);
                            }
                          }}
                        />
                        <Label htmlFor="testRetanqueoEdC" className="cursor-pointer">Retanqueo EdC a FS</Label>
                      </div>
                      {testRetanqueoEdC && (
                        <Input
                          type="number"
                          placeholder="Saldo Arpesod"
                          value={testSaldoArpesod || ''}
                          onChange={(e) => setTestSaldoArpesod(parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                        />
                      )}
                    </div>
                  )}

                  {/* Retanqueo FS a FS - solo visible en modo Retanqueo */}
                  {testAmortizationType === 'retanqueo' && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="testRetanqueoFS"
                          checked={testRetanqueoFS}
                          onCheckedChange={(checked) => {
                            setTestRetanqueoFS(checked as boolean);
                            if (checked) {
                              setTestRetanqueoEdC(false);
                              setTestSaldoArpesod(0);
                            }
                          }}
                        />
                        <Label htmlFor="testRetanqueoFS" className="cursor-pointer">Retanqueo FS a FS</Label>
                      </div>
                      {testRetanqueoFS && (
                        <Input
                          type="number"
                          placeholder="Saldo FinanSueños"
                          value={testSaldoFinansuenos || ''}
                          onChange={(e) => setTestSaldoFinansuenos(parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                        />
                      )}
                    </div>
                  )}
                </div>

                <Button onClick={calculateAmortization} variant="outline" className="w-full">
                  <Calculator className="w-4 h-4 mr-2" />
                  Calcular Tabla de Amortización
                </Button>

                {amortizationTable.length > 0 && (
                  <div className="space-y-4">
                    {/* Información de la simulación */}
                    {(testInicialMayor || testRetanqueoEdC || testRetanqueoFS) && (
                      <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                        <p className="font-semibold">Información de Simulación:</p>
                        {testOriginalMonthlyPayment > 0 && (
                          <p>Cuota Original: ${Math.ceil(testOriginalMonthlyPayment / 1000) * 1000}</p>
                        )}
                        {testInicialMayor && testInicialMayorValue > 0 && (
                          <p>Cuota Inicial Mayor: ${testInicialMayorValue.toLocaleString()}</p>
                        )}
                        {testRetanqueoEdC && testSaldoArpesod > 0 && (
                          <p>Retanqueo EdC a FS - Saldo: ${testSaldoArpesod.toLocaleString()}</p>
                        )}
                        {testRetanqueoFS && testSaldoFinansuenos > 0 && (
                          <p>Retanqueo FS a FS - Saldo: ${testSaldoFinansuenos.toLocaleString()}</p>
                        )}
                        {testAdjustedBasePrice > 0 && testAdjustedBasePrice !== testCapital && (
                          <p>Base Ajustada: ${testAdjustedBasePrice.toLocaleString()}</p>
                        )}
                      </div>
                    )}
                    
                    <div className="rounded-md border overflow-auto max-h-96">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs sm:text-sm whitespace-nowrap">Mes</TableHead>
                              <TableHead className="text-xs sm:text-sm text-right whitespace-nowrap">Capital</TableHead>
                              <TableHead className="text-xs sm:text-sm text-right whitespace-nowrap">Interés</TableHead>
                              <TableHead className="text-xs sm:text-sm text-right whitespace-nowrap">Aval</TableHead>
                              <TableHead className="text-xs sm:text-sm text-right whitespace-nowrap">Total</TableHead>
                              <TableHead className="text-xs sm:text-sm text-right whitespace-nowrap">Saldo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {amortizationTable.map((row) => (
                              <TableRow key={row.month}>
                                <TableCell className="text-xs sm:text-sm">{row.month}</TableCell>
                                <TableCell className="text-xs sm:text-sm text-right">
                                  ${row.capital.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm text-right">
                                  ${row.interest.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm text-right">
                                  ${row.aval.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm text-right font-medium">
                                  ${row.total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm text-right text-muted-foreground">
                                  ${row.remainingCapital.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="nuevomodelo">
          <Card>
            <CardHeader>
              <CardTitle>Nuevo Modelo de Crédito</CardTitle>
              <CardDescription>
                Realiza cálculos rápidos de amortización con parámetros personalizados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <TooltipProvider>
                <div className="grid gap-3 md:grid-cols-5 text-sm">
                  <div className="grid gap-1.5">
                    <Label htmlFor="newModelMonthlyRate" className="text-xs">Tasa Int. Mensual (%)</Label>
                    <Input
                      id="newModelMonthlyRate"
                      type="number"
                      step="0.1"
                      value={newModelMonthlyRate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewModelMonthlyRate(val === '' ? 0 : parseFloat(val));
                      }}
                      onFocus={(e) => e.target.select()}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="newModelRetanqueoRate" className="text-xs">Tasa Int. Retanqueo (%)</Label>
                    <Input
                      id="newModelRetanqueoRate"
                      type="number"
                      step="0.01"
                      value={newModelRetanqueoRate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewModelRetanqueoRate(val === '' ? 0 : parseFloat(val));
                      }}
                      onFocus={(e) => e.target.select()}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="newModelTecAdm" className="text-xs">Tec/Adm (%)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Aplicado sobre el desembolsado dividido en todas las cuotas</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="newModelTecAdm"
                      type="number"
                      step="0.1"
                      value={newModelTecAdm}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewModelTecAdm(val === '' ? 0 : parseFloat(val));
                      }}
                      onFocus={(e) => e.target.select()}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="newModelSeguro1" className="text-xs">Seguro 1 (%)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Seguro de Incapacidad</p>
                          <p className="text-xs text-muted-foreground">Se aplica sobre el valor de la cuota</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="newModelSeguro1"
                      type="number"
                      step="0.1"
                      value={newModelSeguro1}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewModelSeguro1(val === '' ? 0 : parseFloat(val));
                      }}
                      onFocus={(e) => e.target.select()}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="newModelSeguro2" className="text-xs">Seguro 2</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs font-medium">Seguro Vida Deudor</p>
                          <p className="text-xs text-muted-foreground">Fórmula: (Saldo Capital × {newModelSeguro2Formula}) / 1000</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="newModelSeguro2"
                      type="number"
                      step="0.01"
                      value={newModelSeguro2Formula}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewModelSeguro2Formula(val === '' ? 0 : parseFloat(val));
                      }}
                      onFocus={(e) => e.target.select()}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </TooltipProvider>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="newModelBasePrice">Precio Base</Label>
                  <Input
                    id="newModelBasePrice"
                    type="number"
                    step="1000"
                    min="0"
                    value={newModelBasePrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewModelBasePrice(val === '' ? 0 : parseFloat(val));
                    }}
                    onFocus={(e) => e.target.select()}
                    placeholder="Ingrese el precio base"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <div className="grid gap-2 flex-1">
                    <Label htmlFor="clientType">Tipo Cliente:</Label>
                    <Select value={newModelClientType} onValueChange={setNewModelClientType}>
                      <SelectTrigger id="clientType">
                        <SelectValue placeholder="Seleccione tipo de cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AAA">AAA</SelectItem>
                        <SelectItem value="AA">AA</SelectItem>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="BBB">BBB</SelectItem>
                        <SelectItem value="BB">BB</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" className="shrink-0">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Configuración por Tipo de Cliente</DialogTitle>
                        <DialogDescription>
                          Define el porcentaje de Cuota Inicial (C.I.) y FGA para cada tipo de cliente
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tipo Cliente</TableHead>
                              <TableHead className="text-right">C.I. (%)</TableHead>
                              <TableHead className="text-right">FGA (%)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.keys(clientTypeConfig).map((type) => (
                              <TableRow key={type}>
                                <TableCell className="font-medium">{type}</TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={clientTypeConfig[type].ci}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setClientTypeConfig({
                                        ...clientTypeConfig,
                                        [type]: {
                                          ...clientTypeConfig[type],
                                          ci: val === '' ? 0 : parseFloat(val)
                                        }
                                      });
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    className="text-right"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={clientTypeConfig[type].fga}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setClientTypeConfig({
                                        ...clientTypeConfig,
                                        [type]: {
                                          ...clientTypeConfig[type],
                                          fga: val === '' ? 0 : parseFloat(val)
                                        }
                                      });
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    className="text-right"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="ml-2">
                        <Settings className="h-4 w-4 mr-2" />
                        Descuentos Corto Plazo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <div className="flex items-center justify-between">
                          <div className="space-y-1.5">
                            <DialogTitle>Configuración de Descuentos por Cuota Inicial (Corto Plazo)</DialogTitle>
                            <DialogDescription>
                              Define los rangos de porcentaje de cuota inicial y el descuento aplicable sobre el precio base
                            </DialogDescription>
                          </div>
                          <div className="flex items-center gap-3">
                            <Button 
                              onClick={saveDiscountRanges}
                              size="sm"
                            >
                              Guardar Tabla
                            </Button>
                            <button
                              onClick={() => setShowHistory(true)}
                              className="text-sm text-muted-foreground underline hover:text-foreground transition-colors"
                            >
                              Historico
                            </button>
                          </div>
                        </div>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>% Mínimo</TableHead>
                              <TableHead>% Máximo</TableHead>
                              <TableHead className="text-right">Descuento (%)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {discountRanges.map((range, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    max="100"
                                    value={range.minPercent}
                                    onChange={(e) => {
                                      const newRanges = [...discountRanges];
                                      newRanges[index].minPercent = parseFloat(e.target.value) || 0;
                                      setDiscountRanges(newRanges);
                                    }}
                                    onFocus={(e) => e.target.select()}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    max="100"
                                    value={range.maxPercent}
                                    onChange={(e) => {
                                      const newRanges = [...discountRanges];
                                      newRanges[index].maxPercent = parseFloat(e.target.value) || 0;
                                      setDiscountRanges(newRanges);
                                    }}
                                    onFocus={(e) => e.target.select()}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="1"
                                    min="0"
                                    max="100"
                                    value={range.discount}
                                    onChange={(e) => {
                                      const newRanges = [...discountRanges];
                                      newRanges[index].discount = parseFloat(e.target.value) || 0;
                                      setDiscountRanges(newRanges);
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    className="text-right"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Plazo</Label>
                  <div className="flex gap-4 items-center h-10">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="corto"
                        name="termType"
                        value="corto"
                        checked={newModelTermType === 'corto'}
                        onChange={(e) => {
                          setNewModelTermType(e.target.value as 'corto' | 'largo');
                          setNewModelInstallments(3);
                          setNewModelAmortizationTable([]);
                        }}
                        className="w-4 h-4"
                      />
                      <label htmlFor="corto" className="cursor-pointer text-sm">Corto Plazo</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="largo"
                        name="termType"
                        value="largo"
                        checked={newModelTermType === 'largo'}
                        onChange={(e) => {
                          setNewModelTermType(e.target.value as 'corto' | 'largo');
                          setNewModelInstallments(9);
                        }}
                        className="w-4 h-4"
                      />
                      <label htmlFor="largo" className="cursor-pointer text-sm">Largo Plazo</label>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="newModelInstallments">No. Cuotas</Label>
                  <Select 
                    value={newModelInstallments.toString()} 
                    onValueChange={(value) => setNewModelInstallments(parseInt(value))}
                    disabled={!newModelTermType}
                  >
                    <SelectTrigger id="newModelInstallments">
                      <SelectValue placeholder="Seleccione número de cuotas" />
                    </SelectTrigger>
                    <SelectContent>
                      {newModelTermType === 'corto' ? (
                        <>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="6">6</SelectItem>
                        </>
                      ) : newModelTermType === 'largo' ? (
                        <>
                          <SelectItem value="9">9</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="11">11</SelectItem>
                          <SelectItem value="12">12</SelectItem>
                          <SelectItem value="13">13</SelectItem>
                          <SelectItem value="14">14</SelectItem>
                          <SelectItem value="15">15</SelectItem>
                          <SelectItem value="16">16</SelectItem>
                          <SelectItem value="17">17</SelectItem>
                          <SelectItem value="18">18</SelectItem>
                        </>
                      ) : (
                        <SelectItem value="0">Seleccione un plazo primero</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newModelTermType === 'corto' && (
                <div className="space-y-6 p-4 border rounded-lg bg-muted/30">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="newModelTotalInitial">Cuota Inicial</Label>
                      <Input
                        id="newModelTotalInitial"
                        type="number"
                        step="1000"
                        min="0"
                        value={newModelTotalInitial}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewModelTotalInitial(val === '' ? 0 : parseFloat(val));
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder="Ingrese la cuota inicial en pesos"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={() => {
                      if (!newModelBasePrice || newModelBasePrice <= 0) {
                        toast.error("Por favor ingrese un Precio Base válido");
                        return;
                      }
                      
                      if (newModelTotalInitial <= 0) {
                        toast.error("Ingrese una cuota inicial válida");
                        return;
                      }
                      
                      // Función para redondear a la centena superior cerrada en 0, 500 o 1000
                      const roundToNearestFiveHundred = (value: number): number => {
                        return Math.ceil(value / 500) * 500;
                      };
                      
                      const basePrice = newModelBasePrice;
                      const clientConfig = clientTypeConfig[newModelClientType];
                      
                      // 1. Calcular el % que representa la Cuota Inicial ingresada sobre el Precio Base
                      const initialPercent = (newModelTotalInitial / basePrice) * 100;
                      
                      // Ordenar rangos por minPercent ascendente
                      const sortedRanges = [...discountRanges].sort((a, b) => a.minPercent - b.minPercent);
                      const minRange = sortedRanges[0];
                      const maxRange = sortedRanges[sortedRanges.length - 1];
                      
                      // Validar si el porcentaje está fuera de los rangos
                      if (initialPercent < minRange.minPercent) {
                        toast.error("Valor bajo, no aplica descuentos");
                        return;
                      }
                      
                      if (initialPercent > maxRange.maxPercent) {
                        toast.error("Inicial muy alta. Revisar precio Contado");
                        return;
                      }
                      
                      // 2. Determinar el descuento aplicable según el %
                      let discountPercent = 0;
                      for (const range of discountRanges) {
                        if (initialPercent >= range.minPercent && initialPercent <= range.maxPercent) {
                          discountPercent = range.discount;
                          break;
                        }
                      }
                      
                      // 3. Calcular descuento y Nueva Base FS (Precio Base - Descuento)
                      const discountAmount = basePrice * (discountPercent / 100);
                      const discountedPrice = basePrice - discountAmount;
                      
                      // 4. NUEVA LÓGICA: Calcular para que CI_nueva + Cuota_FS = Cuota Inicial Total (100% preciso)
                      const ciPercent = clientConfig.ci / 100; // Usar C.I., no FGA
                      
                      // Usar el valor EXACTO ingresado por el usuario (sin redondear)
                      const totalExacto = newModelTotalInitial;
                      
                      // Fórmula: CI_nueva = (Cuota Inicial Total - Nueva Base FS * % C.I.) / (1 - % C.I.)
                      const cuotaInicialCalculadaRaw = (totalExacto - discountedPrice * ciPercent) / (1 - ciPercent);
                      
                      // 5. Calcular Valor a Financiar basado en la nueva CI calculada
                      const financedAmount = discountedPrice - cuotaInicialCalculadaRaw;
                      const financedAmountRedondeado = roundToNearestFiveHundred(financedAmount);
                      
                      // 6. Calcular Cuota FS basado en el Valor a Financiar usando C.I.
                      const cuotaFSRaw = financedAmountRedondeado * ciPercent;
                      const cuotaFSRedondeada = roundToNearestFiveHundred(cuotaFSRaw);
                      
                      // 7. Ajustar Cuota Inicial para que la suma sea EXACTAMENTE igual al total ingresado
                      const cuotaInicialCalculadaRedondeada = totalExacto - cuotaFSRedondeada;
                      
                      // 8. Guardar valores para mostrar
                      const additionalInitial = cuotaInicialCalculadaRedondeada; // Esta es la CI nueva (ajustada)
                      const minimumInitial = cuotaFSRedondeada; // Esta es la Cuota FS
                      
                      // 9. Calcular % de la Cuota Inicial ingresada sobre Precio Base
                      const totalInitialPercent = (newModelTotalInitial / basePrice) * 100;
                      
                      // Guardar valores calculados para mostrar en UI
                      setNewModelInitialPercent(totalInitialPercent);
                      setNewModelMinimumInitial(minimumInitial);
                      setNewModelAdditionalInitial(additionalInitial);
                      setNewModelDiscountPercent(discountPercent);
                      setNewModelDiscountAmount(discountAmount);
                      setNewModelNewBaseFS(discountedPrice);
                      setNewModelFinancedAmount(financedAmountRedondeado);
                      const disbursedAmount = financedAmountRedondeado;
                      
                      // Usar tasa mensual para corto plazo
                      const interestRate = newModelMonthlyRate / 100;
                      const tecAdmPerMonth = (disbursedAmount * (newModelTecAdm / 100)) / newModelInstallments;
                      // FGA se calcula sobre el Valor a Financiar, no sobre el Precio Base
                      const fgaPerMonth = disbursedAmount * (clientConfig.fga / 100);
                      
                      // Calcular cuota base usando sistema francés
                      const r = interestRate;
                      const n = newModelInstallments;
                      const fixedPaymentWithoutExtras = disbursedAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
                      
                      let balance = disbursedAmount;
                      const table = [];
                      
                      for (let i = 1; i <= newModelInstallments; i++) {
                        const interest = balance * interestRate;
                        const principal = fixedPaymentWithoutExtras - interest;
                        
                        const seguro1 = fixedPaymentWithoutExtras * (newModelSeguro1 / 100);
                        const seguro2 = (balance * newModelSeguro2Formula) / 1000;
                        
                        const totalPayment = fixedPaymentWithoutExtras + tecAdmPerMonth + fgaPerMonth + seguro1 + seguro2;
                        
                        table.push({
                          month: i,
                          balance: balance,
                          principal: principal,
                          interest: interest,
                          tecAdm: tecAdmPerMonth,
                          fga: fgaPerMonth,
                          seguro1: seguro1,
                          seguro2: seguro2,
                          payment: totalPayment
                        });
                        
                        balance -= principal;
                      }
                      
                      setNewModelAmortizationTable(table);
                      
                      if (discountPercent > 0) {
                        toast.success(`Descuento del ${discountPercent}% aplicado. Cuota inicial ingresada: ${initialPercent.toFixed(2)}%`);
                      }
                    }}
                    className="w-full"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Calcular Amortización
                  </Button>

                  {newModelAmortizationTable.length > 0 && (
                    <div className="space-y-4">
                      {/* Cuadro con Cuota Inicial Calculada y Cuota FS en la misma línea */}
                      <div className="p-3 border rounded-lg">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="font-semibold text-sm mb-1">
                              Cuota Inicial: <span className="text-xs text-muted-foreground">(Ajustada)</span>
                            </div>
                            <div className="text-lg font-bold">
                              ${newModelAdditionalInitial.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-semibold text-sm mb-1">
                              <span>Cuota FS </span>
                              <span className="text-xs text-muted-foreground">(Tipo {newModelClientType}: {clientTypeConfig[newModelClientType].ci}%)</span>
                            </div>
                            <div className="text-lg font-bold">
                              ${newModelMinimumInitial.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                        <span className="font-semibold">Cuota Inicial Total:</span>
                        <span className="text-lg font-bold text-primary">
                          ${(newModelAdditionalInitial + newModelMinimumInitial).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <span className="font-semibold">Descuento: ({newModelDiscountPercent}%)</span>
                        <span className="text-lg font-bold text-green-700 dark:text-green-400">
                          ${newModelDiscountAmount.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <span className="font-semibold">Nueva base FS:</span>
                        <span className="text-lg font-bold text-blue-700 dark:text-blue-400">
                          ${newModelNewBaseFS.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <span className="font-semibold">Valor a Financiar:</span>
                        <span className="text-lg font-bold text-purple-700 dark:text-purple-400">
                          ${newModelFinancedAmount.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-accent/10 rounded-lg">
                        <span className="font-semibold">Cuota Mensual:</span>
                        <span className="text-lg font-bold text-accent">
                          ${(Math.ceil(newModelAmortizationTable[0]?.payment / 1000) * 1000).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                      </div>

                      <div id="amortization-table-container" className="rounded-md border overflow-auto max-h-96 bg-background">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs font-bold whitespace-nowrap">Mes</TableHead>
                              <TableHead className="text-xs font-bold text-right whitespace-nowrap">Saldo</TableHead>
                              <TableHead className="text-xs font-bold text-right whitespace-nowrap">Capital</TableHead>
                              <TableHead className="text-xs font-bold text-right whitespace-nowrap">Interés</TableHead>
                              <TableHead className="text-xs font-bold text-right whitespace-nowrap">Tec/Adm</TableHead>
                              <TableHead className="text-xs font-bold text-right whitespace-nowrap">FGA</TableHead>
                              <TableHead className="text-xs font-bold text-right whitespace-nowrap">Seg. 1</TableHead>
                              <TableHead className="text-xs font-bold text-right whitespace-nowrap">Seg. 2</TableHead>
                              <TableHead className="text-xs font-bold text-right whitespace-nowrap">Cuota</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {newModelAmortizationTable.map((row) => (
                              <TableRow key={row.month}>
                                <TableCell className="text-xs">{row.month}</TableCell>
                                <TableCell className="text-xs text-right">
                                  ${row.balance.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  ${row.principal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  ${row.interest.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  ${row.tecAdm.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  ${row.fga.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  ${row.seguro1.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  ${row.seguro2.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                                <TableCell className="text-xs text-right font-medium">
                                  ${row.payment.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-muted/50 font-bold">
                              <TableCell className="text-xs font-bold" colSpan={3}>TOTAL</TableCell>
                              <TableCell className="text-xs text-right font-bold">
                                ${newModelAmortizationTable.reduce((sum, row) => sum + row.interest, 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                              </TableCell>
                              <TableCell className="text-xs text-right font-bold">
                                ${newModelAmortizationTable.reduce((sum, row) => sum + row.tecAdm, 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                              </TableCell>
                              <TableCell className="text-xs text-right font-bold">
                                ${newModelAmortizationTable.reduce((sum, row) => sum + row.fga, 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                              </TableCell>
                              <TableCell className="text-xs text-right font-bold">
                                ${newModelAmortizationTable.reduce((sum, row) => sum + row.seguro1, 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                              </TableCell>
                              <TableCell className="text-xs text-right font-bold">
                                ${newModelAmortizationTable.reduce((sum, row) => sum + row.seguro2, 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                              </TableCell>
                              <TableCell className="text-xs text-right font-bold"></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                      
                      <Button 
                        onClick={async () => {
                          const tableElement = document.getElementById('amortization-table-container');
                          if (!tableElement) return;
                          
                          try {
                            // Crear un contenedor temporal con toda la información
                            const container = document.createElement('div');
                            container.style.backgroundColor = '#ffffff';
                            container.style.padding = '20px';
                            container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
                            
                            // Información superior
                            const header = document.createElement('div');
                            header.style.marginBottom = '20px';
                            header.innerHTML = `
                              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                                <div style="background: #f3f4f6; padding: 10px; border-radius: 6px;">
                                  <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Cuota Inicial (Ajustada):</div>
                                  <div style="font-size: 16px; font-weight: bold; color: #1f2937;">$${newModelAdditionalInitial.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</div>
                                </div>
                                <div style="background: #f3f4f6; padding: 10px; border-radius: 6px;">
                                  <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Cuota FS</div>
                                  <div style="font-size: 16px; font-weight: bold; color: #1f2937;">$${newModelMinimumInitial.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</div>
                                  <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">(Tipo ${newModelClientType}: ${clientTypeConfig[newModelClientType].ci}%)</div>
                                </div>
                                <div style="background: #f3f4f6; padding: 10px; border-radius: 6px;">
                                  <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Cuota Inicial Total</div>
                                  <div style="font-size: 16px; font-weight: bold; color: #1f2937;">$${newModelTotalInitial.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</div>
                                </div>
                              </div>
                              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                                <div style="background: #fef3c7; padding: 10px; border-radius: 6px;">
                                  <div style="font-size: 13px; color: #92400e; margin-bottom: 4px;">Descuento</div>
                                  <div style="font-size: 16px; font-weight: bold; color: #92400e;">${newModelDiscountPercent}% - $${newModelDiscountAmount.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</div>
                                </div>
                                <div style="background: #dbeafe; padding: 10px; border-radius: 6px;">
                                  <div style="font-size: 13px; color: #1e40af; margin-bottom: 4px;">Nueva base FS</div>
                                  <div style="font-size: 16px; font-weight: bold; color: #1e40af;">$${newModelNewBaseFS.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</div>
                                </div>
                                <div style="background: #e9d5ff; padding: 10px; border-radius: 6px;">
                                  <div style="font-size: 13px; color: #6b21a8; margin-bottom: 4px;">Valor a Financiar</div>
                                  <div style="font-size: 16px; font-weight: bold; color: #6b21a8;">$${newModelFinancedAmount.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</div>
                                </div>
                              </div>
                            `;
                            container.appendChild(header);
                            
                            // Clonar la tabla
                            const tableClone = tableElement.cloneNode(true) as HTMLElement;
                            tableClone.style.maxHeight = 'none';
                            tableClone.style.overflow = 'visible';
                            container.appendChild(tableClone);
                            
                            // Añadir al DOM temporalmente
                            document.body.appendChild(container);
                            
                            const canvas = await html2canvas(container, {
                              backgroundColor: '#ffffff',
                              scale: 2,
                              windowHeight: container.scrollHeight
                            });
                            
                            // Limpiar
                            document.body.removeChild(container);
                            
                            const link = document.createElement('a');
                            link.download = `amortizacion-${new Date().toISOString().split('T')[0]}.png`;
                            link.href = canvas.toDataURL();
                            link.click();
                            
                            toast.success("Tabla descargada exitosamente");
                          } catch (error) {
                            console.error('Error al descargar:', error);
                            toast.error("Error al descargar la tabla");
                          }
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Descargar Tabla como Imagen
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {newModelTermType === 'largo' && (
                <div className="space-y-6 p-4 border rounded-lg bg-muted/30">
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">Seleccionar Tasa de Interés</Label>
                    <div className="flex gap-4 items-center">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="tasaMensual"
                          name="rateType"
                          value="mensual"
                          checked={newModelRateType === 'mensual'}
                          onChange={(e) => setNewModelRateType(e.target.value as 'mensual' | 'retanqueo')}
                          className="w-4 h-4"
                        />
                        <label htmlFor="tasaMensual" className="cursor-pointer text-sm">Tasa Int. Mensual ({newModelMonthlyRate}%)</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="tasaRetanqueo"
                          name="rateType"
                          value="retanqueo"
                          checked={newModelRateType === 'retanqueo'}
                          onChange={(e) => setNewModelRateType(e.target.value as 'mensual' | 'retanqueo')}
                          className="w-4 h-4"
                        />
                        <label htmlFor="tasaRetanqueo" className="cursor-pointer text-sm">Tasa Int. Retanqueo ({newModelRetanqueoRate}%)</label>
                      </div>
                    </div>
                  </div>

                  <Collapsible open={newModelInicialMayorLargo} onOpenChange={setNewModelInicialMayorLargo}>
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="newModelInicialMayorLargo"
                          checked={newModelInicialMayorLargo}
                          onCheckedChange={(checked) => {
                            setNewModelInicialMayorLargo(checked as boolean);
                            if (!checked) {
                              setNewModelInicialMayorValueLargo(0);
                            }
                          }}
                        />
                        <Label htmlFor="newModelInicialMayorLargo" className="cursor-pointer font-medium">
                          Cuota Inicial Mayor
                        </Label>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          {newModelInicialMayorLargo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="mt-4 space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="newModelInicialMayorValueLargo">Monto Inicial Mayor</Label>
                        <Input
                          id="newModelInicialMayorValueLargo"
                          type="number"
                          step="1000"
                          min="0"
                          value={newModelInicialMayorValueLargo}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewModelInicialMayorValueLargo(val === '' ? 0 : parseFloat(val));
                          }}
                          onFocus={(e) => e.target.select()}
                          placeholder="Ingrese el monto de la inicial mayor"
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Button 
                    onClick={() => {
                      if (!newModelBasePrice || newModelBasePrice <= 0) {
                        toast.error("Por favor ingrese un Precio Base válido");
                        return;
                      }
                      
                      const clientConfig = clientTypeConfig[newModelClientType];
                      const basePrice = newModelBasePrice;
                      const ciPercent = clientConfig.ci / 100;
                      
                      let cuotaInicial = 0;
                      let cuotaFS = 0;
                      let nuevaBaseFS = 0;
                      
                      // CASO 1: SIN CUOTA INICIAL MAYOR (Flujo Normal)
                      if (!newModelInicialMayorLargo || newModelInicialMayorValueLargo === 0) {
                        // Flujo normal: Cuota FS = Base FS × C.I%
                        cuotaFS = basePrice * ciPercent;
                        cuotaInicial = 0;
                        nuevaBaseFS = basePrice;
                      } else {
                        // CASO 2: CON CUOTA INICIAL MAYOR
                        // El usuario ingresa "Cuota Inicial Total" que se divide en:
                        // - "Cuota Inicial" (reduce la Base FS directamente)
                        // - "Cuota FS" (es el C.I% del valor a financiar = Nueva Base FS)
                        
                        const creditoFSTotalInitial = newModelInicialMayorValueLargo;
                        
                        console.log('🔍 DEBUG Admin - Valores iniciales:', {
                          basePrice,
                          creditoFSTotalInitial,
                          'clientConfig.ci': clientConfig.ci,
                          ciPercent,
                          newModelClientType
                        });
                        
                        if (ciPercent === 0) {
                          // Si no hay C.I%, toda la Cuota Inicial Total va a reducir la Base FS
                          cuotaInicial = creditoFSTotalInitial;
                          cuotaFS = 0;
                          nuevaBaseFS = basePrice - cuotaInicial;
                        } else {
                          // Si hay C.I%, resolver algebraicamente:
                          // Fórmula: Cuota Inicial = (Cuota Inicial Total - Base FS × C.I%) / (1 - C.I%)
                          
                          const rawCuotaInicial = (creditoFSTotalInitial - basePrice * ciPercent) / (1 - ciPercent);
                          
                          // Redondear Cuota Inicial hacia arriba a la decena más cercana
                          cuotaInicial = Math.ceil(rawCuotaInicial / 10) * 10;
                          
                          // Calcular Nueva Base FS
                          nuevaBaseFS = basePrice - cuotaInicial;
                          
                          // Calcular Cuota FS para que sume exactamente la Cuota Inicial Total
                          cuotaFS = creditoFSTotalInitial - cuotaInicial;
                          
                          console.log('✅ RESULTADO Admin - Cálculo Cuota Inicial Mayor:', {
                            'Base FS': basePrice.toLocaleString('es-CO'),
                            'Cuota Inicial Total': creditoFSTotalInitial.toLocaleString('es-CO'),
                            'C.I%': (ciPercent * 100) + '%',
                            '---': '---',
                            'Cuota Inicial (raw)': rawCuotaInicial.toFixed(2),
                            'Cuota Inicial (redondeada)': cuotaInicial.toLocaleString('es-CO'),
                            'Nueva Base FS': nuevaBaseFS.toLocaleString('es-CO'),
                            'Cuota FS': cuotaFS.toLocaleString('es-CO'),
                            '---VERIFICACIÓN---': '---',
                            'Suma (CI + CFS)': (cuotaInicial + cuotaFS).toLocaleString('es-CO'),
                            'Debe ser igual a': creditoFSTotalInitial.toLocaleString('es-CO'),
                            'Porcentaje CFS/Nueva Base': ((cuotaFS / nuevaBaseFS) * 100).toFixed(2) + '%',
                            'Debe ser aprox': (ciPercent * 100) + '%'
                          });
                        }
                      }
                      
                      // Valor a Financiar para la amortización = Nueva Base FS
                      const valorAFinanciar = nuevaBaseFS;
                      
                      const interestRate = newModelRateType === 'mensual' ? newModelMonthlyRate / 100 : newModelRetanqueoRate / 100;
                      const tecAdmPerMonth = (valorAFinanciar * (newModelTecAdm / 100)) / newModelInstallments;
                      const fgaPerMonth = valorAFinanciar * (clientConfig.fga / 100);
                      
                      // Calcular cuota base (capital + interés) usando sistema francés sobre el Valor a Financiar
                      const r = interestRate;
                      const n = newModelInstallments;
                      const fixedPaymentWithoutExtras = valorAFinanciar * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
                      
                      let balance = valorAFinanciar;
                      const table = [];
                      
                      for (let i = 1; i <= newModelInstallments; i++) {
                        const interest = balance * interestRate;
                        const principal = fixedPaymentWithoutExtras - interest;
                        
                        // Seguro 1: sobre la cuota (capital + interés)
                        const seguro1 = fixedPaymentWithoutExtras * (newModelSeguro1 / 100);
                        
                        // Seguro 2: (Saldo × Formula) / 1000
                        const seguro2 = (balance * newModelSeguro2Formula) / 1000;
                        
                        // Cuota total = capital + interés + Tec/Adm + FGA + Seguro1 + Seguro2
                        const totalPayment = fixedPaymentWithoutExtras + tecAdmPerMonth + fgaPerMonth + seguro1 + seguro2;
                        
                        table.push({
                          month: i,
                          balance: balance,
                          principal: principal,
                          interest: interest,
                          tecAdm: tecAdmPerMonth,
                          fga: fgaPerMonth,
                          seguro1: seguro1,
                          seguro2: seguro2,
                          payment: totalPayment,
                          baseFS: basePrice,
                          cuotaInicial: cuotaInicial,
                          nuevaBaseFS: nuevaBaseFS,
                          cuotaFS: cuotaFS,
                          inicialMayor: newModelInicialMayorLargo
                        });
                        
                        balance -= principal;
                      }
                      
                      setNewModelAmortizationTable(table);
                      
                      if (newModelInicialMayorLargo && cuotaInicial > 0) {
                        toast.success(`Inicial Mayor aplicada. Cuota Inicial: $${cuotaInicial.toLocaleString('es-CO', { maximumFractionDigits: 0 })} + Cuota FS: $${cuotaFS.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`);
                      }
                    }}
                    className="w-full"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Calcular Amortización
                  </Button>

                   {newModelAmortizationTable.length > 0 && (
                    <div className="space-y-4">
                      {newModelInicialMayorLargo && newModelAmortizationTable[0]?.inicialMayor ? (
                        <>
                          <div className="flex justify-between items-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <span className="font-semibold">Base FS (Original):</span>
                            <span className="text-lg font-bold text-blue-700 dark:text-blue-400">
                              ${newModelAmortizationTable[0]?.baseFS.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <span className="font-semibold">Cuota Inicial:</span>
                            <span className="text-lg font-bold text-green-700 dark:text-green-400">
                              ${newModelAmortizationTable[0]?.cuotaInicial.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <span className="font-semibold">Nueva Base FS:</span>
                            <span className="text-lg font-bold text-purple-700 dark:text-purple-400">
                              ${newModelAmortizationTable[0]?.nuevaBaseFS.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            <span className="font-semibold">Cuota FS ({clientTypeConfig[newModelClientType].ci}%):</span>
                            <span className="text-lg font-bold text-orange-700 dark:text-orange-400">
                              ${newModelAmortizationTable[0]?.cuotaFS.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center p-3 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                            <span className="font-semibold">Cuota Inicial Total:</span>
                            <span className="text-lg font-bold text-pink-700 dark:text-pink-400">
                              ${(newModelAmortizationTable[0]?.cuotaInicial + newModelAmortizationTable[0]?.cuotaFS).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                          <span className="font-semibold">Cuota FS ({clientTypeConfig[newModelClientType].ci}%):</span>
                          <span className="text-lg font-bold text-primary">
                            ${(newModelBasePrice * (clientTypeConfig[newModelClientType].ci / 100)).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center p-3 bg-accent/10 rounded-lg">
                        <span className="font-semibold">Número de Cuotas:</span>
                        <span className="text-lg font-bold text-accent">
                          {newModelInstallments}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-accent/10 rounded-lg">
                        <span className="font-semibold">Cuota Mensual:</span>
                        <span className="text-lg font-bold text-accent">
                          ${Math.ceil(newModelAmortizationTable[0]?.payment / 1000) * 1000}
                        </span>
                      </div>

                      <div id="amortization-table-container" className="rounded-md border overflow-auto max-h-96 bg-background">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs font-bold whitespace-nowrap">Mes</TableHead>
                              <TableHead className="text-xs font-bold text-right whitespace-nowrap">Saldo</TableHead>
                              <TableHead className="text-xs font-bold text-right whitespace-nowrap">Capital</TableHead>
                              <TableHead className="text-xs font-bold text-right whitespace-nowrap">Interés</TableHead>
                              <TableHead className="text-xs font-bold text-right whitespace-nowrap">Tec/Adm</TableHead>
                              <TableHead className="text-xs font-bold text-right whitespace-nowrap">FGA</TableHead>
                              <TableHead className="text-xs font-bold text-right whitespace-nowrap">Seg. 1</TableHead>
                              <TableHead className="text-xs font-bold text-right whitespace-nowrap">Seg. 2</TableHead>
                              <TableHead className="text-xs font-bold text-right whitespace-nowrap">Cuota</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {newModelAmortizationTable.map((row) => (
                              <TableRow key={row.month}>
                                <TableCell className="text-xs">{row.month}</TableCell>
                                <TableCell className="text-xs text-right">
                                  ${row.balance.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  ${row.principal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  ${row.interest.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  ${row.tecAdm.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  ${row.fga.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  ${row.seguro1.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  ${row.seguro2.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                                <TableCell className="text-xs text-right font-medium">
                                  ${row.payment.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-muted/50 font-bold">
                              <TableCell className="text-xs font-bold" colSpan={3}>TOTAL</TableCell>
                              <TableCell className="text-xs text-right font-bold">
                                ${newModelAmortizationTable.reduce((sum, row) => sum + row.interest, 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                              </TableCell>
                              <TableCell className="text-xs text-right font-bold">
                                ${newModelAmortizationTable.reduce((sum, row) => sum + row.tecAdm, 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                              </TableCell>
                              <TableCell className="text-xs text-right font-bold">
                                ${newModelAmortizationTable.reduce((sum, row) => sum + row.fga, 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                              </TableCell>
                              <TableCell className="text-xs text-right font-bold">
                                ${newModelAmortizationTable.reduce((sum, row) => sum + row.seguro1, 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                              </TableCell>
                              <TableCell className="text-xs text-right font-bold">
                                ${newModelAmortizationTable.reduce((sum, row) => sum + row.seguro2, 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                              </TableCell>
                              <TableCell className="text-xs text-right font-bold"></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                      
                      <Button 
                        onClick={async () => {
                          const element = document.getElementById('amortization-table-container');
                          if (!element) return;
                          
                          try {
                            // Remover temporalmente el scroll para capturar toda la tabla
                            const originalMaxHeight = element.style.maxHeight;
                            const originalOverflow = element.style.overflow;
                            element.style.maxHeight = 'none';
                            element.style.overflow = 'visible';
                            
                            const canvas = await html2canvas(element, {
                              backgroundColor: '#ffffff',
                              scale: 2,
                              windowHeight: element.scrollHeight
                            });
                            
                            // Restaurar el scroll
                            element.style.maxHeight = originalMaxHeight;
                            element.style.overflow = originalOverflow;
                            
                            const link = document.createElement('a');
                            link.download = `amortizacion-${new Date().toISOString().split('T')[0]}.png`;
                            link.href = canvas.toDataURL();
                            link.click();
                            
                            toast.success("Tabla descargada exitosamente");
                          } catch (error) {
                            console.error('Error al descargar:', error);
                            toast.error("Error al descargar la tabla");
                          }
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Descargar Tabla como Imagen
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Descuentos Corto Plazo</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {discountHistory.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay histórico disponible
              </p>
            ) : (
              discountHistory.map((history, index) => {
                const ranges = history.ranges as Array<{minPercent: number, maxPercent: number, discount: number}>;
                const createdAt = new Date(history.created_at);
                const nextChange = index > 0 ? new Date(discountHistory[index - 1].created_at) : null;
                const isSuperAdmin = userEmail === 'contacto@finansuenos.com';
                
                return (
                  <div key={history.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-sm font-medium">
                          Creado: {format(createdAt, "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                        </p>
                        {nextChange && (
                          <p className="text-sm text-muted-foreground">
                            Modificado: {format(nextChange, "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                          </p>
                        )}
                        {index === 0 && (
                          <p className="text-sm text-green-600 font-medium">Actual</p>
                        )}
                      </div>
                      {isSuperAdmin && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDiscountRanges(ranges);
                              setShowHistory(false);
                              toast.success("Rangos cargados para edición");
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              if (!confirm('¿Está seguro que desea eliminar este registro del histórico?')) {
                                return;
                              }
                              
                              const { error } = await supabase
                                .from('discount_ranges_history')
                                .delete()
                                .eq('id', history.id);
                              
                              if (error) {
                                console.error('Error al eliminar:', error);
                                toast.error(`Error al eliminar: ${error.message}`);
                                return;
                              }
                              
                              toast.success("Registro eliminado");
                              fetchDiscountHistory();
                            }}
                          >
                            Eliminar
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Inicial Mínima (%)</TableHead>
                          <TableHead>Inicial Máxima (%)</TableHead>
                          <TableHead>Descuento (%)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ranges.map((range, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{range.minPercent}%</TableCell>
                            <TableCell>{range.maxPercent}%</TableCell>
                            <TableCell>{range.discount}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesPlanConfig;
