import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search } from "lucide-react";

interface Quote {
  id: string;
  created_at: string;
  client_name: string;
  client_id_number: string;
  client_phone: string;
  sale_type: string;
  product: {
    reference: string;
    description: string;
    brand: string;
    line: string;
  };
  advisor: {
    full_name: string;
    advisor_code: string;
    regional: string;
    sales_manager: string;
  };
}

const QuotesManagement = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [regionalFilter, setRegionalFilter] = useState("");
  const [advisorCodeFilter, setAdvisorCodeFilter] = useState("");
  const [salesManagerFilter, setSalesManagerFilter] = useState("");
  
  const [regionals, setRegionals] = useState<string[]>([]);
  const [advisorCodes, setAdvisorCodes] = useState<Array<{ code: string; name: string }>>([]);
  const [salesManagers, setSalesManagers] = useState<string[]>([]);

  useEffect(() => {
    loadQuotes();
    loadFilters();
  }, []);

  const loadFilters = async () => {
    const { data: advisorsData } = await supabase
      .from("advisors")
      .select("regional, advisor_code, full_name, sales_manager")
      .eq("is_active", true);

    if (advisorsData) {
      const uniqueRegionals = [...new Set(advisorsData.map(a => a.regional).filter(Boolean))] as string[];
      const uniqueCodes = advisorsData
        .filter(a => a.advisor_code)
        .map(a => ({ code: a.advisor_code, name: a.full_name }));
      const uniqueManagers = [...new Set(advisorsData.map(a => a.sales_manager).filter(Boolean))] as string[];
      
      setRegionals(uniqueRegionals.sort());
      setAdvisorCodes(uniqueCodes);
      setSalesManagers(uniqueManagers.sort());
    }
  };

  const loadQuotes = async () => {
    setLoading(true);
    
    let query = supabase
      .from("quotes")
      .select(`
        id,
        created_at,
        client_name,
        client_id_number,
        client_phone,
        sale_type,
        product:product_id (
          reference,
          description,
          brand,
          line
        ),
        advisor:advisor_id (
          full_name,
          advisor_code,
          regional,
          sales_manager
        )
      `)
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      toast.error("Error al cargar cotizaciones");
      console.error(error);
    } else {
      setQuotes(data as any);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadQuotes();
  }, [regionalFilter, advisorCodeFilter, salesManagerFilter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatSaleType = (type: string) => {
    const types: Record<string, string> = {
      contado: "Contado",
      credicontado: "CrediContado",
      credito: "Crédito",
      convenio: "Convenio"
    };
    return types[type] || type;
  };

  const filteredQuotes = quotes.filter(quote => {
    if (regionalFilter && quote.advisor?.regional !== regionalFilter) return false;
    if (advisorCodeFilter && quote.advisor?.advisor_code !== advisorCodeFilter) return false;
    if (salesManagerFilter && quote.advisor?.sales_manager !== salesManagerFilter) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Cotizaciones</CardTitle>
        <CardDescription>
          Visualiza y filtra todas las cotizaciones realizadas por los asesores
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Regional</Label>
            <Select value={regionalFilter} onValueChange={setRegionalFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las regionales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {regionals.map(regional => (
                  <SelectItem key={regional} value={regional}>
                    {regional}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Código Asesor</Label>
            <Select value={advisorCodeFilter} onValueChange={setAdvisorCodeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los asesores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {advisorCodes.map(advisor => (
                  <SelectItem key={advisor.code} value={advisor.code}>
                    {advisor.code} - {advisor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Jefe de Ventas</Label>
            <Select value={salesManagerFilter} onValueChange={setSalesManagerFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los jefes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {salesManagers.map(manager => (
                  <SelectItem key={manager} value={manager}>
                    {manager}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Cargando cotizaciones...</p>
        ) : filteredQuotes.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No se encontraron cotizaciones</p>
        ) : (
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Celular</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Tipo de Venta</TableHead>
                  <TableHead>Asesor</TableHead>
                  <TableHead>Regional</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell>{formatDate(quote.created_at)}</TableCell>
                    <TableCell>{quote.client_name}</TableCell>
                    <TableCell>{quote.client_id_number || "-"}</TableCell>
                    <TableCell>{quote.client_phone}</TableCell>
                    <TableCell>
                      {quote.product?.reference} - {quote.product?.description}
                    </TableCell>
                    <TableCell>{formatSaleType(quote.sale_type)}</TableCell>
                    <TableCell>
                      {quote.advisor?.advisor_code} - {quote.advisor?.full_name}
                    </TableCell>
                    <TableCell>{quote.advisor?.regional}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuotesManagement;
