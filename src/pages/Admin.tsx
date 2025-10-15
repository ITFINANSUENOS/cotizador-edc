import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";
import { toast } from "sonner";
import AdvisorsManagement from "@/components/admin/AdvisorsManagement";
import PriceListsManagement from "@/components/admin/PriceListsManagement";
import SalesPlanConfig from "@/components/admin/SalesPlanConfig";
import TeamManagement from "@/components/admin/TeamManagement";
import QuotesManagement from "@/components/admin/QuotesManagement";

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Check if user has admin role
      const { data: roleData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .single();

      if (error || !roleData) {
        toast.error("Acceso denegado. Solo administradores pueden acceder a esta sección.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    checkAdminAccess();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada exitosamente");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <p className="text-lg">Cargando...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-2xl text-primary flex items-center gap-2">
                <Settings className="w-6 h-6" />
                Panel de Administración CMS
              </CardTitle>
              <CardDescription>
                Administrador: {user?.email}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/cotizador")}>
                <Settings className="w-4 h-4 mr-2" />
                Cotizaciones
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs de Gestión */}
        <Tabs defaultValue="advisors" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="advisors">Gestión de Asesores</TabsTrigger>
            <TabsTrigger value="team">Equipo</TabsTrigger>
            <TabsTrigger value="quotes">Cotizaciones</TabsTrigger>
            <TabsTrigger value="prices">Listas de Precios</TabsTrigger>
            <TabsTrigger value="plans">Configuración de Planes</TabsTrigger>
          </TabsList>

          <TabsContent value="advisors">
            <AdvisorsManagement />
          </TabsContent>

          <TabsContent value="team">
            <TeamManagement />
          </TabsContent>

          <TabsContent value="quotes">
            <QuotesManagement />
          </TabsContent>

          <TabsContent value="prices">
            <PriceListsManagement />
          </TabsContent>

          <TabsContent value="plans">
            <SalesPlanConfig />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
