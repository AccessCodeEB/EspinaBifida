"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const MAX_FILE_BYTES = 2 * 1024 * 1024

export interface ProfilePhotoCameraDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** JPEG capturado desde el fotograma del video */
  onCapture: (file: File) => void
}

export function ProfilePhotoCameraDialog({
  open,
  onOpenChange,
  onCapture,
}: ProfilePhotoCameraDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [starting, setStarting] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [hasStream, setHasStream] = useState(false)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setHasStream(false)
    const v = videoRef.current
    if (v) v.srcObject = null
  }, [])

  useEffect(() => {
    if (!open) {
      stopStream()
      setStarting(false)
      setCapturing(false)
      return
    }

    let cancelled = false
    setStarting(true)

    async function start() {
      try {
        const stream = await navigator.mediaDevices
          .getUserMedia({ video: { facingMode: "user" }, audio: false })
          .catch(async () => navigator.mediaDevices.getUserMedia({ video: true, audio: false }))
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const v = videoRef.current
        if (v) {
          v.srcObject = stream
          await v.play().catch(() => {})
        }
        if (cancelled) {
          stopStream()
          return
        }
        setHasStream(true)
      } catch (err: unknown) {
        if (cancelled) return
        const name = err instanceof DOMException ? err.name : ""
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          toast.error("Permiso de cámara denegado.")
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          toast.error("No hay cámara disponible.")
        } else {
          toast.error("No se pudo abrir la cámara.")
        }
        onOpenChange(false)
      } finally {
        if (!cancelled) setStarting(false)
      }
    }

    void start()
    return () => {
      cancelled = true
      stopStream()
    }
  }, [open, onOpenChange, stopStream])

  const handleCapture = () => {
    const video = videoRef.current
    if (!video || !streamRef.current) return
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      toast.error("La cámara no está lista. Espera un momento.")
      return
    }
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) {
      toast.error("No se pudo leer el video.")
      return
    }
    setCapturing(true)
    try {
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        setCapturing(false)
        toast.error("No se pudo generar la imagen.")
        return
      }
      // Misma orientación que la vista previa espejada (selfie)
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, w, h)
      canvas.toBlob(
        (blob) => {
          setCapturing(false)
          if (!blob) {
            toast.error("No se pudo generar la imagen.")
            return
          }
          if (blob.size > MAX_FILE_BYTES) {
            toast.error("La foto supera 2 MB. Prueba otra toma o mejor luz.")
            return
          }
          stopStream()
          const file = new File([blob], "foto-camara.jpg", { type: "image/jpeg" })
          onCapture(file)
          onOpenChange(false)
        },
        "image/jpeg",
        0.92
      )
    } catch {
      setCapturing(false)
      toast.error("No se pudo capturar la foto.")
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) stopStream()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-[min(24rem,calc(100vw-2.5rem))] gap-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tomar foto</DialogTitle>
          <DialogDescription>
            Colócate frente a la cámara y pulsa Capturar cuando estés listo.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black">
          <video
            ref={videoRef}
            className={cn(
              "size-full object-cover",
              "scale-x-[-1]"
            )}
            playsInline
            muted
            autoPlay
            aria-label="Vista previa de la cámara"
          />
          {starting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-sm text-white">
              <Loader2 className="size-8 animate-spin" />
              Iniciando cámara…
            </div>
          )}
        </div>

        <DialogFooter className="gap-3">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="gap-2"
            disabled={starting || capturing || !hasStream}
            onClick={handleCapture}
          >
            {capturing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Capturando…
              </>
            ) : (
              <>
                <Camera className="size-4" />
                Capturar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
