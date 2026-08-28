/** Inserta un bloque de datos estructurados (JSON-LD) en la página.
 *
 *  `dangerouslySetInnerHTML` es la forma correcta aquí: React escaparía las
 *  comillas del JSON y Google no podría leerlo. El contenido no viene del
 *  usuario —lo arma el servidor desde el catálogo— y aun así se neutraliza el
 *  `<` para que un nombre de producto con "<" no pueda cerrar la etiqueta. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
