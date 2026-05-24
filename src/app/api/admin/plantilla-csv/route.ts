export const GET = async () => {
  const csv = `nombre,marca,categoria,precio,precioAnterior,stock,rating,reviews,imagen,destacado,descripcion,specs
AMD Ryzen 5 7600,AMD,procesadores,1099000,,15,4.7,80,🧠,true,"Procesador 6 núcleos para gaming",socket=AM5;nucleos=6;hilos=12;tdp=65W
"Kingston Fury Beast 16GB DDR4",Kingston,memoria-ram,229000,279000,40,4.6,150,💾,false,"Memoria DDR4 confiable",tipo=DDR4;capacidad=16 GB;velocidad=3200 MHz
`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="plantilla-productos.csv"',
    },
  });
};
