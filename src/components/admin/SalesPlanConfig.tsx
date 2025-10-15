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
import { Save, Calculator, Settings } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
  
  // Nuevo Modelo Crédito
  const [newModelBasePrice, setNewModelBasePrice] = useState(0);
  const [newModelTermType, setNewModelTermType] = useState<'corto' | 'largo'>('corto');
  const [newModelInstallments, setNewModelInstallments] = useState<number>(3);
  const [newModelClientType, setNewModelClientType] = useState<string>('AAA');
  const [clientTypeConfig, setClientTypeConfig] = useState<Record<string, { ci: number; fga: number }>>({
    'AAA': { ci: 0, fga: 0 },
    'AA': { ci: 0, fga: 0 },
    'A': { ci: 0, fga: 0 },
    'BBB': { ci: 0, fga: 0 },
    'BB': { ci: 0, fga: 0 },
    'B': { ci: 0, fga: 0 },
  });

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

  const handleAmortizationTypeChange = (type: 'arpesod' | 'retanqueo') => {
    setTestAmortizationType(type);
    setAmortizationTable([]);
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
    const interestRate = testAmortizationType === 'arpesod' ? monthlyInterestRate : retanqueoInterestRate;
    const monthlyRate = interestRate / 100;
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

        <TabsContent value="nuevomodelo">
          <Card>
            <CardHeader>
              <CardTitle>Nuevo Modelo de Crédito</CardTitle>
              <CardDescription>
                Realiza cálculos rápidos de amortización con parámetros personalizados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                  placeholder="Ingrese el precio base"
                  className="md:max-w-xs"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
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
                            setNewModelInstallments(e.target.value === 'corto' ? 3 : 9);
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
                            setNewModelInstallments(e.target.value === 'corto' ? 3 : 9);
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
                        ) : (
                          <>
                            <SelectItem value="9">9</SelectItem>
                            <SelectItem value="11">11</SelectItem>
                            <SelectItem value="12">12</SelectItem>
                            <SelectItem value="14">14</SelectItem>
                            <SelectItem value="17">17</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesPlanConfig;
