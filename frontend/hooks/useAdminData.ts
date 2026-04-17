"use client"

import { useState, useEffect } from "react"
import { tokenStorage } from "@/lib/token"
import {
  loginAdmin,
  getAdmin,
  updateAdmin,
  changePassword,
  requestPasswordCode,
  type Admin,
} from "@/services/administradores"

const EMPTY_FORM  = { nombreCompleto: "", email: "", idRol: 0 }
const EMPTY_PW    = { passwordActual: "", passwordNueva: "", confirmar: "" }
const EMPTY_LOGIN = { email: "", password: "" }

export function useAdminData(open: boolean) {
  const [needsLogin, setNeedsLogin]   = useState(false)
  const [loginForm, setLoginForm]     = useState(EMPTY_LOGIN)
  const [loginError, setLoginError]   = useState<string | null>(null)
  const [loggingIn, setLoggingIn]     = useState(false)

  const [admin, setAdmin]             = useState<Admin | null>(null)
  const [adminId, setAdminId]         = useState<number | null>(null)
  const [loadingAdmin, setLoading]    = useState(false)
  const [loadError, setLoadError]     = useState<string | null>(null)

  const [form, setForm]               = useState(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState<string | null>(null)
  const [saveOk, setSaveOk]           = useState(false)

  const [showPwForm, setShowPwForm]   = useState(false)
  const [pwForm, setPwForm]           = useState(EMPTY_PW)
  const [pwSaving, setPwSaving]       = useState(false)
  const [pwError, setPwError]         = useState<string | null>(null)
  const [pwOk, setPwOk]               = useState(false)

  const [codeSent, setCodeSent]       = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [codeError, setCodeError]     = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSaveOk(false)
    setPwOk(false)
    setShowPwForm(false)
    setPwForm(EMPTY_PW)
    setCodeSent(false)
    setLoadError(null)
    setLoginError(null)

    const token = tokenStorage.get()
    if (!token) { setNeedsLogin(true); return }

    loadAdmin()
  }, [open])

  async function loadAdmin(id?: number) {
    const targetId = id ?? adminId ?? 1
    setLoading(true)
    setLoadError(null)
    setNeedsLogin(false)
    try {
      const data = await getAdmin(targetId)
      setAdmin(data)
      setAdminId(data.idAdmin)
      setForm({ nombreCompleto: data.nombreCompleto, email: data.email, idRol: data.idRol })
    } catch (err: unknown) {
      const status = (err as { status?: number }).status
      if (status === 401) {
        tokenStorage.clear()
        setNeedsLogin(true)
      } else {
        setLoadError(err instanceof Error ? err.message : "Error al cargar datos")
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin() {
    if (!loginForm.email.trim() || !loginForm.password) {
      setLoginError("Ingresa tu correo y contraseña")
      return
    }
    setLoggingIn(true)
    setLoginError(null)
    try {
      const res = await loginAdmin(loginForm.email.trim().toLowerCase(), loginForm.password)
      tokenStorage.set(res.token)
      setLoginForm(EMPTY_LOGIN)
      await loadAdmin(res.admin.idAdmin)
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Credenciales inválidas")
    } finally {
      setLoggingIn(false)
    }
  }

  async function handleSave() {
    if (!admin) return
    if (!form.nombreCompleto.trim()) { setSaveError("El nombre es obligatorio"); return }
    if (!form.email.trim())          { setSaveError("El correo es obligatorio");  return }

    setSaving(true)
    setSaveError(null)
    setSaveOk(false)
    try {
      await updateAdmin(admin.idAdmin, {
        idRol:          form.idRol,
        nombreCompleto: form.nombreCompleto.trim(),
        email:          form.email.trim().toLowerCase(),
      })
      setAdmin((prev) => prev ? { ...prev, ...form } : prev)
      setSaveOk(true)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    if (!admin) return
    if (!pwForm.passwordActual)                    { setPwError("Ingresa tu contraseña actual"); return }
    if (!pwForm.passwordNueva)                     { setPwError("Ingresa la nueva contraseña"); return }
    if (pwForm.passwordNueva.length < 6)           { setPwError("Mínimo 6 caracteres"); return }
    if (pwForm.passwordNueva !== pwForm.confirmar) { setPwError("Las contraseñas no coinciden"); return }

    setPwSaving(true)
    setPwError(null)
    setPwOk(false)
    try {
      await changePassword(admin.idAdmin, {
        passwordActual: pwForm.passwordActual,
        passwordNueva:  pwForm.passwordNueva,
      })
      setPwOk(true)
      setPwForm(EMPTY_PW)
      setShowPwForm(false)
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : "Error al cambiar contraseña")
    } finally {
      setPwSaving(false)
    }
  }

  function handleCloseAccount() {
    tokenStorage.clear()
    setAdmin(null)
    setAdminId(null)
    setForm(EMPTY_FORM)
    setNeedsLogin(true)
    setLoadError(null)
    setSaveError(null)
    setSaveOk(false)
    setShowPwForm(false)
    setPwForm(EMPTY_PW)
    setPwError(null)
    setPwOk(false)
    setCodeSent(false)
    setCodeError(null)
  }

  async function handleSendCode() {
    if (!admin) return
    setSendingCode(true)
    setCodeError(null)
    try {
      await requestPasswordCode(admin.idAdmin)
      setCodeSent(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ""
      setCodeError(
        msg === "NOT_IMPLEMENTED"
          ? "La verificación por email estará disponible próximamente."
          : msg
      )
    } finally {
      setSendingCode(false)
    }
  }

  return {
    needsLogin,
    loginForm, setLoginForm,
    loginError, loggingIn,
    handleLogin,
    handleCloseAccount,
    admin, loadingAdmin, loadError,
    form, setForm,
    saving, saveError, saveOk,
    handleSave,
    showPwForm, setShowPwForm,
    pwForm, setPwForm,
    pwSaving, pwError, pwOk,
    handleChangePassword,
    codeSent, sendingCode, codeError,
    handleSendCode,
  }
}
