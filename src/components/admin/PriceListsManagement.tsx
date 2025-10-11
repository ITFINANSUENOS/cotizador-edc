import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Calendar, Trash2 } from "lucide-react";
import { format, isAfter, isBefore, startOfMonth, endOfMonth, subDays } from "date-fns";
import { es } from "date-fns/locale";
import PlantillaDownload from "./PlantillaDownload";

interface PriceList {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

const PriceListsManagement = () => {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form fields
  const [listName, setListName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [excelFile, setExcelFile] = useState<File | null>(null);

  useEffect(() => {
    loadPriceLists();
  }, []);

  const loadPriceLists = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("price_lists")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) {
      toast.error("Error al cargar listas de precios");
      console.error(error);
    } else {
      setPriceLists(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setListName("");
    setStartDate("");
    setEndDate("");
    setExcelFile(null);
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!validTypes.includes(file.type)) {
        toast.error("Por favor selecciona un archivo Excel válido (.xlsx o .xls)");
        return;
      }
      
      setExcelFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!listName || !startDate || !excelFile) {
      toast.error("Por favor completa el nombre, fecha de inicio y selecciona un archivo");
      return;
    }

    // Validate end date is after start date if provided
    if (endDate && new Date(endDate) < new Date(startDate)) {
      toast.error("La fecha de finalización debe ser posterior a la fecha de inicio");
      return;
    }

    setUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(excelFile);
      reader.onload = async () => {
        const base64 = reader.result?.toString().split(',')[1];
        
        // Call edge function to process Excel
        const { data, error } = await supabase.functions.invoke('process-price-list', {
          body: {
            file: base64,
            fileName: excelFile.name,
            listName: listName,
            startDate: startDate,
            endDate: endDate || null,
          }
        });

        if (error) {
          throw error;
        }

        toast.success("Lista de precios cargada exitosamente");
        setDialogOpen(false);
        resetForm();
        loadPriceLists();
      };
      
      reader.onerror = () => {
        throw new Error("Error al leer el archivo");
      };
    } catch (error: any) {
      toast.error(error.message || "Error al cargar la lista de precios");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta lista de precios?")) return;

    const { error } = await supabase
      .from("price_lists")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Error al eliminar lista");
      console.error(error);
    } else {
      toast.success("Lista eliminada exitosamente");
      loadPriceLists();
    }
  };

  return (
    <>
      <PlantillaDownload />
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestión de Listas de Precios</CardTitle>
              <CardDescription>
                Carga y administra las listas de precios en formato Excel
              </CardDescription>
            </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Cargar Lista de Precios
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Lista de Precios</DialogTitle>
                <DialogDescription>
                  Carga un archivo Excel con los precios. Puedes hacerlo en cualquier momento del mes.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="listName">Nombre de la Lista *</Label>
                  <Input
                    id="listName"
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    placeholder="Ej: GENERAL, PROMOCIONAL, MATRICULAS"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="startDate">Fecha de Inicio de Vigencia *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="endDate">Fecha de Finalización de Vigencia</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Opcional. Si no se especifica, la lista no tendrá fecha de expiración.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="excelFile">Archivo Excel *</Label>
                  <Input
                    id="excelFile"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                  />
                  {excelFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileSpreadsheet className="w-4 h-4" />
                      {excelFile.name}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={uploading}>
                  {uploading ? "Procesando..." : "Cargar Lista"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Cargando listas...</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Fecha de Inicio</TableHead>
                  <TableHead>Fecha de Finalización</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de Carga</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceLists.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No hay listas de precios cargadas
                    </TableCell>
                  </TableRow>
                ) : (
                  priceLists.map((list) => (
                    <TableRow key={list.id}>
                      <TableCell className="font-medium">{list.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {format(new Date(list.start_date), "d 'de' MMMM, yyyy", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {list.end_date ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {format(new Date(list.end_date), "d 'de' MMMM, yyyy", { locale: es })}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sin fecha</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          list.is_active 
                            ? "bg-green-50 text-green-700 ring-1 ring-green-600/20" 
                            : "bg-gray-50 text-gray-700 ring-1 ring-gray-600/20"
                        }`}>
                          {list.is_active ? "Activa" : "Inactiva"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(list.created_at), "d/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(list.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
};

export default PriceListsManagement;
