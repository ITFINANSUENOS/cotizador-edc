import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { UserPlus, Pencil, Trash2 } from "lucide-react";

interface Advisor {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  sales_manager: string | null;
  zone_leader: string | null;
  zonal_coordinator: string | null;
  is_active: boolean;
}

const AdvisorsManagement = () => {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);
  
  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [salesManager, setSalesManager] = useState("");
  const [zoneLeader, setZoneLeader] = useState("");
  const [zonalCoordinator, setZonalCoordinator] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadAdvisors();
  }, []);

  const loadAdvisors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("advisors")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error al cargar asesores");
      console.error(error);
    } else {
      setAdvisors(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setSalesManager("");
    setZoneLeader("");
    setZonalCoordinator("");
    setIsActive(true);
    setEditingAdvisor(null);
  };

  const handleEdit = (advisor: Advisor) => {
    setEditingAdvisor(advisor);
    setFullName(advisor.full_name);
    setEmail(advisor.email);
    setPhone(advisor.phone || "");
    setSalesManager(advisor.sales_manager || "");
    setZoneLeader(advisor.zone_leader || "");
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
      // Update existing advisor
      const { error } = await supabase
        .from("advisors")
        .update({
          full_name: fullName,
          email: email,
          phone: phone || null,
          sales_manager: salesManager || null,
          zone_leader: zoneLeader || null,
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
    } else {
      toast.info("Para crear un nuevo asesor, primero debe registrarse en la app con email y contraseña. Luego podrás editar sus datos aquí.");
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gestión de Asesores</CardTitle>
            <CardDescription>
              Administra los asesores y su jerarquía organizacional
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Nuevo Asesor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingAdvisor ? "Editar Asesor" : "Nuevo Asesor"}
                </DialogTitle>
                <DialogDescription>
                  {editingAdvisor 
                    ? "Modifica los datos del asesor" 
                    : "Los asesores deben registrarse primero en la app. Aquí puedes editar sus datos."}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Nombre Completo *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ej: juan@ejemplo.com"
                    disabled={!!editingAdvisor}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej: 3001234567"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="salesManager">Jefe de Ventas</Label>
                    <Input
                      id="salesManager"
                      value={salesManager}
                      onChange={(e) => setSalesManager(e.target.value)}
                      placeholder="Nombre del jefe"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="zoneLeader">Líder de Zona</Label>
                    <Input
                      id="zoneLeader"
                      value={zoneLeader}
                      onChange={(e) => setZoneLeader(e.target.value)}
                      placeholder="Nombre del líder"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="zonalCoordinator">Coordinador Zonal</Label>
                    <Input
                      id="zonalCoordinator"
                      value={zonalCoordinator}
                      onChange={(e) => setZonalCoordinator(e.target.value)}
                      placeholder="Nombre del coordinador"
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
                  {editingAdvisor ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Cargando asesores...</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Jefe de Ventas</TableHead>
                  <TableHead>Líder de Zona</TableHead>
                  <TableHead>Coordinador</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advisors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No hay asesores registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  advisors.map((advisor) => (
                    <TableRow key={advisor.id}>
                      <TableCell className="font-medium">{advisor.full_name}</TableCell>
                      <TableCell>{advisor.email}</TableCell>
                      <TableCell>{advisor.phone || "-"}</TableCell>
                      <TableCell>{advisor.sales_manager || "-"}</TableCell>
                      <TableCell>{advisor.zone_leader || "-"}</TableCell>
                      <TableCell>{advisor.zonal_coordinator || "-"}</TableCell>
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
      </CardContent>
    </Card>
  );
};

export default AdvisorsManagement;
