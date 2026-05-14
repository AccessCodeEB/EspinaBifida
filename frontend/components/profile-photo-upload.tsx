"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { Camera, Loader2, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { isProfileCameraSupported } from "@/lib/camera-support"
import { resolvePublicUploadUrl } from "@/lib/media-url"
import { ProfilePhotoCropDialog } from "@/components/profile-photo-crop-dialog"
import { ProfilePhotoCameraDialog } from "@/components/profile-photo-camera-dialog"

const MAX_FILE_BYTES = 2 * 1024 * 1024
const ACCEPT_RE = /^image\/(jpeg|png|webp|gif)$/i

/** Redimensiona a máx 800×800 con calidad JPEG 0.82 para reducir el base64 antes de guardar en Oracle. */
async function resizeImageFile(file: File, maxPx = 800, quality = 0.82): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1)
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")
      if (!ctx) return reject(new Error("Canvas no disponible"))
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("No se pudo redimensionar"))
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }))
        },
        "image/jpeg",
        quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Imagen inválida")) }
    img.src = url
  })
}

export interface ProfilePhotoUploadProps {
  fotoPerfilUrl?: string | null
  /** Incrementar tras subida exitosa para evitar caché del navegador con la misma ruta */
  imageRevision?: number
  /** Vista previa local (p. ej. URL.createObjectURL) antes de tener URL en servidor */
  previewSrc?: string | null
  /** Texto o iniciales si no hay imagen */
  fallbackText: string
  disabled?: boolean
  uploading?: boolean
  onFileSelected: (file: File) => void | Promise<void>
  /** Tamaño del avatar en px (aprox.) */
  size?: "sm" | "md" | "lg"
  /** detail = hover para cambiar (expediente); form = botón explícito bajo la foto */
  variant?: "detail" | "form"
  /** Foto en escala de grises (p. ej. beneficiario dado de baja) */
  grayscale?: boolean
  /** Solo variante `form`: si hay `fotoPerfilUrl` en servidor, muestra papelera al hover y llama al pedir eliminar (confirmación en el padre) */
  onRemovePhotoRequest?: () => void
  /** Si es false, la imagen elegida se envía directo sin diálogo de recorte */
  enableCrop?: boolean
}

const sizeClass = {
  sm: "size-14 text-lg",
  md: "size-20 text-2xl",
  lg: "size-24 text-3xl",
} as const

