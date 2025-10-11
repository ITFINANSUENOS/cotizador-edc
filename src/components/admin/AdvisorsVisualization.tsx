import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { UserPlus, Pencil, Trash2, Upload, Download, Search, Filter, Users } from "lucide-react";

interface Advisor {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  advisor_code: string | null;
  sales_manager: string | null;
  zone_leader: string | null;
  regional: string | null;
  zonal_coordinator: string | null;
  is_active: boolean;
}

const AdvisorsVisualization = () => {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [filteredAdvisors, setFilteredAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);
  const [importing, setImporting] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRegional, setFilterRegional] = useState<string>("all");
  const [filterCoordinator, setFilterCoordinator] = useState<string>("all");
  const [filterZoneLeader, setFilterZoneLeader] = useState<string>("all");
  const [filterSalesManager, setFilterSalesManager] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [advisorCode, setAdvisorCode] = useState("");
  const [salesManager, setSalesManager] = useState("");
  const [zoneLeader, setZoneLeader] = useState("");
  const [regional, setRegional] = useState("");
  const [zonalCoordinator, setZonalCoordinator] = useState("");
  const [isActive, setIsActive] = useState(true);

  // CSV file
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Unique values for filters
  const [regionals, setRegionals] = useState<string[]>([]);
  const [coordinators, setCoordinators] = useState<string[]>([]);
  const [zoneLeaders, setZoneLeaders] = useState<string[]>([]);
  const [salesManagers, setSalesManagers] = useState<string[]>([]);

  useEffect(() => {
    loadAdvisors();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [advisors, searchTerm, filterRegional, filterCoordinator, filterZoneLeader, filterSalesManager, filterStatus]);

  const loadAdvisors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("advisors")
      .select("*")
      .order("full_name", { ascending: true });

    if (error) {
      toast.error("Error al cargar asesores");
      console.error(error);
    } else {
      setAdvisors(data || []);
      
      // Extract unique values for filters
      const uniqueRegionals = [...new Set(data?.map(a => a.regional).filter(Boolean) as string[])];
      const uniqueCoordinators = [...new Set(data?.map(a => a.zonal_coordinator).filter(Boolean) as string[])];
      const uniqueZoneLeaders = [...new Set(data?.map(a => a.zone_leader).filter(Boolean) as string[])];
      const uniqueSalesManagers = [...new Set(data?.map(a => a.sales_manager).filter(Boolean) as string[])];
      
      setRegionals(uniqueRegionals.sort());
      setCoordinators(uniqueCoordinators.sort());
      setZoneLeaders(uniqueZoneLeaders.sort());
      setSalesManagers(uniqueSalesManagers.sort());
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...advisors];

    // Search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.full_name.toLowerCase().includes(term) ||
        a.email.toLowerCase().includes(term) ||
        a.phone?.toLowerCase().includes(term) ||
        a.advisor_code?.toLowerCase().includes(term)
      );
    }

    // Regional filter
    if (filterRegional !== "all") {
      filtered = filtered.filter(a => a.regional === filterRegional);
    }

    // Coordinator filter
    if (filterCoordinator !== "all") {
      filtered = filtered.filter(a => a.zonal_coordinator === filterCoordinator);
    }

    // Zone leader filter
    if (filterZoneLeader !== "all") {
      filtered = filtered.filter(a => a.zone_leader === filterZoneLeader);
    }

    // Sales manager filter
    if (filterSalesManager !== "all") {
      filtered = filtered.filter(a => a.sales_manager === filterSalesManager);
    }

    // Status filter
    if (filterStatus === "active") {
      filtered = filtered.filter(a => a.is_active);
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter(a => !a.is_active);
    }

    setFilteredAdvisors(filtered);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilterRegional("all");
    setFilterCoordinator("all");
    setFilterZoneLeader("all");
    setFilterSalesManager("all");
    setFilterStatus("all");
  };

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setAdvisorCode("");
    setSalesManager("");
    setZoneLeader("");
    setRegional("");
    setZonalCoordinator("");
    setIsActive(true);
    setEditingAdvisor(null);
  };

  const handleEdit = (advisor: Advisor) => {
    setEditingAdvisor(advisor);
    setFullName(advisor.full_name);
    setEmail(advisor.email);
    setPhone(advisor.phone || "");
    setAdvisorCode(advisor.advisor_code || "");
    setSalesManager(advisor.sales_manager || "");
    setZoneLeader(advisor.zone_leader || "");
    setRegional(advisor.regional || "");
    setZonalCoordinator(advisor.zonal_coordinator || "");
    setIsActive(advisor.is_active);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!fullName || !email) {
      toast.error("Nombre y email son requeridos");
      return;
    }

    if (editingAdvisor) {
      const { error } = await supabase
        .from("advisors")
        .update({
          full_name: fullName,
          email: email,
          phone: phone || null,
          advisor_code: advisorCode || null,
          sales_manager: salesManager || null,
          zone_leader: zoneLeader || null,
          regional: regional || null,
          zonal_coordinator: zonalCoordinator || null,
          is_active: isActive,
        })
        .eq("id", editingAdvisor.id);

      if (error) {
        toast.error("Error al actualizar asesor");
        console.error(error);
      } else {
        toast.success("Asesor actualizado exitosamente");
        setDialogOpen(false);
        resetForm();
        loadAdvisors();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este asesor?")) return;

    const { error } = await supabase
      .from("advisors")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Error al eliminar asesor");
      console.error(error);
    } else {
      toast.success("Asesor eliminado exitosamente");
      loadAdvisors();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error("Por favor selecciona un archivo CSV");
        return;
      }
      setCsvFile(file);
    }
  };

  const handleImportCSV = async () => {
    if (!csvFile) {
      toast.error("Selecciona un archivo CSV");
      return;
    }

    setImporting(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const csvContent = e.target?.result as string;
        
        const { data, error } = await supabase.functions.invoke('import-advisors-csv', {
          body: { csvContent }
        });

        if (error) throw error;

        toast.success(data.message);
        setImportDialogOpen(false);
        setCsvFile(null);
        loadAdvisors();
      };
      
      reader.onerror = () => {
        throw new Error("Error al leer el archivo");
      };
      
      reader.readAsText(csvFile);
    } catch (error: any) {
      toast.error(error.message || "Error al importar asesores");
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Nombre", "Email", "Código", "Teléfono", "Regional", "Jefe Ventas", "Líder Zona", "Coordinador", "Estado"];
    const rows = filteredAdvisors.map(a => [
      a.full_name,
      a.email,
      a.advisor_code || "",
      a.phone || "",
      a.regional || "",
      a.sales_manager || "",
      a.zone_leader || "",
      a.zonal_coordinator || "",
      a.is_active ? "Activo" : "Inactivo"
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asesores_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Visualización de Asesores
            </CardTitle>
            <CardDescription>
              {filteredAdvisors.length} de {advisors.length} asesores mostrados
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="default" 
              onClick={async () => {
                setImporting(true);
                try {
                  const response = await fetch('/data/asesores_comercial.csv');
                  const csvContent = await response.text();
                  
                  const { data, error } = await supabase.functions.invoke('import-advisors-csv', {
                    body: { csvContent }
                  });

                  if (error) throw error;

                  toast.success(data.message);
                  loadAdvisors();
                } catch (error: any) {
                  toast.error(error.message || "Error al importar asesores comerciales");
                  console.error(error);
                } finally {
                  setImporting(false);
                }
              }}
              disabled={importing}
            >
              <Users className="w-4 h-4 mr-2" />
              {importing ? "Importando..." : "Cargar Equipo Comercial"}
            </Button>
            
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Importar CSV Personalizado
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Importar Asesores desde CSV</DialogTitle>
                  <DialogDescription>
                    Sube un archivo CSV con los datos de los asesores
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="csvFile">Archivo CSV</Label>
                    <Input
                      id="csvFile"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                    />
                    {csvFile && (
                      <p className="text-sm text-muted-foreground">
                        Archivo: {csvFile.name}
                      </p>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setImportDialogOpen(false)} disabled={importing}>
                    Cancelar
                  </Button>
                  <Button onClick={handleImportCSV} disabled={importing}>
                    {importing ? "Importando..." : "Importar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="search">
                  <Search className="w-4 h-4 inline mr-1" />
                  Buscar
                </Label>
                <Input
                  id="search"
                  placeholder="Nombre, email, código o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Regional</Label>
                <Select value={filterRegional} onValueChange={setFilterRegional}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {regionals.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Coordinador Zonal</Label>
                <Select value={filterCoordinator} onValueChange={setFilterCoordinator}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {coordinators.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Líder de Zona</Label>
                <Select value={filterZoneLeader} onValueChange={setFilterZoneLeader}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {zoneLeaders.map(z => (
                      <SelectItem key={z} value={z}>{z}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Jefe de Ventas</Label>
                <Select value={filterSalesManager} onValueChange={setFilterSalesManager}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {salesManagers.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="inactive">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={resetFilters} className="w-full">
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        {loading ? (
          <p>Cargando asesores...</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Regional</TableHead>
                  <TableHead>Jefe Ventas</TableHead>
                  <TableHead>Líder Zona</TableHead>
                  <TableHead>Coordinador</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdvisors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      No hay asesores que coincidan con los filtros
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAdvisors.map((advisor) => (
                    <TableRow key={advisor.id}>
                      <TableCell className="font-medium">{advisor.full_name}</TableCell>
                      <TableCell className="text-sm">{advisor.email}</TableCell>
                      <TableCell className="text-sm">{advisor.advisor_code || "-"}</TableCell>
                      <TableCell>{advisor.phone || "-"}</TableCell>
                      <TableCell className="text-sm">{advisor.regional || "-"}</TableCell>
                      <TableCell className="text-sm">{advisor.sales_manager || "-"}</TableCell>
                      <TableCell className="text-sm">{advisor.zone_leader || "-"}</TableCell>
                      <TableCell className="text-sm">{advisor.zonal_coordinator || "-"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          advisor.is_active 
                            ? "bg-green-50 text-green-700 ring-1 ring-green-600/20" 
                            : "bg-gray-50 text-gray-700 ring-1 ring-gray-600/20"
                        }`}>
                          {advisor.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(advisor)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(advisor.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Asesor</DialogTitle>
              <DialogDescription>
                Modifica los datos del asesor
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Nombre Completo *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="advisorCode">Código de Asesor</Label>
                  <Input
                    id="advisorCode"
                    value={advisorCode}
                    onChange={(e) => setAdvisorCode(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="regional">Regional</Label>
                  <Input
                    id="regional"
                    value={regional}
                    onChange={(e) => setRegional(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="salesManager">Jefe de Ventas</Label>
                  <Input
                    id="salesManager"
                    value={salesManager}
                    onChange={(e) => setSalesManager(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="zoneLeader">Líder de Zona</Label>
                  <Input
                    id="zoneLeader"
                    value={zoneLeader}
                    onChange={(e) => setZoneLeader(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="zonalCoordinator">Coordinador Zonal</Label>
                  <Input
                    id="zonalCoordinator"
                    value={zonalCoordinator}
                    onChange={(e) => setZonalCoordinator(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="isActive">Asesor Activo</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                Actualizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AdvisorsVisualization;
