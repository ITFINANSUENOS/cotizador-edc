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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Pencil, Trash2, Upload, Download, Users, Shield } from "lucide-react";

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  document_id: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  hire_date: string | null;
  is_active: boolean;
  roles?: string[];
}

const TeamManagement = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [importing, setImporting] = useState(false);
  
  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  // CSV file
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const roleOptions = [
    { value: "admin", label: "Administrador", color: "bg-red-100 text-red-800" },
    { value: "comercial", label: "Comercial", color: "bg-blue-100 text-blue-800" },
    { value: "cartera", label: "Cartera", color: "bg-green-100 text-green-800" },
    { value: "administrativo", label: "Administrativo", color: "bg-purple-100 text-purple-800" },
  ];

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .order("full_name", { ascending: true });

    if (error) {
      toast.error("Error al cargar miembros del equipo");
      console.error(error);
    } else {
      // Load roles for each member
      const membersWithRoles = await Promise.all(
        (data || []).map(async (member) => {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", member.user_id);
          
          return {
            ...member,
            roles: roles?.map(r => r.role) || []
          };
        })
      );
      
      setMembers(membersWithRoles);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setDocumentId("");
    setPhone("");
    setDepartment("");
    setPosition("");
    setHireDate("");
    setSelectedRoles([]);
    setIsActive(true);
    setEditingMember(null);
  };

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setFullName(member.full_name);
    setEmail(member.email);
    setDocumentId(member.document_id || "");
    setPhone(member.phone || "");
    setDepartment(member.department || "");
    setPosition(member.position || "");
    setHireDate(member.hire_date || "");
    setSelectedRoles(member.roles || []);
    setIsActive(member.is_active);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!fullName || !email || !documentId) {
      toast.error("Nombre, email y cédula son requeridos");
      return;
    }

    if (editingMember) {
      // Update existing member
      const { error } = await supabase
        .from("team_members")
        .update({
          full_name: fullName,
          document_id: documentId,
          phone: phone || null,
          department: department || null,
          position: position || null,
          hire_date: hireDate || null,
          is_active: isActive,
        })
        .eq("id", editingMember.id);

      if (error) {
        toast.error(error.message || "Error al actualizar miembro");
        console.error(error);
        return;
      }

      // Update roles
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", editingMember.user_id);

      if (selectedRoles.length > 0) {
        const roleInserts = selectedRoles.map(role => ({
          user_id: editingMember.user_id,
          role: role as "admin" | "advisor" | "comercial" | "cartera" | "administrativo"
        }));
        
        await supabase
          .from("user_roles")
          .insert(roleInserts);
      }

      toast.success("Miembro actualizado exitosamente");
      setDialogOpen(false);
      resetForm();
      loadMembers();
    }
  };

  const handleDelete = async (id: string, userId: string) => {
    if (!confirm("¿Estás seguro de eliminar este miembro del equipo?")) return;

    // Delete roles first
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    // Delete member
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Error al eliminar miembro");
      console.error(error);
    } else {
      toast.success("Miembro eliminado exitosamente");
      loadMembers();
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
        
        const { data, error } = await supabase.functions.invoke('import-team-members-csv', {
          body: { csvContent }
        });

        if (error) throw error;

        toast.success(data.message);
        setImportDialogOpen(false);
        setCsvFile(null);
        loadMembers();
      };
      
      reader.onerror = () => {
        throw new Error("Error al leer el archivo");
      };
      
      reader.readAsText(csvFile);
    } catch (error: any) {
      toast.error(error.message || "Error al importar miembros del equipo");
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = `Nombre_Completo;Cedula;Email;Telefono;Departamento;Cargo;Fecha_Contratacion;Roles
Juan Pérez González;1234567890;juan.perez@example.com;3001234567;Ventas;Asesor Comercial;2024-01-15;comercial
María López;9876543210;maria.lopez@example.com;3109876543;Cartera;Analista de Cartera;2024-02-01;cartera
Carlos Rodríguez;5555555555;carlos.rodriguez@example.com;3155555555;Administración;Asistente Administrativo;2024-03-10;administrativo`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla_equipo.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const headers = ["Nombre", "Cédula", "Email", "Teléfono", "Departamento", "Cargo", "Fecha Contratación", "Roles", "Estado"];
    const rows = members.map(m => [
      m.full_name,
      m.document_id || "",
      m.email,
      m.phone || "",
      m.department || "",
      m.position || "",
      m.hire_date || "",
      m.roles?.join(", ") || "",
      m.is_active ? "Activo" : "Inactivo"
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `equipo_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getRoleColor = (role: string) => {
    return roleOptions.find(r => r.value === role)?.color || "bg-gray-100 text-gray-800";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Gestión de Equipo
            </CardTitle>
            <CardDescription>
              Administra los miembros del equipo y sus roles (Comercial, Cartera, Administrativos)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Plantilla CSV
            </Button>
            
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Importar CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Importar Miembros desde CSV</DialogTitle>
                  <DialogDescription>
                    Sube un archivo CSV con los datos del equipo
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
      
      <CardContent>
        {loading ? (
          <p>Cargando equipo...</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No hay miembros del equipo registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.full_name}</TableCell>
                      <TableCell>{member.document_id || "-"}</TableCell>
                      <TableCell className="text-sm">{member.email}</TableCell>
                      <TableCell>{member.phone || "-"}</TableCell>
                      <TableCell className="text-sm">{member.department || "-"}</TableCell>
                      <TableCell className="text-sm">{member.position || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.roles && member.roles.length > 0 ? (
                            member.roles.map(role => (
                              <Badge key={role} variant="outline" className={getRoleColor(role)}>
                                {roleOptions.find(r => r.value === role)?.label || role}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin rol</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          member.is_active 
                            ? "bg-green-50 text-green-700 ring-1 ring-green-600/20" 
                            : "bg-gray-50 text-gray-700 ring-1 ring-gray-600/20"
                        }`}>
                          {member.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(member)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(member.id, member.user_id)}
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Editar Miembro del Equipo
              </DialogTitle>
              <DialogDescription>
                Modifica los datos y roles del miembro
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
                <Label htmlFor="documentId">Cédula *</Label>
                <Input
                  id="documentId"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
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
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="hireDate">Fecha de Contratación</Label>
                  <Input
                    id="hireDate"
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="position">Cargo</Label>
                  <Input
                    id="position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Roles *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {roleOptions.map((role) => (
                    <div key={role.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`role-${role.value}`}
                        checked={selectedRoles.includes(role.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoles([...selectedRoles, role.value]);
                          } else {
                            setSelectedRoles(selectedRoles.filter(r => r !== role.value));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={`role-${role.value}`} className="text-sm cursor-pointer">
                        {role.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="isActive">Miembro Activo</Label>
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

export default TeamManagement;
