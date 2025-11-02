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
import { LogOut, CreditCard, FileText, HandshakeIcon, Settings, ChevronDown, ChevronUp, X } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import ProductSelector from "@/components/cotizador/ProductSelector";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import QuotesHistory from "@/components/cotizador/QuotesHistory";
import PriceListView from "@/components/cotizador/PriceListView";

const Cotizador = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [advisorName, setAdvisorName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Producto seleccionado y precios
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productPrices, setProductPrices] = useState<any>(null);
  
  // Tipo de venta
  const [saleType, setSaleType] = useState<"contado" | "credicontado" | "credito" | "convenio" | "creditofs">("contado");
  const [installments, setInstallments] = useState(1);
  const [initialPayment, setInitialPayment] = useState(0);
  const [selectedList, setSelectedList] = useState<1 | 2 | 3 | 4>(1); // Para contado
  
  // Crédito FS (Nuevo Modelo)
  const [creditoFSTermType, setCreditoFSTermType] = useState<'corto' | 'largo' | ''>('');
  const [creditoFSClientType, setCreditoFSClientType] = useState<string>('AAA');
  const [creditoFSTotalInitial, setCreditoFSTotalInitial] = useState(0);
  const [creditoFSRateType, setCreditoFSRateType] = useState<'mensual' | 'retanqueo'>('mensual');
  const [creditoFSFondoCuota, setCreditoFSFondoCuota] = useState(0);
  const [creditoFSAmortizationTable, setCreditoFSAmortizationTable] = useState<any[]>([]);
  const [creditoFSDiscountPercent, setCreditoFSDiscountPercent] = useState(0);
  const [creditoFSDiscountAmount, setCreditoFSDiscountAmount] = useState(0);
  const [creditoFSLargoInicialMayor, setCreditoFSLargoInicialMayor] = useState(false);
  const [creditoFSLargoCustomInitial, setCreditoFSLargoCustomInitial] = useState(0);
  const [creditoFSLargoCuotaFS, setCreditoFSLargoCuotaFS] = useState(0);
  const [shouldRecalculate, setShouldRecalculate] = useState(false);
  
  // Resetear valores cuando cambia el tipo de venta
  const handleSaleTypeChange = (newType: "contado" | "credicontado" | "credito" | "convenio" | "creditofs") => {
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
    setRetanqueoFS(false);
    setSaldoFinansuenos(0);
    setClientName("");
    setClientId("");
    setClientPhone("");
    setCreditoFSTermType('');
    setCreditoFSTotalInitial(0);
    setCreditoFSFondoCuota(0);
    setCreditoFSAmortizationTable([]);
    setCreditoFSDiscountPercent(0);
    setCreditoFSDiscountAmount(0);
    setCreditoFSLargoInicialMayor(false);
    setCreditoFSLargoCustomInitial(0);
    setCreditoFSLargoCuotaFS(0);
    
    if (newType === "contado") {
      setInstallments(1);
      setSelectedList(1);
    } else if (newType === "credicontado") {
      setInstallments(1);
    } else if (newType === "credito") {
      setInstallments(9);
    } else if (newType === "convenio") {
      setInstallments(1);
    } else if (newType === "creditofs") {
      setInstallments(3);
      setCreditoFSTermType('corto');
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
  
  // Retanqueo FS a FS
  const [retanqueoFS, setRetanqueoFS] = useState(false);
  const [saldoFinansuenos, setSaldoFinansuenos] = useState(0);
  
  // Historial de cotizaciones
  const [showQuotesHistory, setShowQuotesHistory] = useState(false);
  
  // Tasa de interés de retanqueo (cargada desde config)
  const [retanqueoInterestRate, setRetanqueoInterestRate] = useState(1.60);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        
        // Get advisor name
        const { data: advisorData } = await supabase
          .from("advisors")
          .select("full_name")
          .eq("user_id", session.user.id)
          .single();
        
        if (advisorData) {
          setAdvisorName(advisorData.full_name);
        }
        
        // Check if user has admin role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .single();
        
        setIsAdmin(!!roleData);
        
        // Load retanqueo interest rate from config
        const { data: configData } = await supabase
          .from("sales_plan_config")
          .select("config")
          .eq("plan_type", "credito")
          .single();
        
        if (configData?.config) {
          const config = configData.config as any;
          if (config.retanqueo_interest_rate) {
            setRetanqueoInterestRate(config.retanqueo_interest_rate);
          }
        }
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

  // useEffect para recalcular cuando cambia creditoFSTotalInitial
  useEffect(() => {
    if (shouldRecalculate && selectedProduct && productPrices) {
      calculateQuote();
      setShouldRecalculate(false);
    }
  }, [creditoFSTotalInitial, shouldRecalculate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada exitosamente");
  };

  const handleProductSelect = (product: any, prices: any) => {
    setSelectedProduct(product);
    setProductPrices(prices);
    setQuote(null);
    setShowClientForm(false);
  };

  const handleClearProduct = () => {
    setSelectedProduct(null);
    setProductPrices(null);
    setQuote(null);
    setShowClientForm(false);
    setShowAmortization(false);
    setInitialPayment(0);
    setInicialMayor(false);
    setInicialMayorValue(0);
    setAdjustedBasePrice(0);
    setOriginalMonthlyPayment(0);
    setRetanqueoEdC(false);
    setSaldoArpesod(0);
    setNuevaBaseFS(0);
    setRetanqueoFS(false);
    setSaldoFinansuenos(0);
    setClientName("");
    setClientId("");
    setClientPhone("");
    toast.success("Selección de producto limpiada");
  };

  // Función para calcular tabla de amortización con sistema francés
  const calculateAmortization = (basePrice: number, months: number, customInterestRate?: number) => {
    const avalRate = 0.02; // 2% del precio base (fijo en todas las cuotas)
    // Usar tasa de retanqueo si se proporciona, sino usar tasa normal
    const interestRate = customInterestRate !== undefined ? customInterestRate / 100 : 0.0187;
    
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

  const calculateQuote = async () => {
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
    
    // Variables para almacenar datos de Crédito FS
    let creditoFSData: any = undefined;
    let creditoFSDataLargo: any = undefined;

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
          
          // 4. Calcular Nueva Base FS - encontrar la base que al amortizarla dé la cuota más cercana
          const r = 0.0187; // tasa de interés
          const n = installments; // número de cuotas
          
          // Función auxiliar para calcular la cuota mensual SIN redondear dada una base
          const calcularCuotaSinRedondear = (base: number): number => {
            const fixedPaymentWithoutAval = base * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
            const avalFijo = base * 0.02;
            return fixedPaymentWithoutAval + avalFijo;
          };
          
          // Buscar la base cuya cuota sin redondear sea más cercana al objetivo
          let mejorBase = 1000000;
          let menorDiferencia = Infinity;
          
          // Rango de búsqueda amplio
          const baseMin = Math.max(1000000, nuevoTotal * 0.5);
          const baseMax = nuevoTotal * 1.5;
          
          // Iterar en incrementos de 1000 para encontrar la mejor base (solo miles, no centenas)
          for (let base = baseMin; base <= baseMax; base += 1000) {
            const cuotaSinRedondear = calcularCuotaSinRedondear(base);
            const cuotaRedondeada = Math.ceil(cuotaSinRedondear / 1000) * 1000;
            
            // Solo considerar bases cuya cuota redondeada sea >= cuota objetivo
            if (cuotaRedondeada >= nuevaCuotaObjetivo) {
              // Calcular qué tan cerca está la cuota sin redondear del objetivo
              const diferencia = Math.abs(cuotaSinRedondear - nuevaCuotaObjetivo);
              
              if (diferencia < menorDiferencia) {
                menorDiferencia = diferencia;
                mejorBase = base;
              }
              
              // Si la diferencia es muy pequeña, podemos parar
              if (diferencia < 100) {
                break;
              }
            }
          }
          
          // Redondear la base a miles completos (no centenas)
          const nuevaBase = Math.round(mejorBase / 1000) * 1000;
          
          // Verificar la cuota final con esta base
          const cuotaSinRedondearFinal = calcularCuotaSinRedondear(nuevaBase);
          const cuotaFinalVerificacion = Math.ceil(cuotaSinRedondearFinal / 1000) * 1000;
          
          console.log("=== DEBUG RETANQUEO ===");
          console.log("Cuota actual:", currentMonthlyPayment);
          console.log("Saldo Arpesod:", saldoArpesod);
          console.log("Nuevo Total:", nuevoTotal);
          console.log("Cuota Objetivo:", nuevaCuotaObjetivo);
          console.log("Nueva Base FS:", nuevaBase);
          console.log("Cuota sin redondear:", cuotaSinRedondearFinal);
          console.log("Cuota verificación:", cuotaFinalVerificacion);
          console.log("Diferencia:", menorDiferencia);
          console.log("=====================");
          
          // Actualizar todos los valores de forma inmediata
          basePrice = nuevaBase;
          remainingBalance = nuevaBase;
          totalPrice = nuevaBase;
          monthlyPayment = cuotaFinalVerificacion;
          
          // Actualizar estados
          setNuevaBaseFS(nuevaBase);
          setAdjustedBasePrice(nuevaBase);
          setOriginalMonthlyPayment(originalPayment);
        } else if (retanqueoFS && saldoFinansuenos > 0) {
          // Retanqueo FS a FS - Sumar saldo FinanSueños a la base y recalcular con tasa de retanqueo
          const r = retanqueoInterestRate / 100; // Usar tasa de retanqueo desde config
          const n = installments;
          
          // Nueva base = Base original + Saldo FinanSueños
          const nuevaBase = originalBasePrice + saldoFinansuenos;
          
          // Calcular cuota mensual con la nueva base y tasa de retanqueo
          const fixedPaymentWithoutAval = nuevaBase * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
          const avalFijo = nuevaBase * 0.02;
          const cuotaSinRedondear = fixedPaymentWithoutAval + avalFijo;
          const cuotaRedondeada = Math.ceil(cuotaSinRedondear / 1000) * 1000;
          
          console.log("=== DEBUG RETANQUEO FS a FS ===");
          console.log("Base Original:", originalBasePrice);
          console.log("Saldo FinanSueños:", saldoFinansuenos);
          console.log("Nueva Base:", nuevaBase);
          console.log("Tasa Retanqueo:", retanqueoInterestRate);
          console.log("Cuota sin redondear:", cuotaSinRedondear);
          console.log("Cuota redondeada:", cuotaRedondeada);
          console.log("=============================");
          
          // Actualizar valores
          basePrice = nuevaBase;
          remainingBalance = nuevaBase;
          totalPrice = nuevaBase;
          monthlyPayment = cuotaRedondeada;
          
          // Actualizar estados
          setAdjustedBasePrice(nuevaBase);
          setOriginalMonthlyPayment(originalPayment);
        } else if (inicialMayor && inicialMayorValue > 0) {
          // Si NO hay retanqueo pero SÍ hay inicial mayor
          const roundedOriginalPayment = Math.ceil(originalPayment / 1000) * 1000;
          
          if (inicialMayorValue < roundedOriginalPayment) {
            toast.error(`La inicial mayor debe ser al menos $${roundedOriginalPayment.toLocaleString()}`);
            return;
          }
          
          const excess = inicialMayorValue - roundedOriginalPayment;
          basePrice = originalBasePrice - excess;
          setAdjustedBasePrice(basePrice);
          
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
        } else {
          // Si NO hay retanqueo NI inicial mayor, cálculo normal
          // Guardar la cuota original
          setOriginalMonthlyPayment(originalPayment);
          
          remainingBalance = basePrice;
          totalPrice = basePrice;
          
          // Calcular la cuota mensual usando el sistema francés (valor exacto)
          const r = 0.0187;
          const n = installments;
          const fixedPaymentWithoutAval = basePrice * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
          const avalFijo = basePrice * 0.02;
          monthlyPayment = fixedPaymentWithoutAval + avalFijo; // Valor exacto sin redondear
        }
        break;
      
      case "convenio":
        // Para convenios usar el precio de CONVENIOS
        basePrice = Number(priceData.convenio_price || priceData.list_1_price);
        totalPrice = basePrice;
        remainingBalance = basePrice;
        monthlyPayment = basePrice;
        break;
      
      case "creditofs":
        // Nuevo Modelo de Crédito FS
        const basePriceFS = Number(priceData.credit_price || priceData.list_1_price);
        basePrice = basePriceFS;
        
        // Configuración de tipos de cliente (igual que en SalesPlanConfig)
        const clientTypeConfig: Record<string, { ci: number; fga: number }> = {
          'AAA': { ci: 0, fga: 0.25 },
          'AA': { ci: 0, fga: 0.25 },
          'A': { ci: 5, fga: 0.50 },
          'BBB': { ci: 5, fga: 0.50 },
          'BB': { ci: 10, fga: 1.00 },
          'B': { ci: 10, fga: 1.50 },
        };
        
        const clientConfig = clientTypeConfig[creditoFSClientType];
        
        // Cargar configuraciones desde Supabase
        const { data: fsConfigData } = await supabase
          .from("sales_plan_config")
          .select("config")
          .eq("plan_type", "credito")
          .single();
        
        const monthlyRate = (fsConfigData?.config as any)?.monthly_interest_rate || 2.5;
        const retanqueoRate = (fsConfigData?.config as any)?.retanqueo_interest_rate || 1.60;
        const tecAdm = 5; // Valor por defecto
        const seguro1 = 4; // Valor por defecto
        const seguro2Formula = 0.17; // Valor por defecto
        
        // Función para redondear a la centena superior cerrada en 0, 500 o 1000
        const roundToNearestFiveHundred = (value: number): number => {
          return Math.ceil(value / 500) * 500;
        };
        
        // Función para redondear hacia arriba en decenas
        const roundUpToTens = (value: number): number => {
          return Math.ceil(value / 10) * 10;
        };
        
        if (creditoFSTermType === 'corto') {
          // Lógica para corto plazo - NUEVA IMPLEMENTACIÓN
          if (creditoFSTotalInitial <= 0) {
            toast.error("Por favor ingrese una cuota inicial válida");
            return;
          }
          
          // Cargar rangos de descuento desde la base de datos
          const { data: discountRangesData } = await supabase
            .from("discount_ranges_history")
            .select("*")
            .eq("plan_type", "nuevo_modelo_credito")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          
          let discountRanges = [
            { minPercent: 0, maxPercent: 0, discount: 0 },
            { minPercent: 24.999, maxPercent: 44.999, discount: 15 },
            { minPercent: 45, maxPercent: 64.999, discount: 17 },
          ];
          
          if (discountRangesData?.ranges) {
            discountRanges = discountRangesData.ranges as any[];
          }
          
          // 1. Calcular el % que representa la Cuota Inicial ingresada sobre el Precio Base
          const initialPercent = (creditoFSTotalInitial / basePriceFS) * 100;
          
          // Ordenar rangos por minPercent ascendente
          const sortedRanges = [...discountRanges].sort((a: any, b: any) => a.minPercent - b.minPercent);
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
            if (initialPercent >= (range as any).minPercent && initialPercent <= (range as any).maxPercent) {
              discountPercent = (range as any).discount;
              break;
            }
          }
          
          // 3. Calcular descuento y Nueva Base FS (Precio Base - Descuento)
          const discountAmount = basePriceFS * (discountPercent / 100);
          const discountedPrice = basePriceFS - discountAmount;
          
          // 4. Calcular algebraicamente Cuota Inicial
          const ciPercent = clientConfig.ci / 100;
          const cuotaInicialCalculada = (creditoFSTotalInitial - discountedPrice * ciPercent) / (1 - ciPercent);
          
          // 5. Redondear Cuota Inicial hacia arriba en decenas
          const cuotaInicialRedondeada = roundUpToTens(cuotaInicialCalculada);
          
          // 6. Calcular Cuota FS = Cuota Inicial Total - Cuota Inicial
          // Esto GARANTIZA que Cuota Inicial + Cuota FS = Cuota Inicial Total (exacto)
          const cuotaFSCalculada = creditoFSTotalInitial - cuotaInicialRedondeada;
          
          // 7. Calcular Valor a Financiar = Nueva Base FS - Cuota Inicial
          const financedAmount = discountedPrice - cuotaInicialRedondeada;
          
          // 7. Guardar valores para mostrar
          setCreditoFSFondoCuota(cuotaFSCalculada); // Esta es la Cuota FS
          setCreditoFSDiscountPercent(discountPercent);
          setCreditoFSDiscountAmount(discountAmount);
          
          // Usar tasa mensual para corto plazo
          const interestRate = monthlyRate / 100;
          const tecAdmPerMonth = (financedAmount * (tecAdm / 100)) / installments;
          // FGA se calcula sobre el Valor a Financiar, no sobre el Precio Base
          const fgaPerMonth = financedAmount * (clientConfig.fga / 100);
          
          // Calcular cuota base usando sistema francés
          const r = interestRate;
          const n = installments;
          const fixedPaymentWithoutExtras = financedAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
          
          const seguro1Monthly = fixedPaymentWithoutExtras * (seguro1 / 100);
          const seguro2Monthly = (financedAmount * seguro2Formula) / 1000;
          
          // Generar tabla de amortización
          let balance = financedAmount;
          const amortTable = [];
          
          for (let i = 1; i <= installments; i++) {
            const interest = balance * interestRate;
            const principal = fixedPaymentWithoutExtras - interest;
            
            const seguro1Row = fixedPaymentWithoutExtras * (seguro1 / 100);
            const seguro2Row = (balance * seguro2Formula) / 1000;
            
            const totalPayment = fixedPaymentWithoutExtras + tecAdmPerMonth + fgaPerMonth + seguro1Row + seguro2Row;
            
            amortTable.push({
              month: i,
              balance: balance,
              principal: principal,
              interest: interest,
              tecAdm: tecAdmPerMonth,
              fga: fgaPerMonth,
              seguro1: seguro1Row,
              seguro2: seguro2Row,
              payment: totalPayment
            });
            
            balance -= principal;
          }
          
          // NO establecer el estado aquí, lo haremos al final junto con quote
          
          monthlyPayment = fixedPaymentWithoutExtras + tecAdmPerMonth + fgaPerMonth + seguro1Monthly + seguro2Monthly;
          basePrice = discountedPrice;
          totalPrice = discountedPrice;
          remainingBalance = financedAmount;
          
          // Guardar tabla y valores para incluir en quote
          creditoFSData = {
            amortizationTable: amortTable,
            cuotaInicialAjustada: cuotaInicialRedondeada,
            discountPercent,
            discountAmount,
            cuotaFS: cuotaFSCalculada
          };
          
        } else if (creditoFSTermType === 'largo') {
          // Determinar si tiene cuota inicial mayor o no
          const tieneCuotaInicialMayor = creditoFSLargoInicialMayor && creditoFSTotalInitial > 0;
          
          if (!tieneCuotaInicialMayor) {
            // CASO 1: SIN CUOTA INICIAL MAYOR
            // - NO tiene Cuota Inicial
            // - La liquidación se hace sobre "Base FS" (que es el Precio Base)
            // - Puede tener "Cuota FS" = Base FS × C.I.% (si C.I.% > 0)
            
            const baseFS = basePriceFS; // Base FS = Precio Base
            const ciPercent = clientConfig.ci / 100;
            const cuotaFS = baseFS * ciPercent; // Cuota FS = Base FS × C.I.%
            
            setCreditoFSLargoCuotaFS(cuotaFS);
            setInitialPayment(0); // No hay cuota inicial
            
            // Valor a financiar para amortización = Base FS
            const valorAFinanciar = baseFS;
            
            const interestRate = creditoFSRateType === 'mensual' ? monthlyRate / 100 : retanqueoRate / 100;
            const tecAdmPerMonth = (valorAFinanciar * (tecAdm / 100)) / installments;
            const fgaPerMonth = valorAFinanciar * (clientConfig.fga / 100);
            
            // Calcular cuota base usando sistema francés
            const r = interestRate;
            const n = installments;
            const fixedPaymentWithoutExtras = valorAFinanciar * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
            
            const seguro1Monthly = fixedPaymentWithoutExtras * (seguro1 / 100);
            const seguro2Monthly = (valorAFinanciar * seguro2Formula) / 1000;
            
            // Generar tabla de amortización
            let balance = valorAFinanciar;
            const amortTable = [];
            
            for (let i = 1; i <= installments; i++) {
              const interest = balance * interestRate;
              const principal = fixedPaymentWithoutExtras - interest;
              
              const seguro1Row = fixedPaymentWithoutExtras * (seguro1 / 100);
              const seguro2Row = (balance * seguro2Formula) / 1000;
              
              const totalPayment = fixedPaymentWithoutExtras + tecAdmPerMonth + fgaPerMonth + seguro1Row + seguro2Row;
              
              amortTable.push({
                month: i,
                balance: balance,
                principal: principal,
                interest: interest,
                tecAdm: tecAdmPerMonth,
                fga: fgaPerMonth,
                seguro1: seguro1Row,
                seguro2: seguro2Row,
                payment: totalPayment
              });
              
              balance -= principal;
            }
            
            monthlyPayment = fixedPaymentWithoutExtras + tecAdmPerMonth + fgaPerMonth + seguro1Monthly + seguro2Monthly;
            totalPrice = basePriceFS;
            remainingBalance = valorAFinanciar;
            
            creditoFSDataLargo = {
              amortizationTable: amortTable,
              cuotaFS: cuotaFS,
              cuotaInicial: 0,
              baseFS: baseFS,
              precioBase: basePriceFS,
              inicialMayor: false
            };
            
          } else {
            // CASO 2: CON CUOTA INICIAL MAYOR
            // El usuario ingresa "Cuota Inicial Total" que se divide en:
            // - "Cuota Inicial" (reduce la Base FS directamente)
            // - "Cuota FS" (es el C.I% del valor a financiar = Nueva Base FS)
            
            const ciPercent = clientConfig.ci / 100;
            
            let cuotaInicial = 0;
            let cuotaFS = 0;
            let nuevaBaseFS = 0;
            
            console.log('🔍 DEBUG Cotizador - Valores iniciales:', {
              basePriceFS,
              creditoFSTotalInitial,
              'clientConfig.ci': clientConfig.ci,
              ciPercent,
              creditoFSClientType
            });

            if (ciPercent === 0) {
              // Si no hay C.I%, toda la Cuota Inicial Total va a reducir la Base FS
              cuotaInicial = creditoFSTotalInitial;
              cuotaFS = 0;
              nuevaBaseFS = basePriceFS - cuotaInicial;
            } else {
              // Si hay C.I%, resolver algebraicamente:
              // Fórmula: Cuota Inicial = (Cuota Inicial Total - Base FS × C.I%) / (1 - C.I%)
              
              const rawCuotaInicial = (creditoFSTotalInitial - basePriceFS * ciPercent) / (1 - ciPercent);
              
              // Redondear Cuota Inicial hacia arriba a la decena más cercana
              cuotaInicial = Math.ceil(rawCuotaInicial / 10) * 10;
              
              // Calcular Nueva Base FS
              nuevaBaseFS = basePriceFS - cuotaInicial;
              
              // Calcular Cuota FS para que sume exactamente la Cuota Inicial Total
              cuotaFS = creditoFSTotalInitial - cuotaInicial;
              
              console.log('✅ RESULTADO Cotizador - Cálculo Cuota Inicial Mayor:', {
                'Base FS (Original)': basePriceFS.toLocaleString('es-CO'),
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
            
            setCreditoFSLargoCuotaFS(cuotaFS);
            setInitialPayment(cuotaInicial);
            
            // Valor a Financiar para la amortización = Nueva Base FS
            const valorAFinanciar = nuevaBaseFS;
            
            const interestRate = creditoFSRateType === 'mensual' ? monthlyRate / 100 : retanqueoRate / 100;
            const tecAdmPerMonth = (valorAFinanciar * (tecAdm / 100)) / installments;
            const fgaPerMonth = valorAFinanciar * (clientConfig.fga / 100);
            
            // Calcular cuota base usando sistema francés
            const r = interestRate;
            const n = installments;
            const fixedPaymentWithoutExtras = valorAFinanciar * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
            
            const seguro1Monthly = fixedPaymentWithoutExtras * (seguro1 / 100);
            const seguro2Monthly = (valorAFinanciar * seguro2Formula) / 1000;
            
            // Generar tabla de amortización
            let balance = valorAFinanciar;
            const amortTable = [];
            
            for (let i = 1; i <= installments; i++) {
              const interest = balance * interestRate;
              const principal = fixedPaymentWithoutExtras - interest;
              
              const seguro1Row = fixedPaymentWithoutExtras * (seguro1 / 100);
              const seguro2Row = (balance * seguro2Formula) / 1000;
              
              const totalPayment = fixedPaymentWithoutExtras + tecAdmPerMonth + fgaPerMonth + seguro1Row + seguro2Row;
              
              amortTable.push({
                month: i,
                balance: balance,
                principal: principal,
                interest: interest,
                tecAdm: tecAdmPerMonth,
                fga: fgaPerMonth,
                seguro1: seguro1Row,
                seguro2: seguro2Row,
                payment: totalPayment
              });
              
              balance -= principal;
            }
            
            monthlyPayment = fixedPaymentWithoutExtras + tecAdmPerMonth + fgaPerMonth + seguro1Monthly + seguro2Monthly;
            totalPrice = basePriceFS;
            remainingBalance = valorAFinanciar;
            
            creditoFSDataLargo = {
              amortizationTable: amortTable,
              cuotaFS: cuotaFS,
              cuotaInicial: cuotaInicial,
              nuevaBaseFS: nuevaBaseFS,
              cuotaInicialTotal: creditoFSTotalInitial,
              baseFS: basePriceFS, // Base FS original
              baseFSOriginal: basePriceFS,
              precioBase: basePriceFS,
              inicialMayor: true
            };
          }
        }
        break;
    }

    // Preparar objeto quote con todos los datos necesarios
    const quoteData: any = {
      basePrice,
      totalPrice,
      initialPayment: saleType === "credito" && inicialMayor ? inicialMayorValue : 
                      saleType === "creditofs" && creditoFSTermType === 'corto' && (typeof creditoFSData !== 'undefined') ? creditoFSData.cuotaInicialAjustada : 
                      initialPayment,
      remainingBalance,
      installments,
      monthlyPayment,
      saleType,
      priceListId: priceData.price_list_id,
      productId: selectedProduct.id,
      originalBasePrice: saleType === "credito" && (inicialMayor || retanqueoEdC || retanqueoFS) ? Number(productPrices[0].credit_price || productPrices[0].list_1_price) : basePrice,
      saldoArpesod: retanqueoEdC ? saldoArpesod : 0,
      nuevaBaseFS: retanqueoEdC ? basePrice : 0,
      saldoFinansuenos: retanqueoFS ? saldoFinansuenos : 0,
      baseFinalFS: retanqueoFS ? basePrice : 0
    };
    
    // Agregar datos específicos de Crédito FS si aplica
    if (saleType === "creditofs") {
      if (creditoFSTermType === 'corto' && typeof creditoFSData !== 'undefined') {
        quoteData.creditoFSAmortizationTable = creditoFSData.amortizationTable;
        quoteData.creditoFSDiscountPercent = creditoFSData.discountPercent;
        quoteData.creditoFSDiscountAmount = creditoFSData.discountAmount;
        quoteData.creditoFSCuotaFS = creditoFSData.cuotaFS;
        
        // Actualizar estados para mantener compatibilidad con código existente
        setCreditoFSAmortizationTable(creditoFSData.amortizationTable);
        setCreditoFSDiscountPercent(creditoFSData.discountPercent);
        setCreditoFSDiscountAmount(creditoFSData.discountAmount);
        setCreditoFSFondoCuota(creditoFSData.cuotaFS);
        setInitialPayment(creditoFSData.cuotaInicialAjustada);
      } else if (creditoFSTermType === 'largo' && typeof creditoFSDataLargo !== 'undefined') {
        quoteData.creditoFSAmortizationTable = creditoFSDataLargo.amortizationTable;
        quoteData.creditoFSCuotaFS = creditoFSDataLargo.cuotaFS;
        quoteData.creditoFSCuotaInicial = creditoFSDataLargo.cuotaInicial;
        quoteData.creditoFSBaseFSOriginal = creditoFSDataLargo.baseFSOriginal || creditoFSDataLargo.precioBase;
        quoteData.creditoFSBaseFS = creditoFSDataLargo.baseFS;
        quoteData.creditoFSNuevaBaseFS = creditoFSDataLargo.nuevaBaseFS;
        quoteData.creditoFSCuotaInicialTotal = creditoFSDataLargo.cuotaInicialTotal;
        quoteData.creditoFSPrecioBase = creditoFSDataLargo.precioBase;
        quoteData.creditoFSInicialMayor = creditoFSDataLargo.inicialMayor;
        
        // Actualizar estado
        setCreditoFSAmortizationTable(creditoFSDataLargo.amortizationTable);
      }
    }
    
    setQuote(quoteData);

    // Mostrar formulario de cliente según el tipo de venta
    if (saleType === "contado" || saleType === "convenio" || saleType === "credicontado" || saleType === "credito" || saleType === "creditofs") {
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
          <CardHeader className="space-y-4 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-xl sm:text-2xl text-primary">Cotizador EdC</CardTitle>
                <CardDescription className="mt-1">
                  Asesor: {advisorName || user?.email}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="flex-1 sm:flex-initial">
                    <Settings className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Panel Admin</span>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowQuotesHistory(true)} className="flex-1 sm:flex-initial">
                  <FileText className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Cotizaciones</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="flex-1 sm:flex-initial">
                  <LogOut className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Selector de Productos */}
        <div className="relative">
          <ProductSelector onProductSelect={handleProductSelect} />
          {selectedProduct && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearProduct}
              className="absolute top-4 right-4 h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-4 h-4 mr-1" />
              <span className="text-xs">Limpiar</span>
            </Button>
          )}
        </div>

        {/* Lista de Precios */}
        <PriceListView />

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
                <TabsList className={`grid w-full ${user?.email === 'contacto@finansuenos.com' ? 'grid-cols-5' : 'grid-cols-3'}`}>
                  <TabsTrigger value="contado" className="text-[10px] sm:text-sm px-1 sm:px-3">Contado</TabsTrigger>
                  {user?.email === 'contacto@finansuenos.com' && (
                    <>
                      <TabsTrigger value="credicontado" className="text-[10px] sm:text-sm px-1 sm:px-3">CrediContado</TabsTrigger>
                      <TabsTrigger value="credito" className="text-[10px] sm:text-sm px-1 sm:px-3">Crédito</TabsTrigger>
                    </>
                  )}
                  <TabsTrigger value="creditofs" className="text-[10px] sm:text-sm px-1 sm:px-3">Crédito FS</TabsTrigger>
                  <TabsTrigger value="convenio" className="text-[10px] sm:text-sm px-1 sm:px-3">Convenio</TabsTrigger>
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
                      onChange={(e) => {
                        const val = e.target.value;
                        setInstallments(val === '' ? 1 : Number(val));
                      }}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cuota Inicial</Label>
                    <Input
                      type="number"
                      min={0}
                      value={initialPayment || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInitialPayment(val === '' ? 0 : Number(val));
                      }}
                      onFocus={(e) => e.target.select()}
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

                <TabsContent value="creditofs" className="space-y-4 mt-4">
                  {!quote && (
                    <div className="p-4 bg-accent/10 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Base FINANSUEÑOS:</span>
                        <span className="text-xl font-bold text-primary">
                          ${Number(productPrices[0].credit_price || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Plazo</Label>
                    <div className="flex gap-4 items-center">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="fs-corto"
                          name="fsTermType"
                          value="corto"
                          checked={creditoFSTermType === 'corto'}
                          onChange={(e) => {
                            setCreditoFSTermType(e.target.value as 'corto' | 'largo');
                            setInstallments(3);
                          }}
                          className="w-4 h-4"
                        />
                        <label htmlFor="fs-corto" className="cursor-pointer text-sm">Corto Plazo</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="fs-largo"
                          name="fsTermType"
                          value="largo"
                          checked={creditoFSTermType === 'largo'}
                          onChange={(e) => {
                            setCreditoFSTermType(e.target.value as 'corto' | 'largo');
                            setInstallments(9);
                          }}
                          className="w-4 h-4"
                        />
                        <label htmlFor="fs-largo" className="cursor-pointer text-sm">Largo Plazo</label>
                      </div>
                    </div>
                  </div>

                  {creditoFSTermType && (
                    <>
                      <div className="space-y-2">
                        <Label>No. Cuotas</Label>
                        <Select 
                          value={installments.toString()} 
                          onValueChange={(value) => setInstallments(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione número de cuotas" />
                          </SelectTrigger>
                          <SelectContent>
                            {creditoFSTermType === 'corto' ? (
                              <>
                                <SelectItem value="3">3 cuotas</SelectItem>
                                <SelectItem value="4">4 cuotas</SelectItem>
                                <SelectItem value="5">5 cuotas</SelectItem>
                                <SelectItem value="6">6 cuotas</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="9">9 cuotas</SelectItem>
                                <SelectItem value="10">10 cuotas</SelectItem>
                                <SelectItem value="11">11 cuotas</SelectItem>
                                <SelectItem value="12">12 cuotas</SelectItem>
                                <SelectItem value="13">13 cuotas</SelectItem>
                                <SelectItem value="14">14 cuotas</SelectItem>
                                <SelectItem value="15">15 cuotas</SelectItem>
                                <SelectItem value="16">16 cuotas</SelectItem>
                                <SelectItem value="17">17 cuotas</SelectItem>
                                <SelectItem value="18">18 cuotas</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Tipo Cliente</Label>
                        <Select value={creditoFSClientType} onValueChange={setCreditoFSClientType}>
                          <SelectTrigger>
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

                      {creditoFSTermType === 'corto' && (
                        <div className="space-y-2">
                          <Label>Cuota Inicial Total</Label>
                          <Input
                            type="number"
                            step="1000"
                            min="0"
                            value={creditoFSTotalInitial || ''}
                            onChange={(e) => setCreditoFSTotalInitial(parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            placeholder="Ingrese la cuota inicial total"
                          />
                        </div>
                      )}

                      {creditoFSTermType === 'largo' && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Tasa de Interés</Label>
                          <div className="flex gap-4 items-center">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="fs-mensual"
                                name="fsRateType"
                                value="mensual"
                                checked={creditoFSRateType === 'mensual'}
                                onChange={(e) => setCreditoFSRateType(e.target.value as 'mensual' | 'retanqueo')}
                                className="w-4 h-4"
                              />
                              <label htmlFor="fs-mensual" className="cursor-pointer text-sm">Tasa Mensual</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="fs-retanqueo"
                                name="fsRateType"
                                value="retanqueo"
                                checked={creditoFSRateType === 'retanqueo'}
                                onChange={(e) => setCreditoFSRateType(e.target.value as 'mensual' | 'retanqueo')}
                                className="w-4 h-4"
                              />
                              <label htmlFor="fs-retanqueo" className="cursor-pointer text-sm">Tasa Retanqueo</label>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
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
                  
                  {/* Información del Cliente - Directo para Convenio */}
                  <div className="space-y-4 mt-6">
                    <h3 className="font-semibold">Información del Cliente</h3>
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
                        type="tel"
                        value={clientPhone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 10) {
                            setClientPhone(value);
                          }
                        }}
                        placeholder="Ej: 3001234567"
                        maxLength={10}
                      />
                    </div>
                    <Button onClick={() => {
                      calculateQuote();
                      // El guardado se hará después del cálculo
                      setTimeout(() => {
                        if (clientName && clientPhone) {
                          handleSubmitQuote();
                        }
                      }, 100);
                    }} className="w-full" disabled={loading || !clientName || !clientPhone}>
                      {loading ? "Guardando..." : "Guardar cotización como convenio"}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Botón solo para credicontado, crédito y Crédito FS */}
              {(saleType === "credicontado" || saleType === "credito" || saleType === "creditofs") && (
                <>
                  <Button onClick={calculateQuote} className="w-full mt-6">
                    {saleType === "creditofs" ? "Calcular Amortización" : "Calcular Cotización"}
                  </Button>
                  
                  {/* Radio Button Cuota Inicial Mayor - Solo para Largo Plazo después de calcular */}
                  {saleType === "creditofs" && creditoFSTermType === 'largo' && quote && (
                    <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          id="inicial-mayor-largo"
                          checked={creditoFSLargoInicialMayor}
                          onChange={(e) => {
                            setCreditoFSLargoInicialMayor(e.target.checked);
                            if (!e.target.checked) {
                              setCreditoFSLargoCustomInitial(0);
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="inicial-mayor-largo" className="cursor-pointer font-medium">
                          Cuota Inicial Mayor
                        </Label>
                      </div>
                      
                      {creditoFSLargoInicialMayor && (
                        <div className="mt-3 space-y-2">
                          <Label>Valor Cuota Inicial Total</Label>
                          <Input
                            type="number"
                            step="1000"
                            min={creditoFSLargoCuotaFS}
                            value={creditoFSLargoCustomInitial || ''}
                            onChange={(e) => setCreditoFSLargoCustomInitial(parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            placeholder={`Mínimo: $${creditoFSLargoCuotaFS.toLocaleString()}`}
                          />
                          <p className="text-xs text-muted-foreground">
                            Debe ser mayor a la Cuota FS: ${creditoFSLargoCuotaFS.toLocaleString()}
                          </p>
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setCreditoFSTotalInitial(creditoFSLargoCustomInitial);
                              setShouldRecalculate(true);
                            }}
                            className="w-full mt-2"
                          >
                            Recalcular con Cuota Inicial Mayor
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  
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
                              <span className="hidden sm:inline">Cuota Inicial Mayor</span>
                              <span className="sm:hidden">Inicial Mayor</span>
                            </Label>
                            {inicialMayor && (
                              <div className="space-y-1">
                                <Input
                                  type="number"
                                  value={inicialMayorValue}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setInicialMayorValue(val === '' ? 0 : Number(val));
                                  }}
                                  onFocus={(e) => e.target.select()}
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
                        
                        <div className="flex items-start space-x-3">
                          <Checkbox 
                            id="retanqueo-fs"
                            checked={retanqueoFS}
                            onCheckedChange={(checked) => {
                              setRetanqueoFS(checked as boolean);
                              if (!checked) {
                                setSaldoFinansuenos(0);
                              }
                            }}
                          />
                          <div className="flex-1 space-y-2">
                            <Label htmlFor="retanqueo-fs" className="text-sm font-medium cursor-pointer">
                              Retanqueo FS a FS
                            </Label>
                            {retanqueoFS && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={saldoFinansuenos || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setSaldoFinansuenos(val === '' ? 0 : Number(val));
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    placeholder="Saldo FinanSueños"
                                    className="mt-2"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="shrink-0"
                                    onClick={() => toast.info('Aquí debes escribir el saldo del "Total a Pagar" que muestra Manager al momento de marcar la casilla "Pago Total"')}
                                  >
                                    <span className="text-xs bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">i</span>
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Saldo FinanSueños <span className="text-[10px]">(pago total)</span>
                                </p>
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
                                    const val = e.target.value;
                                    setSaldoArpesod(val === '' ? 0 : Number(val));
                                  }}
                                  onFocus={(e) => e.target.select()}
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
              {saleType === "credito" && retanqueoFS && quote.saldoFinansuenos && quote.saldoFinansuenos > 0 ? (
                <>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Precio Base:</span>
                    <span className="font-bold">${quote.originalBasePrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Saldo FS:</span>
                    <span className="font-bold text-blue-600">${quote.saldoFinansuenos.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Base Final:</span>
                    <span className="font-bold text-primary">${Math.round(quote.baseFinalFS).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Número de Cuotas:</span>
                    <span className="font-bold">{quote.installments}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-accent/10 px-4 rounded-lg">
                    <span className="font-bold text-lg">Cuota Mensual:</span>
                    <span className="font-bold text-xl text-accent">${Math.round(quote.monthlyPayment).toLocaleString()}</span>
                  </div>
                  
                  {/* Botón para desplegar amortización */}
                  <Collapsible open={showAmortization} onOpenChange={setShowAmortization}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full mt-4">
                        {showAmortization ? (
                          <>
                            <ChevronUp className="w-4 h-4 mr-2" />
                            Ocultar Amortización
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4 mr-2" />
                            Ver Tabla de Amortización
                          </>
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4">
                      {showAmortization && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="p-2 text-left">Mes</th>
                                <th className="p-2 text-right">Saldo</th>
                                <th className="p-2 text-right">Capital</th>
                                <th className="p-2 text-right">Interés</th>
                                <th className="p-2 text-right">Aval</th>
                                <th className="p-2 text-right">Cuota</th>
                              </tr>
                            </thead>
                            <tbody>
                              {calculateAmortization(quote.baseFinalFS, quote.installments, retanqueoInterestRate).map((row) => (
                                <tr key={row.month} className="border-b">
                                  <td className="p-2">{row.month}</td>
                                  <td className="p-2 text-right">${row.balance.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                                  <td className="p-2 text-right">${row.principal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                                  <td className="p-2 text-right">${row.interest.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                                  <td className="p-2 text-right">${row.aval.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                                  <td className="p-2 text-right font-bold">${Math.ceil(row.payment).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </>
              ) : saleType === "credito" && retanqueoEdC && quote.saldoArpesod && quote.saldoArpesod > 0 ? (
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
                    <span className="font-medium">Base FS:</span>
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
                  
                  {/* Botón para desplegar amortización en retanqueo EdC a FS */}
                  <Collapsible open={showAmortization} onOpenChange={setShowAmortization}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full mt-4">
                        {showAmortization ? (
                          <>
                            <ChevronUp className="w-4 h-4 mr-2" />
                            Ocultar Amortización
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4 mr-2" />
                            Ver Tabla de Amortización
                          </>
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4">
                      {showAmortization && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="p-2 text-left">Mes</th>
                                <th className="p-2 text-right">Saldo</th>
                                <th className="p-2 text-right">Capital</th>
                                <th className="p-2 text-right">Interés</th>
                                <th className="p-2 text-right">Aval</th>
                                <th className="p-2 text-right">Cuota</th>
                              </tr>
                            </thead>
                            <tbody>
                              {calculateAmortization(quote.nuevaBaseFS, quote.installments).map((row) => (
                                <tr key={row.month} className="border-b">
                                  <td className="p-2">{row.month}</td>
                                  <td className="p-2 text-right">${row.balance.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                                  <td className="p-2 text-right">${row.principal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                                  <td className="p-2 text-right">${row.interest.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                                  <td className="p-2 text-right">${row.aval.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                                  <td className="p-2 text-right font-bold">${Math.ceil(row.payment).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </>
              ) : saleType === "credito" && inicialMayor && quote.originalBasePrice ? (
                <>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Precio Base:</span>
                    <span className="font-bold">${quote.originalBasePrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Cuota Inicial Total:</span>
                    <span className="font-bold">${quote.initialPayment.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Base FS:</span>
                    <span className="font-bold text-primary">${quote.basePrice.toLocaleString()}</span>
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
              {!(saleType === "credito" && (inicialMayor || retanqueoEdC || retanqueoFS) && quote.originalBasePrice) && (
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
              {saleType === "credito" && !retanqueoEdC && !retanqueoFS && (
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

        {/* Resultado - Para Crédito FS */}
        {quote && saleType === "creditofs" && quote.creditoFSAmortizationTable && quote.creditoFSAmortizationTable.length > 0 && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center text-primary">
                <FileText className="w-5 h-5 mr-2" />
                Resultado de Cotización - Crédito FS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {creditoFSTermType === 'corto' && (
                <>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Base FS:</span>
                    <span className="font-bold text-primary">${quote.basePrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Cuota Inicial:</span>
                    <span className="font-bold">${quote.initialPayment.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Valor a Financiar:</span>
                    <span className="font-bold">${quote.remainingBalance.toLocaleString()}</span>
                  </div>
                </>
              )}
              
              {creditoFSTermType === 'largo' && (
                <>
                  {quote.creditoFSInicialMayor ? (
                    <>
                      <div className="flex justify-between py-2 border-b">
                        <span className="font-medium">Base FS (Original):</span>
                        <span className="font-bold text-primary">${(quote.creditoFSBaseFSOriginal || quote.creditoFSPrecioBase || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="font-medium">Cuota Inicial:</span>
                        <span className="font-bold">${(quote.creditoFSCuotaInicial || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="font-medium">Nueva Base FS:</span>
                        <span className="font-bold text-primary">${(quote.creditoFSNuevaBaseFS || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="font-medium">Cuota FS:</span>
                        <span className="font-bold">${Math.round(quote.creditoFSCuotaFS || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="font-medium">Cuota Inicial Total:</span>
                        <span className="font-bold text-blue-600">${(quote.creditoFSCuotaInicialTotal || creditoFSTotalInitial).toLocaleString()}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between py-2 border-b">
                        <span className="font-medium">Base FS:</span>
                        <span className="font-bold text-primary">${(quote.creditoFSBaseFS || quote.remainingBalance).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="font-medium">Cuota FS:</span>
                        <span className="font-bold">${Math.round(quote.creditoFSCuotaFS || 0).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </>
              )}
              
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">Número de Cuotas:</span>
                <span className="font-bold">{quote.installments}</span>
              </div>
              <div className="flex justify-between py-3 bg-accent/10 px-4 rounded-lg">
                <span className="font-bold text-lg">Cuota Mensual:</span>
                <span className="font-bold text-xl text-accent">${(Math.ceil(quote.monthlyPayment / 1000) * 1000).toLocaleString()}</span>
              </div>
              
              {/* Tabla de Amortización */}
              <Collapsible open={showAmortization} onOpenChange={setShowAmortization}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full mt-4">
                    {showAmortization ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-2" />
                        Ocultar Amortización
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-2" />
                        Ver Tabla de Amortización
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  {showAmortization && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-2 text-left">Mes</th>
                            <th className="p-2 text-right">Saldo</th>
                            <th className="p-2 text-right">Capital</th>
                            <th className="p-2 text-right">Interés</th>
                            <th className="p-2 text-right">Tec/Adm</th>
                            <th className="p-2 text-right">FGA</th>
                            <th className="p-2 text-right">Seg. 1</th>
                            <th className="p-2 text-right">Seg. 2</th>
                            <th className="p-2 text-right">Cuota</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quote.creditoFSAmortizationTable.map((row: any) => (
                            <tr key={row.month} className="border-b">
                              <td className="p-2">{row.month}</td>
                              <td className="p-2 text-right">${row.balance.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                              <td className="p-2 text-right">${row.principal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                              <td className="p-2 text-right">${row.interest.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                              <td className="p-2 text-right">${row.tecAdm.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                              <td className="p-2 text-right">${row.fga.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                              <td className="p-2 text-right">${row.seguro1.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                              <td className="p-2 text-right">${row.seguro2.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                              <td className="p-2 text-right font-bold">${row.payment.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted font-bold">
                          <tr>
                            <td className="p-2" colSpan={3}>TOTAL</td>
                            <td className="p-2 text-right">
                              ${quote.creditoFSAmortizationTable.reduce((sum: number, row: any) => sum + row.interest, 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                            </td>
                            <td className="p-2 text-right">
                              ${quote.creditoFSAmortizationTable.reduce((sum: number, row: any) => sum + row.tecAdm, 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                            </td>
                            <td className="p-2 text-right">
                              ${quote.creditoFSAmortizationTable.reduce((sum: number, row: any) => sum + row.fga, 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                            </td>
                            <td className="p-2 text-right">
                              ${quote.creditoFSAmortizationTable.reduce((sum: number, row: any) => sum + row.seguro1, 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                            </td>
                            <td className="p-2 text-right">
                              ${quote.creditoFSAmortizationTable.reduce((sum: number, row: any) => sum + row.seguro2, 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                            </td>
                            <td className="p-2 text-right"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        )}

        {/* Botón Postular Crédito - Solo para Crédito FS */}
        {quote && saleType === "creditofs" && (
          <Card className="border-primary/30">
            <CardContent className="pt-6 pb-6">
              <Button 
                className="w-full h-14 text-lg font-semibold"
                size="lg"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                <span className="hidden sm:inline">POSTULAR CRÉDITO</span>
                <span className="sm:hidden">SC CRÉDITO</span>
              </Button>
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
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 10) {
                      setClientPhone(value);
                    }
                  }}
                  placeholder="Ej: 3001234567"
                  maxLength={10}
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
