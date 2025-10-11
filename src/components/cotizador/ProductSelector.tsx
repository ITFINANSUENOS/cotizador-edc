import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  brand: string;
  line: string;
  reference: string;
  description: string | null;
}

interface PriceListProduct {
  id: string;
  price_list_id: string;
  product_id: string;
  list_1_price: number;
  list_2_price: number | null;
  list_3_price: number | null;
  list_4_price: number | null;
  credicontado_price: number | null;
  credit_price: number | null;
  convenio_price: number | null;
  price_list: {
    id: string;
    name: string;
    start_date: string;
  };
}

interface ProductSelectorProps {
  onProductSelect: (product: Product | null, prices: PriceListProduct[] | null) => void;
}

const ProductSelector = ({ onProductSelect }: ProductSelectorProps) => {
  const [brands, setBrands] = useState<string[]>([]);
  const [lines, setLines] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedLine, setSelectedLine] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      loadLines(selectedBrand);
    } else {
      setLines([]);
      setSelectedLine("");
    }
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedBrand && selectedLine) {
      loadProducts(selectedBrand, selectedLine);
    } else {
      setProducts([]);
      setSelectedProductId("");
    }
  }, [selectedBrand, selectedLine]);

  useEffect(() => {
    if (selectedProductId) {
      loadProductPrices(selectedProductId);
    } else {
      onProductSelect(null, null);
    }
  }, [selectedProductId]);

  const loadBrands = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("brand")
      .order("brand");

    if (error) {
      console.error("Error loading brands:", error);
    } else {
      const uniqueBrands = [...new Set(data?.map(p => p.brand) || [])];
      setBrands(uniqueBrands);
    }
    setLoading(false);
  };

  const loadLines = async (brand: string) => {
    const { data, error } = await supabase
      .from("products")
      .select("line")
      .eq("brand", brand)
      .order("line");

    if (error) {
      console.error("Error loading lines:", error);
    } else {
      const uniqueLines = [...new Set(data?.map(p => p.line) || [])];
      setLines(uniqueLines);
    }
  };

  const loadProducts = async (brand: string, line: string) => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("brand", brand)
      .eq("line", line)
      .order("reference");

    if (error) {
      console.error("Error loading products:", error);
    } else {
      setProducts(data || []);
    }
  };

  const loadProductPrices = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    console.log("Loading prices for product:", productId);

    // Load all active price lists that contain this product
    const { data, error } = await supabase
      .from("price_list_products")
      .select(`
        *,
        price_list:price_lists!inner (
          id,
          name,
          start_date,
          is_active
        )
      `)
      .eq("product_id", productId)
      .eq("price_list.is_active", true)
      .order("price_list.start_date", { ascending: false });

    console.log("Price list query result:", { data, error });

    if (error) {
      console.error("Error loading prices:", error);
      toast.error("Error al cargar los precios del producto");
      onProductSelect(product, null);
    } else if (!data || data.length === 0) {
      console.warn("No active prices found for product");
      toast.error("No hay precios activos para este producto");
      onProductSelect(product, null);
    } else {
      console.log("Prices loaded successfully:", data);
      onProductSelect(product, data as any);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calculator className="w-5 h-5 mr-2 text-primary" />
          Seleccionar Producto
        </CardTitle>
        <CardDescription>
          Elige el producto que deseas cotizar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Marca</Label>
            <Select 
              value={selectedBrand} 
              onValueChange={(value) => {
                setSelectedBrand(value);
                setSelectedLine("");
                setSelectedProductId("");
              }}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Cargando..." : "Selecciona marca"} />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Línea</Label>
            <Select 
              value={selectedLine} 
              onValueChange={(value) => {
                setSelectedLine(value);
                setSelectedProductId("");
              }}
              disabled={!selectedBrand}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona línea" />
              </SelectTrigger>
              <SelectContent>
                {lines.map((line) => (
                  <SelectItem key={line} value={line}>{line}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Referencia</Label>
            <Select 
              value={selectedProductId} 
              onValueChange={setSelectedProductId}
              disabled={!selectedLine}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona producto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.reference}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Mostrar descripción del producto seleccionado */}
        {selectedProductId && products.find(p => p.id === selectedProductId)?.description && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <Label className="text-sm font-medium">Descripción:</Label>
            <p className="text-sm mt-1">{products.find(p => p.id === selectedProductId)?.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductSelector;
