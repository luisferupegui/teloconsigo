import Image from "next/image";

/**
 * Renderiza una imagen si `src` es URL (http/https) o un emoji grande si no.
 * Sirve para que los productos puedan ir migrando emoji → foto real.
 */
export function SmartImage({
  src,
  alt,
  className = "",
  emojiSize = "text-7xl",
}: {
  src: string;
  alt: string;
  className?: string;
  emojiSize?: string;
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
          className="object-cover"
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
