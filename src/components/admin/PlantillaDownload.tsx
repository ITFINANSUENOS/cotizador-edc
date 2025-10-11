import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PlantillaDownload = () => {
  const handleDownloadTemplate = () => {
    const csvContent = `Marca;Linea;Referencia;Descripcion;Precio_Base;Precio_Credito;Precio_Convenio
Samsung;Refrigeración;RF28R7201SR;Nevera Side by Side 28 pies;3500000;3800000;3400000
Samsung;Refrigeración;RT38K5930SL;Nevera Top Mount 13.5 pies;2200000;2400000;2100000
Samsung;Lavado;WW22K6800AW;Lavadora Carga Frontal 22 kg;2800000;3000000;2700000
Samsung;Cocción;NX60T8511SS;Estufa de Gas 6 puestos;1800000;2000000;1750000
LG;Refrigeración;GS65SPP1;Nevera Side by Side 22 pies;4200000;4500000;4000000
LG;Refrigeración;GT32BPP;Nevera Top Mount 11 pies;1900000;2100000;1850000
LG;Lavado;WM22VV2S6B;Lavadora Carga Frontal 22 kg;3100000;3300000;3000000
LG;Cocción;LSG4513ST;Estufa de Gas 5 puestos;2200000;2400000;2100000
Whirlpool;Refrigeración;WRS325SDHZ;Nevera Side by Side 25 pies;3200000;3500000;3100000
Whirlpool;Lavado;WFW5620HW;Lavadora Carga Frontal 16 kg;2400000;2600000;2300000
Whirlpool;Cocción;WFG505M0BS;Estufa de Gas 5 puestos;1600000;1800000;1550000
Haceb;Cocción;ATLAS NEGRO;Estufa de Piso 4 puestos;800000;900000;780000
Haceb;Cocción;SIGLO XXI;Estufa de Piso 6 puestos;1200000;1350000;1150000
Haceb;Calefacción;CH-10L;Calentador de Paso 10 litros;650000;720000;630000
Mabe;Refrigeración;RMS510IAMRX0;Nevera Side by Side 20 pies;2900000;3200000;2800000
Mabe;Lavado;LMA72114WBAB0;Lavadora Automática 20 kg;1800000;2000000;1750000
Challenger;Refrigeración;CR568;Nevera Top Mount 18 pies;1500000;1650000;1450000
Challenger;Lavado;CL5816C;Lavadora Semiautomática 16 kg;900000;1000000;880000
Electrolux;Refrigeración;ERT54K4HQS;Nevera Top Mount 14 pies;2100000;2300000;2050000
Electrolux;Lavado;EWFA13B3CWB;Lavadora Carga Frontal 13 kg;2600000;2800000;2500000`;

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
                <li><strong>Precio_Base:</strong> Precio base del producto (sin decimales)</li>
                <li><strong>Precio_Credito:</strong> Precio para venta a crédito (opcional)</li>
                <li><strong>Precio_Convenio:</strong> Precio para venta por convenio (opcional)</li>
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
