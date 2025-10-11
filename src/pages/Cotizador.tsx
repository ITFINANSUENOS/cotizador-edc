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
import { LogOut, CreditCard, FileText, HandshakeIcon, Settings } from "lucide-react";
import ProductSelector from "@/components/cotizador/ProductSelector";

const Cotizador = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Producto seleccionado y precios
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productPrices, setProductPrices] = useState<any>(null);
  
  // Tipo de venta
  const [saleType, setSaleType] = useState<"contado" | "credito" | "convenio">("contado");
  const [installments, setInstallments] = useState(1);
  const [initialPayment, setInitialPayment] = useState(0);
  
  // Resetear cuotas cuando cambia el tipo de venta
  const handleSaleTypeChange = (newType: "contado" | "credito" | "convenio") => {
    setSaleType(newType);
    if (newType === "contado") {
      setInstallments(1);
    } else if (newType === "credito") {
      setInstallments(9);
    } else {
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
    let selectedListPrice = 0;

    switch (saleType) {
      case "contado":
        // Para contado, usar las 4 listas según el número de cuotas
        // 1 cuota = LISTA 1, 2-3 cuotas = LISTA 2, 4-5 cuotas = LISTA 3, 6 cuotas = LISTA 4
        if (installments === 1) {
          selectedListPrice = Number(priceData.list_1_price);
        } else if (installments <= 3) {
          selectedListPrice = Number(priceData.list_2_price || priceData.list_1_price);
        } else if (installments <= 5) {
          selectedListPrice = Number(priceData.list_3_price || priceData.list_1_price);
        } else {
          selectedListPrice = Number(priceData.list_4_price || priceData.list_1_price);
        }
        
        basePrice = selectedListPrice;
        totalPrice = basePrice;
        remainingBalance = totalPrice - initialPayment;
        monthlyPayment = remainingBalance / installments;
        break;
      
      case "credito":
        // Para crédito usar BASE FINANSUEÑOS (credit_price) con amortización
        basePrice = Number(priceData.credit_price || priceData.list_1_price);
        totalPrice = basePrice;
        remainingBalance = totalPrice - initialPayment;
        // Calcular amortización según el plazo
        monthlyPayment = remainingBalance / installments;
        break;
      
      case "convenio":
        // Para convenios usar el precio de CONVENIOS
        basePrice = Number(priceData.convenio_price || priceData.list_1_price);
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
      saleType,
      priceListId: priceData.price_list_id,
      productId: selectedProduct.id
    });

    setShowClientForm(true);
  };

  const handleSubmitQuote = async () => {
    if (!clientName || !clientId || !clientPhone) {
      toast.error("Por favor completa todos los campos del cliente");
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
          client_id_number: clientId,
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
        {selectedProduct && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-primary" />
                Tipo de Venta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={saleType} onValueChange={(v) => handleSaleTypeChange(v as any)}>
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
              <Button onClick={handleSubmitQuote} className="w-full" disabled={loading}>
                {loading ? "Guardando..." : "Guardar Cotización"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Cotizador;
