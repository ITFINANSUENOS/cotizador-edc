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

  // Cargar listas de precios disponibles
  useEffect(() => {
    loadPriceLists();
  }, []);

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

  // Calcular cuota mensual
  const calculateMonthlyPayment = (basePrice: number, months: number, initialPaymentPercent: number = 0) => {
    const avalRate = 0.02;
    const interestRate = 0.0187;
    
    // Calcular cuota inicial si aplica
    const initialPayment = basePrice * (initialPaymentPercent / 100);
    const amountToFinance = basePrice - initialPayment;
    
    // Calcular aval fijo
    const fixedAval = amountToFinance * avalRate;
    
    // Calcular cuota fija sin aval
    const r = interestRate;
    const n = months;
    const fixedPaymentWithoutAval = amountToFinance * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    
    // Cuota total
    const monthlyPayment = fixedPaymentWithoutAval + fixedAval;
    
    return Math.ceil(monthlyPayment / 1000) * 1000; // Redondear a miles
  };

  // Calcular descuento por Tipo Cliente B (descuento del 50% según rango)
  const calculateDiscount = (basePrice: number) => {
    // Para cliente tipo B, asumimos 50% de descuento
    return basePrice * 0.50;
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
            {loading ? (
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
                      
                      // Aplicar descuento por Tipo Cliente B (50%)
                      const discount = calculateDiscount(basePrice);
                      const adjustedBasePrice = basePrice - discount;
                      
                      // CORTO PLAZO: Calcular con C.I. 50% del precio ajustado
                      const ciPercent = 0.10; // 10% para clientes tipo B
                      const cuotaInicialTotal = adjustedBasePrice * 0.50; // Cliente paga 50% como C.I. total
                      
                      // Fórmula del nuevo modelo: CI_descuento = (CI_total - Precio * %CI) / (1 - %CI)
                      const cuotaInicialDescuentoRaw = (cuotaInicialTotal - adjustedBasePrice * ciPercent) / (1 - ciPercent);
                      
                      // Valor a financiar
                      const valorAFinanciar = adjustedBasePrice - cuotaInicialDescuentoRaw;
                      
                      // Redondear valor a financiar al 500 más cercano
                      const roundToNearestFiveHundred = (value: number) => Math.round(value / 500) * 500;
                      const valorAFinanciarRedondeado = roundToNearestFiveHundred(valorAFinanciar);
                      
                      // Calcular cuotas mensuales para corto plazo (sin intereses ni aval, solo división)
                      const shortTerm5 = Math.ceil((valorAFinanciarRedondeado / 5) / 500) * 500;
                      const shortTerm6 = Math.ceil((valorAFinanciarRedondeado / 6) / 500) * 500;
                      
                      // Calcular cuotas de largo plazo (con intereses y aval)
                      const longTerm10 = calculateMonthlyPayment(adjustedBasePrice, 10, 0);
                      const longTerm12 = calculateMonthlyPayment(adjustedBasePrice, 12, 0);
                      const longTerm15 = calculateMonthlyPayment(adjustedBasePrice, 15, 0);

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
