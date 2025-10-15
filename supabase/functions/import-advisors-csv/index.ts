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

    // Get user from auth header
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

    console.log('Processing CSV import for advisors')

    // Parse CSV
    const lines = csvContent.split('\n')
    const headers = lines[0].split(';').map((h: string) => h.trim())
    
    console.log('CSV Headers:', headers)

    let imported = 0
    let errors = 0

    // Process each line (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split(';').map((v: string) => v.trim())
      
      const ccAsesor = values[0]
      const codigoVendedor = values[1]
      const nombreAsesor = values[2]
      const movilAsesor = values[3]
      const tipoAsesor = values[4]
      const ccJefeVts = values[5]
      const jefeVentas = values[6]
      const regionalVenta = values[7]
      const liderZona = values[8]
      const movilLider = values[9]

      if (!ccAsesor || !nombreAsesor) {
        console.log(`Skipping line ${i}: Missing required data`)
        errors++
        continue
      }

      // Create a temporary email for the advisor (they can update it later)
      const tempEmail = `asesor_${ccAsesor}@temporal.edc.com`

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

      const sanitizedNombre = sanitizeValue(nombreAsesor);
      const sanitizedMovil = sanitizeValue(movilAsesor);

      // Validate inputs
      if (sanitizedNombre.length > 100) {
        console.log(`Skipping line ${i}: Name too long`)
        errors++
        continue
      }

      if (sanitizedMovil && !/^[0-9\s\-+()]{7,20}$/.test(sanitizedMovil)) {
        console.log(`Skipping line ${i}: Invalid phone format`)
        errors++
        continue
      }

      try {
        // Check if advisor already exists by email
        const { data: existing } = await supabaseClient
          .from('advisors')
          .select('id, user_id')
          .eq('email', tempEmail)
          .maybeSingle()

        if (existing) {
          // Update existing advisor
          const { error: updateError } = await supabaseClient
            .from('advisors')
            .update({
              full_name: sanitizedNombre,
              advisor_code: codigoVendedor || null,
              phone: sanitizedMovil || null,
              sales_manager: jefeVentas !== 'N/A' ? sanitizeValue(jefeVentas) : null,
              zone_leader: sanitizeValue(liderZona) || null,
              regional: sanitizeValue(regionalVenta) || null,
            })
            .eq('id', existing.id)

          if (updateError) {
            console.error(`Error updating advisor ${sanitizedNombre}:`, updateError)
            errors++
          } else {
            imported++
          }
        } else {
          // Generate secure random password
          const generateSecurePassword = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
            let password = '';
            const array = new Uint8Array(16);
            crypto.getRandomValues(array);
            for (let i = 0; i < 16; i++) {
              password += chars[array[i] % chars.length];
            }
            return password;
          };

          const tempPassword = generateSecurePassword();

          // Create new user account
          const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
            email: tempEmail,
            password: tempPassword,
            email_confirm: false,
            user_metadata: {
              force_password_reset: true,
              account_created_by_import: true,
              document_id: ccAsesor
            }
          })

          if (authError) {
            console.error(`Error creating user for ${sanitizedNombre}:`, authError)
            errors++
            continue
          }

          console.log(`Created advisor ${sanitizedNombre} with secure password. Email: ${tempEmail}`)

          // Create advisor profile
          const { error: advisorError } = await supabaseClient
            .from('advisors')
            .insert({
              user_id: authData.user.id,
              full_name: sanitizedNombre,
              email: tempEmail,
              advisor_code: codigoVendedor || null,
              phone: sanitizedMovil || null,
              sales_manager: jefeVentas !== 'N/A' ? sanitizeValue(jefeVentas) : null,
              zone_leader: sanitizeValue(liderZona) || null,
              regional: sanitizeValue(regionalVenta) || null,
              is_active: true,
            })

          if (advisorError) {
            console.error(`Error creating advisor ${sanitizedNombre}:`, advisorError)
            errors++
            continue
          }

          // Assign advisor role
          const { error: roleError } = await supabaseClient
            .from('user_roles')
            .insert({
              user_id: authData.user.id,
              role: 'advisor',
            })

          if (roleError) {
            console.error(`Error assigning role to ${sanitizedNombre}:`, roleError)
          }

          imported++
        }
      } catch (err) {
        console.error(`Error processing advisor ${sanitizedNombre}:`, err)
        errors++
      }
    }

    console.log(`Import completed: ${imported} imported, ${errors} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        errors,
        message: `${imported} asesores importados exitosamente. ${errors} errores.`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error importing advisors:', error)
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
