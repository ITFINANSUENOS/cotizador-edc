import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Quote {
  id: string;
  created_at: string;
  client_name: string;
  client_phone: string;
  sale_type: string;
  product_id: string;
  products?: {
    brand: string;
    line: string;
    description: string;
  };
}

interface QuotesHistoryProps {
  onClose: () => void;
}

const QuotesHistory = ({ onClose }: QuotesHistoryProps) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuario no autenticado");
        return;
      }

      // Obtener el advisor_id del usuario actual
      const { data: advisorData, error: advisorError } = await supabase
        .from("advisors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (advisorError) {
        toast.error("Error al obtener información del asesor");
        return;
      }

      // Obtener las cotizaciones del asesor con información del producto
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          id,
          created_at,
          client_name,
          client_phone,
          sale_type,
          product_id,
          products (
            brand,
            line,
            description
          )
        `)
        .eq("advisor_id", advisorData.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Error al cargar cotizaciones");
        console.error(error);
      } else {
        setQuotes(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar cotizaciones");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatSaleType = (type: string) => {
    const types: { [key: string]: string } = {
      contado: "Contado",
      credicontado: "CrediContado",
      credito: "Crédito",
      convenio: "Convenio"
    };
    return types[type] || type;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
          <div>
            <CardTitle className="flex items-center text-lg">
              <FileText className="w-5 h-5 mr-2" />
              Historial de Cotizaciones
            </CardTitle>
            <CardDescription className="text-sm">
              Todas tus cotizaciones guardadas
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-[calc(90vh-140px)]">
            {loading ? (
              <div className="text-center py-8">Cargando cotizaciones...</div>
            ) : quotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay cotizaciones guardadas
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {quotes.map((quote) => (
                  <Card key={quote.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Fecha</p>
                          <p className="font-medium text-sm">{formatDate(quote.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Cliente</p>
                          <p className="font-medium text-sm">{quote.client_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Celular</p>
                          <p className="font-medium text-sm">{quote.client_phone}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Tipo de Venta</p>
                          <p className="font-medium text-sm">{formatSaleType(quote.sale_type)}</p>
                        </div>
                        {quote.products && (
                          <>
                            <div>
                              <p className="text-xs text-muted-foreground">Marca</p>
                              <p className="font-medium text-sm">{quote.products.brand}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Línea</p>
                              <p className="font-medium text-sm">{quote.products.line}</p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-xs text-muted-foreground">Descripción</p>
                              <p className="font-medium text-sm">{quote.products.description || "N/A"}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuotesHistory;
