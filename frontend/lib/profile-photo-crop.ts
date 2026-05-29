import type { Area } from "react-easy-crop"

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener("load", () => resolve(img))
    img.addEventListener("error", () => reject(new Error("No se pudo cargar la imagen")))
    img.src = src
  })
}

const OUT = 512

/**
 * Recorta la región indicada por `pixelCrop` en formato cuadrado rectangular.
 * La forma circular se aplica solo visualmente en el frontend con CSS (rounded-full).
 * Nunca se guarda una imagen con recorte circular en el servidor.
 */
export async function getProfilePhotoCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
  mime: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg",
  quality = 0.9
): Promise<Blob> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement("canvas")
  canvas.width = OUT
  canvas.height = OUT
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D no disponible")

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    OUT,
    OUT
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error("No se pudo generar la imagen"))
      },
      mime,
      quality
    )
  })
}

/**
 * Genera un object URL con la imagen recortada para usar como preview local.
 * No implica ninguna subida al servidor.
 */
export async function getCroppedPreviewUrl(imageSrc: string, pixelCrop: Area): Promise<string> {
  const blob = await getProfilePhotoCroppedBlob(imageSrc, pixelCrop)
  return URL.createObjectURL(blob)
}
