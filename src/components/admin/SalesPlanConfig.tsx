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
import { Save, Calculator } from "lucide-react";

interface SalesPlanConfig {
  id: string;
  plan_type: string;
  config: any;
  is_active: boolean;
}

const SalesPlanConfig = () => {
  const [configs, setConfigs] = useState<Record<string, SalesPlanConfig>>({});
  const [loading, setLoading] = useState(true);
  
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

  useEffect(() => {
    loadConfigs();
  }, []);

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
        setMonthlyInterestRate(config.monthly_interest_rate || 2.5);
        setRetanqueoInterestRate(config.retanqueo_interest_rate || 1.60);
        setAvalCobrador(config.aval_cobrador_percentage || 1.5);
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
    const capital = testCapital;
    const monthlyRate = monthlyInterestRate / 100;
    const avalRate = avalCobrador / 100;
    const term = testTerm;
    
    // Calcular cuota base usando método francés (cuota fija)
    // PMT = P × (r × (1+r)^n) / ((1+r)^n - 1)
    const r = monthlyRate;
    const n = term;
    const onePlusR = 1 + r;
    const onePlusRtoN = Math.pow(onePlusR, n);
    const baseMonthlyPayment = capital * (r * onePlusRtoN) / (onePlusRtoN - 1);
    
    // Aval fijo mensual (porcentaje del capital original)
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
      loadConfigs();
    }
  };

  if (loading) {
    return <p>Cargando configuraciones...</p>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="credicontado">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="credicontado">Venta CrediContado</TabsTrigger>
          <TabsTrigger value="credito">Venta Crédito</TabsTrigger>
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
                      onChange={(e) => setMonthlyInterestRate(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="retanqueoInterest">Tasa de Interés Retanqueo (%)</Label>
                    <Input
                      id="retanqueoInterest"
                      type="number"
                      step="0.01"
                      value={retanqueoInterestRate}
                      onChange={(e) => setRetanqueoInterestRate(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="avalCobrador">Aval Cobrador (% mensual)</Label>
                    <Input
                      id="avalCobrador"
                      type="number"
                      step="0.1"
                      value={avalCobrador}
                      onChange={(e) => setAvalCobrador(parseFloat(e.target.value) || 0)}
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
                        onChange={(e) => setTestAmortizationType(e.target.value as 'arpesod' | 'retanqueo')}
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
                        onChange={(e) => setTestAmortizationType(e.target.value as 'arpesod' | 'retanqueo')}
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
                      onChange={(e) => setTestCapital(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="testTerm" className="text-sm font-medium">Plazo (meses)</Label>
                    <Input
                      id="testTerm"
                      type="number"
                      value={testTerm}
                      onChange={(e) => setTestTerm(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <Button onClick={calculateAmortization} variant="outline" className="w-full">
                  <Calculator className="w-4 h-4 mr-2" />
                  Calcular Tabla de Amortización
                </Button>

                {amortizationTable.length > 0 && (
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
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesPlanConfig;
