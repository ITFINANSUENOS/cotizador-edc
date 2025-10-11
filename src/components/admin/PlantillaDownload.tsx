import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PlantillaDownload = () => {
  const handleDownloadTemplate = () => {
    const csvContent = `Marca;Linea;Referencia;Descripcion;LISTA 1;LISTA 2;LISTA 3;LISTA 4;CREDICONTADO;BASE FINANSUEÑOS;CONVENIOS
Samsung;Refrigeración;RF28R7201SR;Nevera Side by Side 28 pies;2646000;2695000;2744000;2793000;2849000;3049000;3140000
Samsung;Refrigeración;RT38K5930SL;Nevera Top Mount 13.5 pies;1664000;1694000;1725000;1756000;1791000;1917000;1974000
Samsung;Lavado;WW22K6800AW;Lavadora Carga Frontal 22 kg;2117000;2156000;2196000;2235000;2280000;2439000;2512000
Samsung;Cocción;NX60T8511SS;Estufa de Gas 6 puestos;1361000;1386000;1412000;1437000;1466000;1568000;1615000
LG;Refrigeración;GS65SPP1;Nevera Side by Side 22 pies;3176000;3234000;3293000;3352000;3419000;3658000;3768000
LG;Refrigeración;GT32BPP;Nevera Top Mount 11 pies;1437000;1463000;1490000;1517000;1547000;1655000;1705000
LG;Lavado;WM22VV2S6B;Lavadora Carga Frontal 22 kg;2496000;2541000;2587000;2633000;2685000;2873000;2959000
LG;Cocción;LSG4513ST;Estufa de Gas 5 puestos;1768000;1800000;1833000;1866000;1903000;2036000;2097000
Whirlpool;Refrigeración;WRS325SDHZ;Nevera Side by Side 25 pies;2571000;2619000;2666000;2714000;2768000;2962000;3050000
Whirlpool;Lavado;WFW5620HW;Lavadora Carga Frontal 16 kg;1930000;1965000;2001000;2037000;2077000;2223000;2289000
Whirlpool;Cocción;WFG505M0BS;Estufa de Gas 5 puestos;1286000;1310000;1334000;1358000;1385000;1482000;1527000
Haceb;Cocción;ATLAS NEGRO;Estufa de Piso 4 puestos;643000;655000;667000;679000;692000;740000;762000
Haceb;Cocción;SIGLO XXI;Estufa de Piso 6 puestos;964000;982000;1000000;1018000;1038000;1111000;1144000
Haceb;Calefacción;CH-10L;Calentador de Paso 10 litros;522000;532000;541000;551000;562000;601000;619000
Mabe;Refrigeración;RMS510IAMRX0;Nevera Side by Side 20 pies;2330000;2373000;2416000;2459000;2508000;2683000;2763000
Mabe;Lavado;LMA72114WBAB0;Lavadora Automática 20 kg;1447000;1474000;1501000;1528000;1558000;1667000;1717000
Challenger;Refrigeración;CR568;Nevera Top Mount 18 pies;1205000;1227000;1249000;1271000;1296000;1387000;1428000
Challenger;Lavado;CL5816C;Lavadora Semiautomática 16 kg;723000;736000;750000;764000;779000;834000;859000
Electrolux;Refrigeración;ERT54K4HQS;Nevera Top Mount 14 pies;1686000;1717000;1748000;1779000;1814000;1941000;1999000
Electrolux;Lavado;EWFA13B3CWB;Lavadora Carga Frontal 13 kg;2088000;2127000;2166000;2205000;2249000;2406000;2478000`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla_productos_precios.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          Plantilla de Excel para Productos
        </CardTitle>
        <CardDescription>
          Descarga la plantilla con datos de ejemplo para cargar productos y precios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Formato Requerido</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              <p className="font-semibold">Columnas obligatorias (separadas por punto y coma):</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Marca:</strong> Nombre de la marca del producto</li>
                <li><strong>Linea:</strong> Categoría o línea del producto (Refrigeración, Lavado, Cocción, etc.)</li>
                <li><strong>Referencia:</strong> Código único del producto</li>
                <li><strong>Descripcion:</strong> Descripción detallada del producto</li>
                <li><strong>LISTA 1:</strong> Precio para contado (obligatorio)</li>
                <li><strong>LISTA 2:</strong> Precio para contado 2-3 cuotas (opcional)</li>
                <li><strong>LISTA 3:</strong> Precio para contado 4-5 cuotas (opcional)</li>
                <li><strong>LISTA 4:</strong> Precio para contado 6 cuotas (opcional)</li>
                <li><strong>CREDICONTADO:</strong> Precio con 5% de interés (opcional)</li>
                <li><strong>BASE FINANSUEÑOS:</strong> Base para cálculo de amortización crédito (opcional)</li>
                <li><strong>CONVENIOS:</strong> Precio especial para convenios institucionales (opcional)</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-3">
                <strong>Importante:</strong> El archivo debe usar punto y coma (;) como separador y estar en formato CSV o Excel (.xlsx)
              </p>
            </div>
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-3">
          <Button onClick={handleDownloadTemplate} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Descargar Plantilla con Datos de Ejemplo
          </Button>
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">Ejemplo de datos incluidos:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 20 productos de ejemplo</li>
              <li>• Marcas: Samsung, LG, Whirlpool, Haceb, Mabe, Challenger, Electrolux</li>
              <li>• Líneas: Refrigeración, Lavado, Cocción, Calefacción</li>
              <li>• Precios en formato colombiano (sin decimales)</li>
            </ul>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-medium text-yellow-900 mb-2">📝 Pasos para usar la plantilla:</p>
          <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
            <li>Descarga la plantilla usando el botón de arriba</li>
            <li>Abre el archivo en Excel, Google Sheets o tu editor preferido</li>
            <li>Modifica los datos de ejemplo o agrégale tus propios productos</li>
            <li>Guarda el archivo en formato CSV (separado por punto y coma)</li>
            <li>Usa el botón "Cargar Lista de Precios" para importar tu archivo</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlantillaDownload;