export function ProfilePhotoUpload({
  fotoPerfilUrl,
  imageRevision = 0,
  previewSrc,
  fallbackText,
  disabled,
  uploading,
  onFileSelected,
  size = "md",
  variant = "form",
  grayscale,
  onRemovePhotoRequest,
  enableCrop = true,
}: ProfilePhotoUploadProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraSupported, setCameraSupported] = useState(false)

  useEffect(() => {
    setCameraSupported(isProfileCameraSupported())
  }, [])

  const serverSrc = resolvePublicUploadUrl(
    fotoPerfilUrl ?? undefined,
    previewSrc ? null : imageRevision || null
  )
  const displaySrc = previewSrc ?? serverSrc
  const dim = sizeClass[size]
  const imgKey = `${displaySrc ?? ""}|${imageRevision}|${previewSrc ?? ""}`

  const cancelCrop = useCallback(() => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    setCropOpen(false)
  }, [cropSrc])

  const finishCrop = useCallback(
    async (file: File) => {
      try {
        await onFileSelected(file)
      } finally {
        cancelCrop()
      }
    },
    [onFileSelected, cancelCrop]
  )

  const processImageFile = useCallback(
    async (file: File) => {
      if (!file || disabled || uploading) return
      if (!ACCEPT_RE.test(file.type)) {
        toast.error("Formato no válido. Usa JPEG, PNG, WebP o GIF.")
        return
      }
      // Redimensionar antes de mostrar el crop (garantiza base64 manejable en Oracle)
      const resized = await resizeImageFile(file)
      if (!enableCrop) {
        await onFileSelected(resized)
        return
      }
      const url = URL.createObjectURL(resized)
      setCropSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      setCropOpen(true)
    },
    [disabled, uploading, enableCrop, onFileSelected]
  )

  async function onGalleryInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    await processImageFile(file)
  }

  const openGalleryPicker = () => {
    setTimeout(() => galleryInputRef.current?.click(), 0)
  }

  const openCameraDialog = () => {
    setTimeout(() => setCameraOpen(true), 0)
  }

  const galleryInput = (
    <input
      ref={galleryInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      className="sr-only"
      aria-label="Subir foto de perfil desde archivos"
      onChange={(e) => void onGalleryInputChange(e)}
      disabled={disabled || uploading}
    />
  )

  const sourceMenuItems = (
    <>
      <DropdownMenuItem
        disabled={disabled || uploading}
        className="gap-2"
        onSelect={() => openGalleryPicker()}
      >
        <Upload className="size-4 shrink-0 opacity-70" aria-hidden />
        Subir archivo
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={disabled || uploading || !cameraSupported}
        className="gap-2"
        title={
          !cameraSupported
            ? "La cámara requiere HTTPS o http://localhost. Usa «Subir archivo» o npm run dev:https."
            : undefined
        }
        onSelect={() => openCameraDialog()}
      >
        <Camera className="size-4 shrink-0 opacity-70" aria-hidden />
        Tomar foto
      </DropdownMenuItem>
    </>
  )

  const cropDialog = (
    <ProfilePhotoCropDialog
      open={cropOpen}
      imageSrc={cropSrc}
      onClose={cancelCrop}
      onComplete={finishCrop}
    />
  )

  const cameraDialog = (
    <ProfilePhotoCameraDialog
      open={cameraOpen}
      onOpenChange={setCameraOpen}
      onCapture={(file) => void processImageFile(file)}
    />
  )

  if (variant === "detail") {
    return (
      <>
        <div className="relative shrink-0">
          {galleryInput}
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={disabled || uploading}>
              <button
                type="button"
                title="Subir archivo o tomar foto"
                aria-label="Elegir o cambiar foto de perfil"
                className={cn(
                  "group relative flex cursor-pointer items-center justify-center rounded-full bg-primary/10 text-primary font-bold ring-4 ring-background shadow-sm overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  dim,
                  grayscale && "grayscale",
                  (disabled || uploading) && "cursor-not-allowed opacity-60"
                )}
              >
                {displaySrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={imgKey} src={displaySrc} alt="" className="pointer-events-none size-full object-contain object-center" />
                ) : (
                  <span className="select-none">{fallbackText.slice(0, 2).toUpperCase()}</span>
                )}
                <span
                  className={cn(
                    "pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/55 text-[10px] font-semibold text-white opacity-0 transition-opacity",
                    "group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[state=open]:opacity-100",
                    uploading && "opacity-100"
                  )}
                >
                  {uploading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <>
                      <Camera className="size-4" />
                      {displaySrc ? "Cambiar" : "Foto"}
                    </>
                  )}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-44">
              {sourceMenuItems}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {cropDialog}
        {cameraDialog}
      </>
    )
  }

  const showRemoveOnHover =
    Boolean(onRemovePhotoRequest) &&
    Boolean(String(fotoPerfilUrl ?? "").trim()) &&
    !disabled &&
    !uploading

  return (
    <>
      <div className="flex flex-col items-center gap-3">
        {galleryInput}
        <div className="relative inline-block shrink-0 group/photo">
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={disabled || uploading}>
              <button
                type="button"
                title="Subir archivo o tomar foto"
                aria-label="Elegir o cambiar foto de perfil"
                className={cn(
                  "flex cursor-pointer items-center justify-center rounded-full bg-primary/10 text-primary font-bold ring-2 ring-border outline-none transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-ring overflow-hidden",
                  dim,
                  grayscale && "grayscale",
                  !(disabled || uploading) && "opacity-90 group-hover/photo:opacity-100 data-[state=open]:opacity-100",
                  (disabled || uploading) && "cursor-not-allowed opacity-60"
                )}
              >
                {displaySrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={imgKey} src={displaySrc} alt="" className="pointer-events-none size-full object-contain object-center" />
                ) : (
                  <span className="select-none">{fallbackText.slice(0, 2).toUpperCase()}</span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-44">
              {sourceMenuItems}
            </DropdownMenuContent>
          </DropdownMenu>
          {showRemoveOnHover && (
            <button
              type="button"
              title="Eliminar foto de perfil"
              aria-label="Eliminar foto de perfil"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onRemovePhotoRequest?.()
              }}
              className={cn(
                "absolute -right-0.5 -top-0.5 z-10 flex size-7 items-center justify-center rounded-full",
                "border border-destructive/30 bg-destructive text-white shadow-md",
                "opacity-0 transition-opacity duration-150",
                "pointer-events-none group-hover/photo:pointer-events-auto group-hover/photo:opacity-100",
                "hover:bg-destructive/90 focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <Trash2 className="size-3.5 text-white" aria-hidden />
            </button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={disabled || uploading}>
            <Button type="button" variant="outline" size="sm" className="gap-2">
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Subiendo…
                </>
              ) : (
                <>
                  <Camera className="size-4" />
                  {previewSrc || serverSrc ? "Cambiar foto" : "Subir foto de perfil"}
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44">
            {sourceMenuItems}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {cropDialog}
      {cameraDialog}
    </>
  )
}
