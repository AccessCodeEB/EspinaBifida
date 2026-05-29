"use client"

import { useState, useCallback, useEffect } from "react"
import Cropper, { type Area, type Point } from "react-easy-crop"
import "react-easy-crop/react-easy-crop.css"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { getProfilePhotoCroppedBlob } from "@/lib/profile-photo-crop"

const MAX_ZOOM = 4
const MIN_ZOOM = 1

export interface ProfilePhotoCropDialogProps {
  open: boolean
  /** object URL de la imagen elegida */
  imageSrc: string | null
  onClose: () => void
  /** Archivo recortado rectangular listo para subir al servidor */
  onComplete: (file: File) => void | Promise<void>
}

export function ProfilePhotoCropDialog({
  open,
  imageSrc,
  onClose,
  onComplete,
}: ProfilePhotoCropDialogProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) {
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
      setBusy(false)
    }
  }, [open])

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  async function apply() {
    if (!imageSrc || !croppedAreaPixels) return
    setBusy(true)
    try {
      const blob = await getProfilePhotoCroppedBlob(imageSrc, croppedAreaPixels)
      const file = new File([blob], "foto-perfil.jpg", { type: "image/jpeg" })
      await onComplete(file)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="w-full max-w-[min(22rem,calc(100vw-2.5rem))] gap-3 p-0 overflow-hidden sm:max-w-[22rem]">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle>Encuadrar foto</DialogTitle>
          <DialogDescription>
            Arrastra la imagen y usa el zoom para centrar el rostro dentro del círculo.
          </DialogDescription>
        </DialogHeader>

        {imageSrc && (
          <div className="relative mx-5 h-[min(42vh,240px)] w-[calc(100%-2.5rem)] overflow-hidden rounded-xl bg-muted">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={0}
              aspect={1}
              cropShape="round"
              showGrid={false}
              restrictPosition
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="contain"
              style={{
                containerStyle: { width: "100%", height: "100%", position: "relative" },
              }}
              classes={{}}
              mediaProps={{}}
              cropperProps={{}}
              zoomSpeed={0.65}
              zoomWithScroll
              keyboardStep={4}
            />
          </div>
        )}

        <div className="space-y-2 px-5">
          <p className="text-xs font-medium text-muted-foreground">Zoom</p>
          <Slider
            value={[zoom]}
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.02}
            onValueChange={(v) => setZoom(v[0] ?? 1)}
            disabled={!imageSrc || busy}
          />
        </div>

        <DialogFooter className="border-t border-border/50 bg-muted/20 px-5 py-3 sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-[#005bb5] hover:bg-[#004a94] text-white"
            disabled={!imageSrc || !croppedAreaPixels || busy}
            onClick={() => void apply()}
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Procesando…
              </>
            ) : (
              "Aplicar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
