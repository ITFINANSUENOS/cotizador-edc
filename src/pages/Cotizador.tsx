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
import { LogOut, Calculator, CreditCard, FileText, HandshakeIcon } from "lucide-react";

// Mock data - En producción esto vendrá de Google Sheets
const mockBrands = ["Samsung", "LG", "Whirlpool", "Haceb"];
const mockLines: Record<string, string[]> = {
  "Samsung": ["Refrigeración", "Lavado", "Cocción", "Audio y Video"],
  "LG": ["Refrigeración", "Lavado", "Cocción", "Audio y Video"],
  "Whirlpool": ["Refrigeración", "Lavado", "Cocción"],
  "Haceb": ["Cocción", "Calefacción"]
};
const mockProducts: Record<string, Record<string, any[]>> = {
  "Samsung": {
    "Refrigeración": [
      { ref: "RF28R7201SR", price: 3500000, creditPrice: 3800000, convenioPrice: 3400000 },
      { ref: "RT38K5930SL", price: 2200000, creditPrice: 2400000, convenioPrice: 2100000 }
    ]
  },
  "LG": {
    "Refrigeración": [
      { ref: "GS65SPP1", price: 4200000, creditPrice: 4500000, convenioPrice: 4000000 }
    ]
  }
};

const Cotizador = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Selectores de producto
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedLine, setSelectedLine] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  // Tipo de venta
  const [saleType, setSaleType] = useState<"contado" | "credito" | "convenio">("contado");
  const [installments, setInstallments] = useState(1);
  const [initialPayment, setInitialPayment] = useState(0);
  
  // Resultado
  const [quote, setQuote] = useState<any>(null);
  
  // Formulario cliente
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
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

  const calculateQuote = () => {
    if (!selectedProduct) {
      toast.error("Por favor selecciona un producto");
      return;
    }

    let basePrice = 0;
    let totalPrice = 0;
    let monthlyPayment = 0;
    let remainingBalance = 0;

    switch (saleType) {
      case "contado":
        basePrice = selectedProduct.price;
        // Descuento según cuotas (1-6 cuotas)
        const discount = installments === 1 ? 0.03 : installments <= 3 ? 0.02 : 0.01;
        totalPrice = basePrice * (1 - discount);
        remainingBalance = totalPrice - initialPayment;
        monthlyPayment = remainingBalance / installments;
        break;
      
      case "credito":
        basePrice = selectedProduct.creditPrice;
        totalPrice = basePrice;
        remainingBalance = totalPrice - initialPayment;
        monthlyPayment = remainingBalance / installments;
        break;
      
      case "convenio":
        basePrice = selectedProduct.convenioPrice;
        totalPrice = basePrice;
        remainingBalance = totalPrice - initialPayment;
        monthlyPayment = remainingBalance / installments;
        break;
    }

    setQuote({
      basePrice,
      totalPrice,
      initialPayment,
      remainingBalance,
      installments,
      monthlyPayment,
      saleType
    });

    setShowClientForm(true);
  };

  const handleSubmitQuote = async () => {
    if (!clientName || !clientId || !clientPhone) {
      toast.error("Por favor completa todos los campos del cliente");
      return;
    }

    // Aquí se guardaría en la base de datos
    toast.success("Cotización guardada exitosamente");
    
    // Reset form
    setShowClientForm(false);
    setClientName("");
    setClientId("");
    setClientPhone("");
    setQuote(null);
  };

  const availableLines = selectedBrand ? mockLines[selectedBrand] || [] : [];
  const availableProducts = selectedBrand && selectedLine 
    ? mockProducts[selectedBrand]?.[selectedLine] || []
    : [];

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
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </CardHeader>
        </Card>

        {/* Selector de Productos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="w-5 h-5 mr-2 text-primary" />
              Seleccionar Producto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Select value={selectedBrand} onValueChange={(value) => {
                  setSelectedBrand(value);
                  setSelectedLine("");
                  setSelectedProduct(null);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona marca" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockBrands.map((brand) => (
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
                    setSelectedProduct(null);
                  }}
                  disabled={!selectedBrand}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona línea" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLines.map((line) => (
                      <SelectItem key={line} value={line}>{line}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Referencia</Label>
                <Select 
                  value={selectedProduct?.ref || ""} 
                  onValueChange={(value) => {
                    const product = availableProducts.find(p => p.ref === value);
                    setSelectedProduct(product);
                  }}
                  disabled={!selectedLine}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((product) => (
                      <SelectItem key={product.ref} value={product.ref}>
                        {product.ref}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tipo de Venta */}
        {selectedProduct && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-primary" />
                Tipo de Venta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={saleType} onValueChange={(v) => setSaleType(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="contado">Contado</TabsTrigger>
                  <TabsTrigger value="credito">Crédito</TabsTrigger>
                  <TabsTrigger value="convenio">Convenio</TabsTrigger>
                </TabsList>

                <TabsContent value="contado" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Número de Cuotas (1-6)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={6}
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cuota Inicial</Label>
                    <Input
                      type="number"
                      min={0}
                      value={initialPayment}
                      onChange={(e) => setInitialPayment(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="credito" className="space-y-4 mt-4">
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
                  <div className="space-y-2">
                    <Label>Cuota Inicial</Label>
                    <Input
                      type="number"
                      min={0}
                      value={initialPayment}
                      onChange={(e) => setInitialPayment(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="convenio" className="space-y-4 mt-4">
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
                      value={initialPayment}
                      onChange={(e) => setInitialPayment(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <Button onClick={calculateQuote} className="w-full mt-6">
                Calcular Cotización
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Resultado */}
        {quote && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center text-primary">
                <FileText className="w-5 h-5 mr-2" />
                Resultado de Cotización
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">Precio Base:</span>
                <span className="font-bold">${quote.basePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">Precio Total:</span>
                <span className="font-bold text-primary">${quote.totalPrice.toLocaleString()}</span>
              </div>
              {quote.initialPayment > 0 && (
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">Cuota Inicial:</span>
                  <span className="font-bold">${quote.initialPayment.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">Saldo Restante:</span>
                <span className="font-bold">${quote.remainingBalance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">Número de Cuotas:</span>
                <span className="font-bold">{quote.installments}</span>
              </div>
              <div className="flex justify-between py-3 bg-accent/10 px-4 rounded-lg">
                <span className="font-bold text-lg">Cuota Mensual:</span>
                <span className="font-bold text-xl text-accent">${quote.monthlyPayment.toLocaleString()}</span>
              </div>
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
                <Label>Cédula</Label>
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
              <Button onClick={handleSubmitQuote} className="w-full">
                Guardar Cotización
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Cotizador;
