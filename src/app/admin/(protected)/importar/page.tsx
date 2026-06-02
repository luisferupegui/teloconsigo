import Link from "next/link";
import { importCSV } from "../../actions";

export const metadata = { title: "Importar CSV" };

const TEMPLATE = `nombre,marca,categoria,precio,precioAnterior,stock,rating,reviews,imagen,destacado,descripcion,specs
AMD Ryzen 5 7600,AMD,procesadores,1099000,,15,4.7,80,🧠,true,"Procesador 6 núcleos para gaming",socket=AM5;nucleos=6;hilos=12;tdp=65W
"Kingston Fury Beast 16GB DDR4",Kingston,memoria-ram,229000,279000,40,4.6,150,💾,false,"Memoria DDR4 confiable",tipo=DDR4;capacidad=16 GB;velocidad=3200 MHz`;

export default function ImportarPage() {
  async function handleImport(formData: FormData) {
    "use server";
    await importCSV(formData);
  }

  return (
    <div>
      <nav className="text-xs text-zinc-500 mb-3">
        <Link href="/admin" className="hover:underline">
          Productos
        </Link>
        <span className="mx-2">/</span>
        <span>Importar CSV</span>
      </nav>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">
        📥 Importar productos desde CSV
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-base font-bold">Pega tu CSV aquí</h2>
          <p className="mt-1 text-sm text-zinc-600">
            La primera línea son los nombres de columnas. Los productos con un
            <code className="px-1">slug</code> existente se actualizan; los
            demás se crean.
          </p>
          <form action={handleImport} className="mt-4 space-y-4">
            <textarea
              required
              name="csv"
              rows={16}
              defaultValue={TEMPLATE}
              className="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-md bg-[#1e6cff] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#1858d6]"
              >
                📤 Importar productos
              </button>
              <a
                href="/api/admin/plantilla-csv"
                download="plantilla-productos.csv"
                className="rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:border-[#1e6cff]"
              >
                ⬇️ Descargar plantilla
              </a>
              <Link
                href="/admin"
                className="rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm">
            <h3 className="font-bold">📋 Columnas disponibles</h3>
            <ul className="mt-3 space-y-1 text-xs text-zinc-700">
              <li>
                <strong>nombre</strong> *
              </li>
              <li>
                <strong>marca</strong> · ej: AMD, NVIDIA
              </li>
              <li>
                <strong>categoria</strong> · usa el slug (procesadores,
                tarjetas-graficas, memoria-ram…)
              </li>
              <li>
                <strong>precio</strong> · solo números (1099000)
              </li>
              <li>
                <strong>precioAnterior</strong> · para mostrar descuento
              </li>
              <li>
                <strong>stock</strong> · unidades disponibles
              </li>
              <li>
                <strong>rating</strong> · 1-5
              </li>
              <li>
                <strong>reviews</strong> · cantidad de reseñas
              </li>
              <li>
                <strong>imagen</strong> · emoji o URL
              </li>
              <li>
                <strong>destacado</strong> · true / false
              </li>
              <li>
                <strong>descripcion</strong>
              </li>
              <li>
                <strong>specs</strong> · formato
                <br />
                <code className="text-[10px]">
                  socket=AM5;nucleos=8;tdp=120W
                </code>
              </li>
              <li>
                <strong>slug</strong> · opcional, se genera si no se da
              </li>
            </ul>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-bold">💡 Tip</p>
            <p className="mt-1 text-xs">
              Si un campo contiene comas (ej. descripción), envuélvelo entre
              comillas dobles: <code>&quot;texto, con coma&quot;</code>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
