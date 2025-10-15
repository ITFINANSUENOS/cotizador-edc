import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { csvContent } = await req.json()

    if (!csvContent) {
      throw new Error('Missing CSV content')
    }

    console.log('Processing team members CSV import')

    const lines = csvContent.split('\n')
    const headers = lines[0].split(';').map((h: string) => h.trim())
    
    console.log('CSV Headers:', headers)

    let imported = 0
    let errors = 0
    const errorMessages: string[] = []

    // Sanitize CSV inputs
    const sanitizeValue = (value: string) => {
      if (!value) return value;
      const trimmed = value.trim();
      // Remove formula injection characters
      const dangerous = ['=', '+', '-', '@', '|'];
      let sanitized = trimmed;
      while (dangerous.includes(sanitized[0])) {
        sanitized = sanitized.substring(1);
      }
      return sanitized;
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split(';').map((v: string) => sanitizeValue(v))
      
      const nombreCompleto = values[0]
      const cedula = values[1]
      const email = values[2]
      const telefono = values[3]
      const departamento = values[4]
      const cargo = values[5]
      const fechaContratacion = values[6]
      const rolesStr = values[7]

      if (!nombreCompleto || !cedula || !email) {
        console.log(`Skipping line ${i}: Missing required data`)
        errors++
        errorMessages.push(`Línea ${i}: Faltan datos requeridos`)
        continue
      }

      // Parse roles
      const roles = rolesStr ? rolesStr.split(',').map((r: string) => r.trim().toLowerCase()) : []

      try {
        // Check if user already exists by document_id
        const { data: existing } = await supabaseClient
          .from('team_members')
          .select('id, user_id')
          .eq('document_id', cedula)
          .single()

        if (existing) {
          // Update existing member
          const { error: updateError } = await supabaseClient
            .from('team_members')
            .update({
              full_name: nombreCompleto,
              phone: telefono || null,
              department: departamento || null,
              position: cargo || null,
              hire_date: fechaContratacion || null,
            })
            .eq('id', existing.id)

          if (updateError) {
            console.error(`Error updating member ${nombreCompleto}:`, updateError)
            errors++
            errorMessages.push(`${nombreCompleto}: ${updateError.message}`)
            continue
          }

          // Update roles
          await supabaseClient
            .from('user_roles')
            .delete()
            .eq('user_id', existing.user_id)

          for (const role of roles) {
            if (['admin', 'comercial', 'cartera', 'administrativo', 'advisor'].includes(role)) {
              await supabaseClient
                .from('user_roles')
                .insert({
                  user_id: existing.user_id,
                  role: role
                })
            }
          }

          imported++
        } else {
          // Create new user
          const tempPassword = `temp${cedula}`
          const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
            email: email,
            password: tempPassword,
            email_confirm: true,
          })

          if (authError) {
            console.error(`Error creating user for ${nombreCompleto}:`, authError)
            errors++
            errorMessages.push(`${nombreCompleto}: ${authError.message}`)
            continue
          }

          // Create team member profile
          const { error: memberError } = await supabaseClient
            .from('team_members')
            .insert({
              user_id: authData.user.id,
              full_name: nombreCompleto,
              email: email,
              document_id: cedula,
              phone: telefono || null,
              department: departamento || null,
              position: cargo || null,
              hire_date: fechaContratacion || null,
              is_active: true,
            })

          if (memberError) {
            console.error(`Error creating team member ${nombreCompleto}:`, memberError)
            errors++
            errorMessages.push(`${nombreCompleto}: ${memberError.message}`)
            continue
          }

          // Assign roles
          for (const role of roles) {
            if (['admin', 'comercial', 'cartera', 'administrativo', 'advisor'].includes(role)) {
              await supabaseClient
                .from('user_roles')
                .insert({
                  user_id: authData.user.id,
                  role: role
                })
            }
          }

          imported++
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error(`Error processing member ${nombreCompleto}:`, errorMessage)
        errors++
        errorMessages.push(`${nombreCompleto}: ${errorMessage}`)
      }
    }

    console.log(`Import completed: ${imported} imported, ${errors} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        errors,
        message: `${imported} miembros importados. ${errors} errores.`,
        errorDetails: errorMessages.length > 0 ? errorMessages : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error importing team members:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
