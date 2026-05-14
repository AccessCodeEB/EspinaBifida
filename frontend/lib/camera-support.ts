/**
 * APIs de cámara del navegador: requieren contexto seguro (HTTPS o localhost/127.0.0.1).
 * En http://192.168.x.x u otra IP en HTTP, `mediaDevices` suele ser undefined.
 */
export function getMediaDevices(): MediaDevices | null {
  if (typeof window === "undefined") return null
  return navigator.mediaDevices ?? null
}

export function isProfileCameraSupported(): boolean {
  if (typeof window === "undefined") return false
  if (!(window.isSecureContext ?? false)) return false
  return typeof getMediaDevices()?.getUserMedia === "function"
}
