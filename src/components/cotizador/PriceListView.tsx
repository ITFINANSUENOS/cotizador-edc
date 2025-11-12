import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PriceList {
  id: string;
  name: string;
}

interface Product {
  id: string;
  brand: string;
  line: string;
  reference: string;
  description: string;
}

interface PriceListProduct {
  product_id: string;
  credit_price: number;
  list_1_price: number;
  list_4_price: number;
  products: Product;
}

interface PriceListViewProps {
  onProductSelect: (product: Product, priceListId: string) => void;
}

const PriceListView = ({ onProductSelect }: PriceListViewProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [selectedPriceList, setSelectedPriceList] = useState<string>("");
  const [lines, setLines] = useState<string[]>([]);
  const [selectedLine, setSelectedLine] = useState<string>("");
  const [products, setProducts] = useState<PriceListProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [salesConfig, setSalesConfig] = useState<any>(null);
  const [discountRanges, setDiscountRanges] = useState<any[]>([]);

  // Cargar configuración de planes y rangos de descuento desde la base de datos
  useEffect(() => {
    loadSalesConfig();
    loadDiscountRanges();
    loadPriceLists();
  }, []);

  const loadSalesConfig = async () => {
    const { data, error } = await supabase
      .from("sales_plan_config")
      .select("config")
      .eq("plan_type", "nuevo_modelo_credito" as any)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data) {
      setSalesConfig(data.config);
    } else {
      // Si no hay configuración, establecer objeto vacío para usar valores por defecto
      setSalesConfig({});
    }
  };

  const loadDiscountRanges = async () => {
    const { data, error } = await supabase
      .from('discount_ranges_history')
      .select('*')
      .eq('plan_type', 'nuevo_modelo_credito')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      const latestRanges = data[0].ranges as Array<{minPercent: number, maxPercent: number, discount: number}>;
      setDiscountRanges(latestRanges);
    } else {
      // Si no hay rangos en la base de datos, usar valores por defecto de SalesPlanConfig
      setDiscountRanges([
        { minPercent: 70, maxPercent: 100, discount: 25 },
        { minPercent: 45, maxPercent: 69.999, discount: 20 },
        { minPercent: 29.999, maxPercent: 44.999, discount: 15 },
      ]);
    }
  };

  // Cargar líneas cuando se selecciona una lista
  useEffect(() => {
    if (selectedPriceList) {
      loadLines();
    }
  }, [selectedPriceList]);

  // Cargar productos cuando se selecciona una línea
  useEffect(() => {
    if (selectedPriceList && selectedLine) {
      loadProducts();
    }
  }, [selectedPriceList, selectedLine]);

  const loadPriceLists = async () => {
    const { data, error } = await supabase
      .from("price_lists")
      .select("id, name")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPriceLists(data);
      if (data.length > 0) {
        setSelectedPriceList(data[0].id);
      }
    }
  };

  const loadLines = async () => {
    const { data, error } = await supabase
      .from("price_list_products")
      .select("products(line)")
      .eq("price_list_id", selectedPriceList);

    if (!error && data) {
      const uniqueLines = [...new Set(data.map((item: any) => item.products?.line).filter(Boolean))];
      setLines(uniqueLines as string[]);
      if (uniqueLines.length > 0) {
        setSelectedLine(uniqueLines[0] as string);
      }
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("price_list_products")
      .select(`
        product_id,
        credit_price,
        list_1_price,
        list_4_price,
        products(id, brand, line, reference, description)
      `)
      .eq("price_list_id", selectedPriceList);

    if (!error && data) {
      const filteredProducts = data.filter(
        (item: any) => item.products?.line === selectedLine
      );
      setProducts(filteredProducts as PriceListProduct[]);
    }
    setLoading(false);
  };

  // Obtener configuración desde la base de datos o usar valores por defecto
  const discountRangesConfig = discountRanges.length > 0 ? discountRanges : [
    { minPercent: 70, maxPercent: 100, discount: 25 },
    { minPercent: 45, maxPercent: 69.999, discount: 20 },
    { minPercent: 29.999, maxPercent: 44.999, discount: 15 },
  ];

  const clientTypeConfig = salesConfig?.clientTypes?.B || {
    ci: 10,
    fga: 1.50,
  };

  const monthlyInterestRate = salesConfig?.interestRate || 2.5;
  const tecAdm = salesConfig?.tecAdm || 5;
  const seguro1 = salesConfig?.seguro1 || 4;
  const seguro2Formula = salesConfig?.seguro2Formula || 0.17;

  // Función para redondear al 500 más cercano
  const roundToNearestFiveHundred = (value: number): number => {
    return Math.ceil(value / 500) * 500;
  };

  // Calcular cuota mensual para CORTO PLAZO - Réplica EXACTA de SalesPlanConfig.tsx
  const calculateShortTermMonthlyPayment = (basePrice: number, months: number): number => {
    const interestRate = monthlyInterestRate / 100;
    const ciPercent = clientTypeConfig.ci / 100;
    
    // Para corto plazo siempre es 50% de cuota inicial total
    const cuotaInicialTotal = basePrice * 0.50;
    
    // 1. Calcular el % que representa la Cuota Inicial sobre el Precio Base
    const initialPercent = (cuotaInicialTotal / basePrice) * 100;
    
    // 2. Determinar el descuento aplicable según el %
    let discountPercent = 0;
    for (const range of discountRangesConfig) {
      if (initialPercent >= range.minPercent && initialPercent <= range.maxPercent) {
        discountPercent = range.discount;
        break;
      }
    }
    
    // 3. Calcular descuento y Nueva Base FS
    const discountAmount = basePrice * (discountPercent / 100);
    const discountedPrice = basePrice - discountAmount;
    
    // 4. Calcular CI_nueva usando la fórmula exacta (SIN redondear)
    // Fórmula: CI_nueva = (Cuota Inicial Total - Nueva Base FS * % C.I.) / (1 - % C.I.)
    const cuotaInicialCalculadaRaw = (cuotaInicialTotal - discountedPrice * ciPercent) / (1 - ciPercent);
    
    // 5. Calcular Valor a Financiar basado en CI_nueva SIN REDONDEAR
    const financedAmount = discountedPrice - cuotaInicialCalculadaRaw;
    const disbursedAmount = roundToNearestFiveHundred(financedAmount);
    
    // 6. Calcular componentes de la cuota EXACTAMENTE como en SalesPlanConfig líneas 1284-1304
    const tecAdmPerMonth = (disbursedAmount * (tecAdm / 100)) / months;
    
    // FGA se calcula sobre disbursedAmount (valor a financiar) - línea 1287 SalesPlanConfig
    const fgaPerMonth = disbursedAmount * (clientTypeConfig.fga / 100);
    
    // Calcular cuota base usando sistema francés - línea 1292 SalesPlanConfig
    const r = interestRate;
    const n = months;
    const fixedPaymentWithoutExtras = disbursedAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    
    // Seguros - líneas 1301-1302 SalesPlanConfig
    const seguro1Monthly = fixedPaymentWithoutExtras * (seguro1 / 100);
    const seguro2Monthly = (disbursedAmount * seguro2Formula) / 1000;
    
    // Cuota total mensual - línea 1304 SalesPlanConfig
    const totalPayment = fixedPaymentWithoutExtras + tecAdmPerMonth + fgaPerMonth + seguro1Monthly + seguro2Monthly;
    
    // Redondear a MILES hacia arriba - línea 1390 SalesPlanConfig
    return Math.ceil(totalPayment / 1000) * 1000;
  };

  // Calcular cuota mensual para LARGO PLAZO - Réplica EXACTA de SalesPlanConfig.tsx líneas 1625-1758
  const calculateLongTermMonthlyPayment = (basePrice: number, months: number): number => {
    const interestRate = monthlyInterestRate / 100;
    const ciPercent = clientTypeConfig.ci / 100;
    
    // Para largo plazo sin inicial mayor - líneas 1643-1645 SalesPlanConfig
    const cuotaFS = basePrice * ciPercent;
    const nuevaBaseFS = basePrice;
    const valorAFinanciar = nuevaBaseFS;
    
    // Calcular componentes - líneas 1704-1705 SalesPlanConfig
    const tecAdmPerMonth = (valorAFinanciar * (tecAdm / 100)) / months;
    
    // FGA se calcula sobre valorAFinanciar - línea 1705 SalesPlanConfig
    const fgaPerMonth = valorAFinanciar * (clientTypeConfig.fga / 100);
    
    // Calcular cuota base usando sistema francés - línea 1710 SalesPlanConfig
    const r = interestRate;
    const n = months;
    const fixedPaymentWithoutExtras = valorAFinanciar * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    
    // Seguros - líneas 1720-1723 SalesPlanConfig
    const seguro1Value = fixedPaymentWithoutExtras * (seguro1 / 100);
    const seguro2Value = (valorAFinanciar * seguro2Formula) / 1000;
    
    // Cuota total mensual - línea 1726 SalesPlanConfig
    const totalPayment = fixedPaymentWithoutExtras + tecAdmPerMonth + fgaPerMonth + seguro1Value + seguro2Value;
    
    // Redondear a miles hacia arriba
    return Math.ceil(totalPayment / 1000) * 1000;
  };

  return (
    <Card className="bg-white">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/5 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Lista de precios</CardTitle>
              {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Selección de Lista de Precios */}
            <div className="space-y-2">
              <Label>Seleccionar Lista de Precios</Label>
              <RadioGroup value={selectedPriceList} onValueChange={setSelectedPriceList}>
                <div className="flex flex-wrap gap-4">
                  {priceLists.map((priceList) => (
                    <div key={priceList.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={priceList.id} id={priceList.id} />
                      <Label htmlFor={priceList.id} className="cursor-pointer">
                        Lista {priceList.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Filtro de Línea */}
            <div className="space-y-2">
              <Label>Línea</Label>
              <Select value={selectedLine} onValueChange={setSelectedLine}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una línea" />
                </SelectTrigger>
                <SelectContent>
                  {lines.map((line) => (
                    <SelectItem key={line} value={line}>
                      {line}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tabla de Productos */}
            {!salesConfig ? (
              <div className="text-center py-8 text-muted-foreground">Cargando configuración...</div>
            ) : loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando productos...</div>
            ) : products.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead rowSpan={2} className="min-w-[250px] align-middle">Producto</TableHead>
                      <TableHead colSpan={2} className="text-center bg-blue-50">Contado</TableHead>
                      <TableHead rowSpan={2} className="text-center align-middle">Base FINANSUEÑOS</TableHead>
                      <TableHead colSpan={2} className="text-center bg-accent/10">
                        Corto Plazo <span className="text-xs font-normal">(C.I 50%)</span>
                      </TableHead>
                      <TableHead colSpan={3} className="text-center bg-accent/20">Largo Plazo</TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead className="text-center bg-blue-50">Lista 1</TableHead>
                      <TableHead className="text-center bg-blue-50">Lista 4</TableHead>
                      <TableHead className="text-center bg-accent/10">5 Cuotas</TableHead>
                      <TableHead className="text-center bg-accent/10">6 Cuotas</TableHead>
                      <TableHead className="text-center bg-accent/20">10 Cuotas</TableHead>
                      <TableHead className="text-center bg-accent/20">12 Cuotas</TableHead>
                      <TableHead className="text-center bg-accent/20">15 Cuotas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((item) => {
                      const product = item.products;
                      const basePrice = Number(item.credit_price);
                      const list1Price = Number(item.list_1_price || 0);
                      const list4Price = Number(item.list_4_price || 0);
                      
                      // ==================== CORTO PLAZO con CI del 50% ====================
                      // Usar la función completa que incluye todos los componentes (Tec/Adm, FGA, Seguros)
                      const shortTerm5 = calculateShortTermMonthlyPayment(basePrice, 5);
                      const shortTerm6 = calculateShortTermMonthlyPayment(basePrice, 6);
                      
                      // ==================== LARGO PLAZO ====================
                      // Calcular cuotas de largo plazo usando la función con toda la lógica
                      const longTerm10 = calculateLongTermMonthlyPayment(basePrice, 10);
                      const longTerm12 = calculateLongTermMonthlyPayment(basePrice, 12);
                      const longTerm15 = calculateLongTermMonthlyPayment(basePrice, 15);

                      return (
                        <TableRow 
                          key={item.product_id}
                          className="cursor-pointer hover:bg-accent/20 transition-colors"
                          onClick={() => onProductSelect(product, selectedPriceList)}
                        >
                          <TableCell className="font-medium">
                            {product.brand} - {product.description} - {product.reference}
                          </TableCell>
                          <TableCell className="text-center bg-blue-50/50">
                            ${list1Price.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center bg-blue-50/50">
                            ${list4Price.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            ${basePrice.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center bg-accent/5">
                            ${shortTerm5.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center bg-accent/5">
                            ${shortTerm6.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center bg-accent/10">
                            ${longTerm10.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center bg-accent/10">
                            ${longTerm12.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center bg-accent/10">
                            ${longTerm15.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Seleccione una lista y línea para ver los productos
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default PriceListView;
