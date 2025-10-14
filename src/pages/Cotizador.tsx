import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LogOut, CreditCard, FileText, HandshakeIcon, Settings, ChevronDown, ChevronUp } from "lucide-react";
import ProductSelector from "@/components/cotizador/ProductSelector";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import QuotesHistory from "@/components/cotizador/QuotesHistory";

const Cotizador = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Producto seleccionado y precios
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productPrices, setProductPrices] = useState<any>(null);
  
  // Tipo de venta
  const [saleType, setSaleType] = useState<"contado" | "credicontado" | "credito" | "convenio">("contado");
  const [installments, setInstallments] = useState(1);
  const [initialPayment, setInitialPayment] = useState(0);
  const [selectedList, setSelectedList] = useState<1 | 2 | 3 | 4>(1); // Para contado
  
  // Resetear valores cuando cambia el tipo de venta
  const handleSaleTypeChange = (newType: "contado" | "credicontado" | "credito" | "convenio") => {
    setSaleType(newType);
    setInitialPayment(0);
    setQuote(null);
    setShowClientForm(false);
    setShowAmortization(false);
    setInicialMayor(false);
    setInicialMayorValue(0);
    setAdjustedBasePrice(0);
    setOriginalMonthlyPayment(0);
    setRetanqueoEdC(false);
    setSaldoArpesod(0);
    setNuevaBaseFS(0);
    setClientName("");
    setClientId("");
    setClientPhone("");
    
    if (newType === "contado") {
      setInstallments(1);
      setSelectedList(1);
    } else if (newType === "credicontado") {
      setInstallments(1);
    } else if (newType === "credito") {
      setInstallments(9);
    } else if (newType === "convenio") {
      setInstallments(1);
    }
  };
  
  // Resultado
  const [quote, setQuote] = useState<any>(null);
  
  // Formulario cliente
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  
  // Amortización
  const [showAmortization, setShowAmortization] = useState(false);
  
  // Procesos adicionales
  const [inicialMayor, setInicialMayor] = useState(false);
  const [inicialMayorValue, setInicialMayorValue] = useState(0);
  const [adjustedBasePrice, setAdjustedBasePrice] = useState(0);
  const [originalMonthlyPayment, setOriginalMonthlyPayment] = useState(0);
  
  // Retanqueo EdC a FS
  const [retanqueoEdC, setRetanqueoEdC] = useState(false);
  const [saldoArpesod, setSaldoArpesod] = useState(0);
  const [nuevaBaseFS, setNuevaBaseFS] = useState(0);
  
  // Historial de cotizaciones
  const [showQuotesHistory, setShowQuotesHistory] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        
        // Check if user has admin role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .single();
        
        setIsAdmin(!!roleData);
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      } else if (session) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada exitosamente");
  };

  const handleProductSelect = (product: any, prices: any) => {
    setSelectedProduct(product);
    setProductPrices(prices);
    setQuote(null);
    setShowClientForm(false);
    
    // Para contado y convenio, calcular automáticamente
    if (saleType === "contado" || saleType === "convenio") {
      // Se calculará cuando el usuario seleccione la lista (para contado) o inmediatamente (para convenio)
      if (saleType === "convenio") {
        setTimeout(() => calculateQuote(), 100);
      }
    }
  };

  // Función para calcular tabla de amortización con sistema francés
  const calculateAmortization = (basePrice: number, months: number) => {
    const avalRate = 0.02; // 2% del precio base (fijo en todas las cuotas)
    const interestRate = 0.0187; // 1.87% mensual sobre saldo
    
    const fixedAval = basePrice * avalRate; // Aval fijo para todas las cuotas
    
    // Calcular cuota fija sin aval (solo capital + interés)
    // Fórmula: P * [r(1+r)^n] / [(1+r)^n - 1]
    const r = interestRate;
    const n = months;
    const fixedPaymentWithoutAval = basePrice * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    
    let balance = basePrice;
    const schedule = [];
    
    for (let i = 1; i <= months; i++) {
      const interest = balance * interestRate;
      const principal = fixedPaymentWithoutAval - interest; // El abono a capital aumenta cada mes
      const payment = principal + interest + fixedAval;
      
      schedule.push({
        month: i,
        balance: balance,
        principal: principal,
        interest: interest,
        aval: fixedAval,
        payment: payment
      });
      
      balance -= principal;
    }
    
    return schedule;
  };

  const calculateQuote = () => {
    if (!selectedProduct || !productPrices || productPrices.length === 0) {
      toast.error("Por favor selecciona un producto con precios disponibles");
      return;
    }

    // Usar el primer precio disponible (el más reciente por la ordenación)
    const priceData = productPrices[0];
    
    let basePrice = 0;
    let totalPrice = 0;
    let monthlyPayment = 0;
    let remainingBalance = 0;

    switch (saleType) {
      case "contado":
        // Para contado, usar la lista seleccionada por el usuario
        if (selectedList === 1) {
          basePrice = Number(priceData.list_1_price);
        } else if (selectedList === 2) {
          basePrice = Number(priceData.list_2_price || priceData.list_1_price);
        } else if (selectedList === 3) {
          basePrice = Number(priceData.list_3_price || priceData.list_1_price);
        } else if (selectedList === 4) {
          basePrice = Number(priceData.list_4_price || priceData.list_1_price);
        }
        
        totalPrice = basePrice;
        remainingBalance = basePrice;
        monthlyPayment = basePrice;
        break;
      
      case "credicontado":
        // Para credicontado: (precio base - cuota inicial) * (1 + cuotas * 5%)
        basePrice = Number(priceData.credicontado_price || priceData.list_1_price);
        remainingBalance = basePrice - initialPayment;
        totalPrice = remainingBalance * (1 + (installments * 0.05));
        monthlyPayment = installments > 0 ? totalPrice / installments : 0;
        break;
      
      case "credito":
        // Para crédito usar BASE FINANSUEÑOS (credit_price) con amortización
        const originalBasePrice = Number(priceData.credit_price || priceData.list_1_price);
        basePrice = originalBasePrice;
        
        // Calcular la cuota original sin inicial mayor ni retanqueo
        const r_original = 0.0187;
        const n_original = installments;
        const fixedPaymentWithoutAval_original = originalBasePrice * (r_original * Math.pow(1 + r_original, n_original)) / (Math.pow(1 + r_original, n_original) - 1);
        const avalFijo_original = originalBasePrice * 0.02;
        const originalPayment = fixedPaymentWithoutAval_original + avalFijo_original;
        
        // Si hay inicial mayor, validar y ajustar el precio base
        if (inicialMayor && inicialMayorValue > 0 && !retanqueoEdC) {
          const roundedOriginalPayment = Math.ceil(originalPayment / 1000) * 1000;
          
          if (inicialMayorValue < roundedOriginalPayment) {
            toast.error(`La inicial mayor debe ser al menos $${roundedOriginalPayment.toLocaleString()}`);
            return;
          }
          
          const excess = inicialMayorValue - roundedOriginalPayment;
          basePrice = originalBasePrice - excess;
          setAdjustedBasePrice(basePrice);
        }
        
        // Si hay retanqueo EdC a FS
        if (retanqueoEdC && saldoArpesod > 0) {
          // 1. Calcular cuota mensual actual redondeada
          const currentMonthlyPayment = Math.ceil(originalPayment / 1000) * 1000;
          
          // 2. Calcular NUEVO TOTAL: (Cuota Mensual × Número de Cuotas) + Saldo Arpesod
          const pagoTotal = currentMonthlyPayment * installments;
          const nuevoTotal = pagoTotal + saldoArpesod;
          
          // 3. Nueva cuota mensual objetivo = NUEVO TOTAL / Número de Cuotas (SIN redondear aún)
          const nuevaCuotaSinRedondear = nuevoTotal / installments;
          const nuevaCuotaObjetivo = Math.ceil(nuevaCuotaSinRedondear / 1000) * 1000;
          
          // 4. Calcular Nueva Base FS - encontrar la base que al amortizarla dé esta cuota
          const r = 0.0187; // tasa de interés
          const n = installments; // número de cuotas
          
          // Función auxiliar para calcular la cuota mensual redondeada dada una base
          const calcularCuotaRedondeada = (base: number): number => {
            const fixedPaymentWithoutAval = base * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
            const avalFijo = base * 0.02;
            const cuotaSinRedondear = fixedPaymentWithoutAval + avalFijo;
            return Math.ceil(cuotaSinRedondear / 1000) * 1000;
          };
          
          // Búsqueda binaria para encontrar la base correcta
          let baseMin = 1000000; // Mínimo razonable
          let baseMax = nuevoTotal * 2; // Máximo razonable
          let nuevaBase = baseMin;
          let iteraciones = 0;
          const maxIteraciones = 200;
          
          // Primera pasada: búsqueda binaria gruesa
          while (baseMax - baseMin > 1000 && iteraciones < maxIteraciones) {
            const baseMitad = Math.floor((baseMin + baseMax) / 2);
            const cuotaCalculada = calcularCuotaRedondeada(baseMitad);
            
            if (cuotaCalculada < nuevaCuotaObjetivo) {
              baseMin = baseMitad;
            } else if (cuotaCalculada > nuevaCuotaObjetivo) {
              baseMax = baseMitad;
            } else {
              nuevaBase = baseMitad;
              break;
            }
            iteraciones++;
          }
          
          // Segunda pasada: ajuste fino para encontrar la base más baja que dé la cuota objetivo
          // Probar desde baseMin hasta baseMax en incrementos de 1000
          let baseEncontrada = 0;
          for (let base = baseMin; base <= baseMax; base += 1000) {
            const cuotaCalculada = calcularCuotaRedondeada(base);
            if (cuotaCalculada >= nuevaCuotaObjetivo) {
              baseEncontrada = base;
              break;
            }
          }
          
          // Si no encontramos nada, usar baseMin
          if (baseEncontrada === 0) {
            baseEncontrada = baseMin;
          }
          
          // Redondear a múltiplos de 1000
          nuevaBase = Math.round(baseEncontrada / 1000) * 1000;
          
          // Verificar la cuota final con esta base
          const cuotaFinalVerificacion = calcularCuotaRedondeada(nuevaBase);
          
          console.log("=== DEBUG RETANQUEO ===");
          console.log("Cuota actual:", currentMonthlyPayment);
          console.log("Saldo Arpesod:", saldoArpesod);
          console.log("Nuevo Total:", nuevoTotal);
          console.log("Cuota Objetivo:", nuevaCuotaObjetivo);
          console.log("Nueva Base FS:", nuevaBase);
          console.log("Cuota verificación:", cuotaFinalVerificacion);
          console.log("=====================");
          
          basePrice = nuevaBase;
          setNuevaBaseFS(nuevaBase);
          monthlyPayment = cuotaFinalVerificacion;
          
          // Guardar el original payment para mostrar
          setOriginalMonthlyPayment(originalPayment);
          remainingBalance = basePrice;
          totalPrice = basePrice;
          break;
        }
        
        // Guardar la cuota original para mostrarla en "Inicial Mayor"
        setOriginalMonthlyPayment(originalPayment);
        
        remainingBalance = basePrice;
        totalPrice = basePrice;
        
        // Calcular la cuota mensual usando el sistema francés (valor exacto)
        const r = 0.0187;
        const n = installments;
        const fixedPaymentWithoutAval = basePrice * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        const avalFijo = basePrice * 0.02;
        monthlyPayment = fixedPaymentWithoutAval + avalFijo; // Valor exacto sin redondear
        break;
      
      case "convenio":
        // Para convenios usar el precio de CONVENIOS
        basePrice = Number(priceData.convenio_price || priceData.list_1_price);
        totalPrice = basePrice;
        remainingBalance = basePrice;
        monthlyPayment = basePrice;
        break;
    }

    setQuote({
      basePrice,
      totalPrice,
      initialPayment: saleType === "credito" && inicialMayor ? inicialMayorValue : initialPayment,
      remainingBalance,
      installments,
      monthlyPayment,
      saleType,
      priceListId: priceData.price_list_id,
      productId: selectedProduct.id,
      originalBasePrice: saleType === "credito" && (inicialMayor || retanqueoEdC) ? Number(productPrices[0].credit_price || productPrices[0].list_1_price) : basePrice,
      saldoArpesod: retanqueoEdC ? saldoArpesod : 0,
      nuevaBaseFS: retanqueoEdC ? nuevaBaseFS : 0
    });

    // Mostrar formulario de cliente según el tipo de venta
    if (saleType === "contado" || saleType === "convenio" || saleType === "credicontado" || saleType === "credito") {
      setShowClientForm(true);
    }
  };

  const handleSubmitQuote = async () => {
    if (!clientName || !clientPhone) {
      toast.error("Por favor completa el nombre y celular del cliente");
      return;
    }

    if (!quote || !user) {
      toast.error("Error en los datos de la cotización");
      return;
    }

    try {
      setLoading(true);
      
      // Obtener el advisor_id del usuario actual
      const { data: advisorData, error: advisorError } = await supabase
        .from("advisors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (advisorError || !advisorData) {
        toast.error("No se encontró el perfil de asesor");
        return;
      }

      // Guardar la cotización en la base de datos
      const { error: quoteError } = await supabase
        .from("quotes")
        .insert({
          advisor_id: advisorData.id,
          product_id: quote.productId,
          price_list_id: quote.priceListId,
          sale_type: quote.saleType,
          base_price: quote.basePrice,
          total_price: quote.totalPrice,
          initial_payment: quote.initialPayment,
          remaining_balance: quote.remainingBalance,
          installments: quote.installments,
          monthly_payment: quote.monthlyPayment,
          client_name: clientName,
          client_id_number: clientId || "",
          client_phone: clientPhone
        });

      if (quoteError) {
        console.error("Error saving quote:", quoteError);
        toast.error("Error al guardar la cotización");
        return;
      }

      toast.success("Cotización guardada exitosamente");
      
      // Reset form
      setShowClientForm(false);
      setClientName("");
      setClientId("");
      setClientPhone("");
      setQuote(null);
      setSelectedProduct(null);
      setProductPrices(null);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al procesar la cotización");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-2xl text-primary">Cotizador Asesores EdC</CardTitle>
              <CardDescription>
                Asesor: {user?.email}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <Button variant="outline" onClick={() => navigate("/admin")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Panel Admin
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowQuotesHistory(true)}>
                <FileText className="w-4 h-4 mr-2" />
                Cotizaciones
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Selector de Productos */}
        <ProductSelector onProductSelect={handleProductSelect} />

        {/* Tipo de Venta */}
        {selectedProduct && productPrices && productPrices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-primary" />
                Tipo de Venta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={saleType} onValueChange={(v) => handleSaleTypeChange(v as any)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="contado">Contado</TabsTrigger>
                  <TabsTrigger value="credicontado">CrediContado</TabsTrigger>
                  <TabsTrigger value="credito">Crédito</TabsTrigger>
                  <TabsTrigger value="convenio">Convenio</TabsTrigger>
                </TabsList>

                <TabsContent value="contado" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Seleccionar Lista de Precios</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant={selectedList === 1 ? "default" : "outline"}
                        onClick={() => {
                          setSelectedList(1);
                          setTimeout(() => calculateQuote(), 100);
                        }}
                        className="flex flex-col h-auto py-3"
                      >
                        <span className="font-semibold">LISTA 1</span>
                        <span className="text-sm">${Number(productPrices[0].list_1_price).toLocaleString()}</span>
                      </Button>
                      <Button
                        variant={selectedList === 2 ? "default" : "outline"}
                        onClick={() => {
                          setSelectedList(2);
                          setTimeout(() => calculateQuote(), 100);
                        }}
                        className="flex flex-col h-auto py-3"
                      >
                        <span className="font-semibold">LISTA 2</span>
                        <span className="text-sm">${Number(productPrices[0].list_2_price || 0).toLocaleString()}</span>
                      </Button>
                      <Button
                        variant={selectedList === 3 ? "default" : "outline"}
                        onClick={() => {
                          setSelectedList(3);
                          setTimeout(() => calculateQuote(), 100);
                        }}
                        className="flex flex-col h-auto py-3"
                      >
                        <span className="font-semibold">LISTA 3</span>
                        <span className="text-sm">${Number(productPrices[0].list_3_price || 0).toLocaleString()}</span>
                      </Button>
                      <Button
                        variant={selectedList === 4 ? "default" : "outline"}
                        onClick={() => {
                          setSelectedList(4);
                          setTimeout(() => calculateQuote(), 100);
                        }}
                        className="flex flex-col h-auto py-3"
                      >
                        <span className="font-semibold">LISTA 4</span>
                        <span className="text-sm">${Number(productPrices[0].list_4_price || 0).toLocaleString()}</span>
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="credicontado" className="space-y-4 mt-4">
                  <div className="p-4 bg-accent/10 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Precio CrediContado:</span>
                      <span className="text-xl font-bold text-primary">
                        ${Number(productPrices[0].credicontado_price || 0).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Cálculo con 5% de interés incluido
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Número de Cuotas</Label>
                    <Input
                      type="number"
                      min={1}
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cuota Inicial</Label>
                    <Input
                      type="number"
                      min={0}
                      value={initialPayment || ""}
                      onChange={(e) => setInitialPayment(Number(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="credito" className="space-y-4 mt-4">
                  <div className="p-4 bg-accent/10 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Base FINANSUEÑOS:</span>
                      <span className="text-xl font-bold text-primary">
                        ${Number(productPrices[0].credit_price || 0).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Precio base para cálculo de amortización
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Plazo</Label>
                    <Select value={installments.toString()} onValueChange={(v) => setInstallments(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9">9 meses</SelectItem>
                        <SelectItem value="11">11 meses</SelectItem>
                        <SelectItem value="14">14 meses</SelectItem>
                        <SelectItem value="17">17 meses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="convenio" className="space-y-4 mt-4">
                  <div className="p-4 bg-accent/10 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Precio Convenio:</span>
                      <span className="text-xl font-bold text-primary">
                        ${Number(productPrices[0].convenio_price || 0).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Precio especial para convenios institucionales
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Botón solo para credicontado y crédito */}
              {(saleType === "credicontado" || saleType === "credito") && (
                <>
                  <Button onClick={calculateQuote} className="w-full mt-6">
                    Calcular Cotización
                  </Button>
                  
                  {/* Procesos adicionales - Solo para Crédito */}
                  {saleType === "credito" && quote && (
                    <div className="mt-6 space-y-4 p-4 border rounded-lg bg-muted/30">
                      <h3 className="font-semibold text-sm">Procesos Adicionales</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <Checkbox 
                            id="inicial-mayor" 
                            checked={inicialMayor}
                            onCheckedChange={(checked) => {
                              setInicialMayor(checked as boolean);
                              if (checked) {
                                setInicialMayorValue(Math.ceil(originalMonthlyPayment / 1000) * 1000);
                              } else {
                                setInicialMayorValue(0);
                                setAdjustedBasePrice(0);
                              }
                            }}
                          />
                          <div className="flex-1 space-y-2">
                            <Label htmlFor="inicial-mayor" className="text-sm font-medium cursor-pointer">
                              Inicial Mayor
                            </Label>
                            {inicialMayor && (
                              <div className="space-y-1">
                                <Input
                                  type="number"
                                  value={inicialMayorValue}
                                  onChange={(e) => {
                                    setInicialMayorValue(Number(e.target.value) || 0);
                                  }}
                                  placeholder={`Mínimo: $${(Math.ceil(originalMonthlyPayment / 1000) * 1000).toLocaleString()}`}
                                  className="mt-2"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Excedente: ${Math.max(0, inicialMayorValue - (Math.ceil(originalMonthlyPayment / 1000) * 1000)).toLocaleString()}
                                </p>
                                <Button 
                                  size="sm" 
                                  onClick={calculateQuote}
                                  className="mt-2 w-full"
                                >
                                  Recalcular con Inicial Mayor
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 opacity-50">
                          <Checkbox id="retanqueo-fs" disabled />
                          <Label htmlFor="retanqueo-fs" className="text-sm">
                            Retanqueo FS a FS <span className="text-xs text-muted-foreground">(Próximamente)</span>
                          </Label>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <Checkbox 
                            id="retanqueo-edc"
                            checked={retanqueoEdC}
                            onCheckedChange={(checked) => {
                              setRetanqueoEdC(checked as boolean);
                              if (!checked) {
                                setSaldoArpesod(0);
                                setNuevaBaseFS(0);
                              }
                            }}
                          />
                          <div className="flex-1 space-y-2">
                            <Label htmlFor="retanqueo-edc" className="text-sm font-medium cursor-pointer">
                              Retanqueo EdC a FS
                            </Label>
                            {retanqueoEdC && (
                              <div className="space-y-1">
                                <Input
                                  type="number"
                                  value={saldoArpesod || ""}
                                  onChange={(e) => {
                                    setSaldoArpesod(Number(e.target.value) || 0);
                                  }}
                                  placeholder="Saldo Arpesod"
                                  className="mt-2"
                                />
                                <Button 
                                  size="sm" 
                                  onClick={calculateQuote}
                                  className="mt-2 w-full"
                                >
                                  Recalcular con Retanqueo
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resultado - Solo para CrediContado y Crédito */}
        {quote && (saleType === "credicontado" || saleType === "credito") && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center text-primary">
                <FileText className="w-5 h-5 mr-2" />
                Resultado de Cotización
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {saleType === "credito" && retanqueoEdC && quote.saldoArpesod && quote.saldoArpesod > 0 ? (
                <>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Precio Base:</span>
                    <span className="font-bold">${quote.originalBasePrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Saldo Arpesod:</span>
                    <span className="font-bold text-orange-600">${quote.saldoArpesod.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Nueva Base FS:</span>
                    <span className="font-bold text-primary">${Math.round(quote.nuevaBaseFS).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Número de Cuotas:</span>
                    <span className="font-bold">{quote.installments}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-accent/10 px-4 rounded-lg">
                    <span className="font-bold text-lg">Cuota Mensual:</span>
                    <span className="font-bold text-xl text-accent">${(Math.ceil(quote.monthlyPayment / 1000) * 1000).toLocaleString()}</span>
                  </div>
                </>
              ) : saleType === "credito" && inicialMayor && quote.originalBasePrice ? (
                <>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Precio Base:</span>
                    <span className="font-bold">${quote.originalBasePrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Cuota Inicial:</span>
                    <span className="font-bold">${quote.initialPayment.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Precio Total:</span>
                    <span className="font-bold text-primary">${(quote.originalBasePrice - Math.max(0, quote.initialPayment - (Math.ceil(originalMonthlyPayment / 1000) * 1000))).toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Precio Base:</span>
                    <span className="font-bold">${quote.basePrice.toLocaleString()}</span>
                  </div>
                  {saleType === "credicontado" && quote.initialPayment > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Cuota Inicial:</span>
                      <span className="font-bold">${quote.initialPayment.toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
              {saleType === "credicontado" && (
                <>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Saldo después de Cuota Inicial:</span>
                    <span className="font-bold">${quote.remainingBalance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Financiación ({quote.installments * 5}%):</span>
                    <span className="font-bold">${(quote.totalPrice - quote.remainingBalance).toLocaleString()}</span>
                  </div>
                </>
              )}
              {!(saleType === "credito" && (inicialMayor || retanqueoEdC) && quote.originalBasePrice) && (
                <>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Precio Total:</span>
                    <span className="font-bold text-primary">${quote.totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Número de Cuotas:</span>
                    <span className="font-bold">{quote.installments}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-accent/10 px-4 rounded-lg">
                    <span className="font-bold text-lg">Cuota Mensual:</span>
                    <span className="font-bold text-xl text-accent">${(Math.ceil(quote.monthlyPayment / 1000) * 1000).toLocaleString()}</span>
                  </div>
                </>
              )}
              
              {/* Tabla de Amortización - Solo para Crédito sin Retanqueo */}
              {saleType === "credito" && !retanqueoEdC && (
                <Collapsible open={showAmortization} onOpenChange={setShowAmortization}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full mt-4">
                      {showAmortization ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                      Amortización
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2">Mes</th>
                            <th className="text-right py-2 px-2">Saldo</th>
                            <th className="text-right py-2 px-2">Abono Capital</th>
                            <th className="text-right py-2 px-2">Interés</th>
                            <th className="text-right py-2 px-2">Aval</th>
                            <th className="text-right py-2 px-2">Cuota</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calculateAmortization(quote.basePrice, quote.installments).map((row) => (
                            <tr key={row.month} className="border-b">
                              <td className="py-2 px-2">{row.month}</td>
                              <td className="text-right py-2 px-2">${Math.round(row.balance).toLocaleString()}</td>
                              <td className="text-right py-2 px-2">${row.principal.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                              <td className="text-right py-2 px-2">${row.interest.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                              <td className="text-right py-2 px-2">${row.aval.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                              <td className="text-right py-2 px-2 font-bold">${row.payment.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>
        )}

        {/* Formulario Cliente */}
        {showClientForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <HandshakeIcon className="w-5 h-5 mr-2 text-primary" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre Completo</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div className="space-y-2">
                <Label>Cédula (Opcional)</Label>
                <Input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Ej: 1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label>Celular</Label>
                <Input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Ej: 3001234567"
                />
              </div>
              <Button onClick={handleSubmitQuote} className="w-full" disabled={loading}>
                {loading ? "Guardando..." : "Guardar Cotización"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Modal de Historial de Cotizaciones */}
      {showQuotesHistory && (
        <QuotesHistory onClose={() => setShowQuotesHistory(false)} />
      )}
    </div>
  );
};

export default Cotizador;
