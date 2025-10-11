import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

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

    const { file, fileName, listName, startDate, endDate } = await req.json()

    if (!file || !listName || !startDate) {
      throw new Error('Missing required fields')
    }

    console.log(`Processing price list upload for: ${listName}`)

    // Decode base64 file
    const buffer = Uint8Array.from(atob(file), c => c.charCodeAt(0))
    
    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'array' })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(firstSheet)

    console.log(`Parsed ${data.length} rows from Excel`)

    // Create price list
    const { data: priceList, error: priceListError } = await supabaseClient
      .from('price_lists')
      .insert({
        name: listName,
        start_date: startDate,
        end_date: endDate || null,
        uploaded_by: user.id,
        is_active: true,
      })
      .select()
      .single()

    if (priceListError) {
      throw priceListError
    }

    console.log(`Created price list: ${priceList.id}`)

    // Process products
    const productInserts = []
    const priceListProductInserts = []

    for (const row of data as any[]) {
      // Expected columns: Marca, Linea, Referencia, Descripcion, LISTA 1-4, CREDICONTADO, BASE FINANSUEÑOS, CONVENIOS
      const brand = row['Marca'] || row['marca'] || ''
      const line = row['Linea'] || row['linea'] || row['Línea'] || ''
      const reference = row['Referencia'] || row['referencia'] || ''
      const description = row['Descripcion'] || row['descripcion'] || row['Descripción'] || ''
      const list1Price = parseFloat(row['LISTA 1'] || row['lista_1'] || 0)
      const list2Price = parseFloat(row['LISTA 2'] || row['lista_2'] || 0)
      const list3Price = parseFloat(row['LISTA 3'] || row['lista_3'] || 0)
      const list4Price = parseFloat(row['LISTA 4'] || row['lista_4'] || 0)
      const credicontadoPrice = parseFloat(row['CREDICONTADO'] || row['credicontado'] || 0)
      const creditPrice = parseFloat(row['BASE FINANSUEÑOS'] || row['BASE FINANSUENOS'] || row['base_finansuenos'] || 0)
      const convenioPrice = parseFloat(row['CONVENIOS'] || row['convenios'] || 0)

      if (!brand || !line || !reference || !list1Price) {
        console.log(`Skipping row with missing data: ${JSON.stringify(row)}`)
        continue
      }

      // Check if product exists
      let { data: existingProduct } = await supabaseClient
        .from('products')
        .select('id')
        .eq('brand', brand)
        .eq('line', line)
        .eq('reference', reference)
        .single()

      let productId = existingProduct?.id

      if (!productId) {
        // Insert new product
        const { data: newProduct, error: productError } = await supabaseClient
          .from('products')
          .insert({
            brand,
            line,
            reference,
            description,
          })
          .select()
          .single()

        if (productError) {
          console.error(`Error inserting product: ${productError.message}`)
          continue
        }

        productId = newProduct.id
        console.log(`Created new product: ${reference}`)
      }

      // Insert price list product
      const { error: plpError } = await supabaseClient
        .from('price_list_products')
        .insert({
          price_list_id: priceList.id,
          product_id: productId,
          list_1_price: list1Price,
          list_2_price: list2Price || null,
          list_3_price: list3Price || null,
          list_4_price: list4Price || null,
          credicontado_price: credicontadoPrice || null,
          credit_price: creditPrice || null,
          convenio_price: convenioPrice || null,
        })

      if (plpError) {
        console.error(`Error inserting price list product: ${plpError.message}`)
      }
    }

    console.log(`Successfully processed price list with ${data.length} products`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Lista de precios "${listName}" cargada exitosamente`,
        priceListId: priceList.id,
        productsProcessed: data.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error processing price list:', error)
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
