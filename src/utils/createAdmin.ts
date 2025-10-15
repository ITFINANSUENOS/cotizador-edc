import { supabase } from "@/integrations/supabase/client";

/**
 * Script para crear un usuario administrador
 * SOLO DISPONIBLE EN DESARROLLO
 * Ejecutar desde la consola del navegador después de registrarse
 */
export const createAdminUser = async (email: string) => {
  // Only allow in development mode
  if (import.meta.env.PROD) {
    console.error("❌ Esta función solo está disponible en modo desarrollo");
    return;
  }
  try {
    // Primero, obtener el user_id del email
    const { data: userData, error: userError } = await supabase.auth.getSession();
    
    if (userError || !userData.session) {
      console.error("Debes estar autenticado primero");
      return;
    }

    const userId = userData.session.user.id;

    // Insertar rol de admin
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "admin",
      });

    if (roleError) {
      console.error("Error al asignar rol admin:", roleError);
      return;
    }

    console.log("✅ Usuario admin creado exitosamente");
    console.log("Recarga la página y ve a /admin");
    
  } catch (error) {
    console.error("Error:", error);
  }
};

// Para usar: 
// 1. Regístrate en la app con el email que quieres como admin
// 2. Abre la consola del navegador (F12)
// 3. Ejecuta: 
//    import { createAdminUser } from './src/utils/createAdmin.ts'
//    createAdminUser('tu-email@ejemplo.com')
