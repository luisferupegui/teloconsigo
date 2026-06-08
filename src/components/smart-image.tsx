import Image from "next/image";

/**
 * Renderiza una imagen si `src` es URL (http/https) o un emoji grande si no.
 * Sirve para que los productos puedan ir migrando emoji → foto real.
 *
 * objectFit:
 *   "cover"   (default) — recorta para llenar el contenedor (bueno para thumbnails cuadradas)
 *   "contain"           — muestra la imagen completa sin recortar (bueno para vistas de detalle)
 */
export function SmartImage({
  src,
  alt,
  className = "",
  emojiSize = "text-7xl",
  objectFit = "cover",
}: {
  src: string;
  alt: string;
  className?: string;
  emojiSize?: string;
  objectFit?: "cover" | "contain";
}) {
  const isUrl = /^https?:\/\//i.test(src) || src.startsWith("/");
  if (isUrl) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width:768px) 50vw, 300px"
          unoptimized
          className={objectFit === "contain" ? "object-contain" : "object-cover"}
        />
      </div>
    );
  }
  return (
    <div
      className={`flex items-center justify-center ${emojiSize} ${className}`}
    >
      {src}
    </div>
  );
}
