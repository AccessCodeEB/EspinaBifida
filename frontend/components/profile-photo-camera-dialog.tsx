"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, Loader2, SwitchCamera } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { getMediaDevices } from "@/lib/camera-support"

const MAX_FILE_BYTES = 2 * 1024 * 1024

export interface ProfilePhotoCameraDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** JPEG capturado desde el fotograma del video */
  onCapture: (file: File) => void
}

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop())
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
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)

  const stopStream = useCallback(() => {
    stopTracks(streamRef.current)
    streamRef.current = null
    setHasStream(false)
    const v = videoRef.current
    if (v) v.srcObject = null
  }, [])

  const refreshDeviceList = useCallback(async () => {
    const md = getMediaDevices()
    if (!md?.enumerateDevices) {
      setDevices([])
      return
    }
    try {
      const listed = await md.enumerateDevices()
      setDevices(listed.filter((d) => d.kind === "videoinput"))
    } catch {
      setDevices([])
    }
  }, [])

  useEffect(() => {
    if (!open) {
      stopStream()
      setStarting(false)
      setCapturing(false)
      setDevices([])
      setSelectedDeviceId(null)
      return
    }

    let cancelled = false
    setStarting(true)

    async function start() {
      stopTracks(streamRef.current)
      streamRef.current = null
      setHasStream(false)

      const md = getMediaDevices()
      if (!md?.getUserMedia) {
        if (!cancelled) {
          toast.error(
            "La cámara solo funciona con HTTPS o en http://localhost. Desde otra dirección (p. ej. IP de tu red) usa «Subir archivo», o ejecuta el front con npm run dev:https."
          )
          onOpenChange(false)
          setStarting(false)
        }
        return
      }

      try {
        let stream: MediaStream | null = null
        const preferDevice = Boolean(selectedDeviceId && selectedDeviceId.length > 0)

        if (preferDevice) {
          try {
            stream = await md.getUserMedia({
              audio: false,
              video: { deviceId: { exact: selectedDeviceId! } },
            })
          } catch {
            stream = await md.getUserMedia({
              audio: false,
              video: { deviceId: { ideal: selectedDeviceId! } },
            })
          }
        } else {
          try {
            stream = await md.getUserMedia({
              audio: false,
              video: { facingMode: "user" },
            })
          } catch {
            stream = await md.getUserMedia({
              audio: false,
              video: true,
            })
          }
        }

        if (cancelled) {
          stopTracks(stream)
          return
        }

        streamRef.current = stream
        const v = videoRef.current
        if (v) {
          v.srcObject = stream
          await v.play().catch(() => {})
        }

        await refreshDeviceList()

        const track = stream.getVideoTracks()[0]
        const activeId = track?.getSettings?.()?.deviceId
        if (activeId && !cancelled) {
          setSelectedDeviceId(activeId)
        }

        if (cancelled) {
          stopTracks(stream)
          streamRef.current = null
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
        } else if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
          toast.error("Esa cámara no está disponible. Prueba con otra.")
          setSelectedDeviceId(null)
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
      stopTracks(streamRef.current)
      streamRef.current = null
    }
  }, [open, selectedDeviceId, onOpenChange, refreshDeviceList, stopStream])

  useEffect(() => {
    if (!open) return
    const md = getMediaDevices()
    if (!md?.addEventListener) return
    const onDeviceChange = () => {
      void refreshDeviceList()
    }
    md.addEventListener("devicechange", onDeviceChange)
    return () => md.removeEventListener("devicechange", onDeviceChange)
  }, [open, refreshDeviceList])

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

  const pickDevice = (deviceId: string | null) => {
    setTimeout(() => setSelectedDeviceId(deviceId), 0)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-[min(24rem,calc(100vw-2.5rem))] gap-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tomar foto</DialogTitle>
          <DialogDescription>
            Colócate frente a la cámara y pulsa Capturar cuando estés listo. Puedes cambiar de cámara si hay varias conectadas.
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

        <DialogFooter className="w-full flex-row flex-wrap items-center justify-between gap-3 sm:justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={starting || devices.length === 0}
              >
                <SwitchCamera className="size-4 shrink-0" aria-hidden />
                Cámaras
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 min-w-[12rem] overflow-y-auto">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Dispositivos detectados ({devices.length})
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {devices.map((d, i) => {
                const id = d.deviceId || ""
                const label = (d.label && d.label.trim()) || `Cámara ${i + 1}`
                const isActive = Boolean(selectedDeviceId && id && selectedDeviceId === id)
                return (
                  <DropdownMenuItem
                    key={id || `idx-${i}`}
                    disabled={!id}
                    className={cn(isActive && "bg-accent")}
                    onSelect={() => {
                      if (!id) return
                      pickDevice(id)
                    }}
                  >
                    <span className="truncate">{label}</span>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
