"use client"

import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import React, { useState, useEffect, useRef } from "react"
import { useBeneficiarios } from "@/hooks/useBeneficiarios"
import type { Beneficiario } from "@/services/beneficiarios"
import { BeneficiariosEditDialog } from "@/components/beneficiarios-edit-dialog"
import { BeneficiariosTable } from "./beneficiarios/BeneficiariosTable"
import { BeneficiarioDetailPanel } from "./beneficiarios/BeneficiarioDetailPanel"
import { BeneficiarioFormDialog } from "./beneficiarios/BeneficiarioFormDialog"

// ─── Componente Principal (Orquestador) ──────────────────────────────────────

export function BeneficiariosSection({
  openEditCurp = null,
  onConsumedOpenEditCurp,
}: {
  openEditCurp?: string | null
  onConsumedOpenEditCurp?: () => void
} = {}) {
  const [overlayAction, setOverlayAction] = useState<"baja" | "eliminar" | null>(null)
  const [credencialBeneficiario, setCredencialBeneficiario] = useState<Beneficiario | null>(null)
  const [removeFotoConfirmOpen, setRemoveFotoConfirmOpen] = useState(false)

  const {
    beneficiarios, loading, error,
    filtered, conteos,
    searchTerm, setSearchTerm,
    filtroEstatus, setFiltroEstatus,
    showAltaDialog, setShowAltaDialog,
    showExpedienteDialog, setShowExpedienteDialog,
    showEditDialog, setShowEditDialog,
    selectedBeneficiario, setSelectedBeneficiario,
    editForm, altaForm, altaErrors, setAltaErrors,
    isSaving, saveError, setSaveError, editErrors,
    openEdit, handleEditChange, handleSaveEdit, handleEditDelete,
    handleAltaChange, handleAltaSubmit, handleDarDeBaja,
    fotoUploading, handleUploadFotoBeneficiario, handleDeleteFotoBeneficiario,
    altaFotoPreview, handleAltaFotoSelected,
    editFotoPreview, handleEditFotoSelected,
  } = useBeneficiarios()

  const openEditRef = useRef(openEdit)
  openEditRef.current = openEdit

  useEffect(() => {
    const raw = openEditCurp?.trim()
    if (!raw || loading || error) return
    const c = raw.toUpperCase()
    const b = beneficiarios.find(
      (x) => String(x.folio ?? x.curp ?? "").trim().toUpperCase() === c
    )
    if (b) {
      openEditRef.current(b)
      onConsumedOpenEditCurp?.()
    }
  }, [openEditCurp, beneficiarios, loading, error, onConsumedOpenEditCurp])

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-muted-foreground text-sm">Cargando…</p>
    </div>
  )

  if (error) return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-destructive text-sm">{error}</p>
    </div>
  )

  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <div className="flex flex-col gap-8 pb-8">

        <BeneficiariosTable
          filtered={filtered}
          conteos={conteos}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filtroEstatus={filtroEstatus}
          setFiltroEstatus={setFiltroEstatus}
          onNuevaAlta={() => setShowAltaDialog(true)}
          onVerDetalles={(b) => { setSelectedBeneficiario(b); setShowExpedienteDialog(true) }}
          onVerCredencial={(b) => setCredencialBeneficiario(b)}
        />

        <BeneficiarioDetailPanel
          selectedBeneficiario={selectedBeneficiario}
          showExpedienteDialog={showExpedienteDialog}
          setShowExpedienteDialog={setShowExpedienteDialog}
          onEdit={(b) => openEdit(b)}
        />

        <BeneficiarioFormDialog
          showAltaDialog={showAltaDialog}
          setShowAltaDialog={setShowAltaDialog}
          isSaving={isSaving}
          saveError={saveError}
          altaForm={altaForm}
          altaErrors={altaErrors}
          handleAltaChange={handleAltaChange}
          handleAltaSubmit={handleAltaSubmit}
          altaFotoPreview={altaFotoPreview}
          handleAltaFotoSelected={handleAltaFotoSelected}
          credencialBeneficiario={credencialBeneficiario}
          setCredencialBeneficiario={setCredencialBeneficiario}
        />

        <BeneficiariosEditDialog
          showEditDialog={showEditDialog}
          setShowEditDialog={setShowEditDialog}
          isSaving={isSaving}
          overlayAction={overlayAction}
          setOverlayAction={setOverlayAction}
          handleDarDeBaja={handleDarDeBaja}
          handleEditDelete={handleEditDelete}
          editForm={editForm}
          handleEditChange={handleEditChange}
          editErrors={editErrors}
          saveError={saveError}
          setSaveError={setSaveError}
          handleSaveEdit={handleSaveEdit}
          selectedBeneficiario={selectedBeneficiario}
          setSelectedBeneficiario={setSelectedBeneficiario}
          beneficiarios={beneficiarios}
          fotoUploading={fotoUploading}
          editFotoPreview={editFotoPreview}
          handleEditFotoSelected={handleEditFotoSelected}
          handleDeleteFotoBeneficiario={handleDeleteFotoBeneficiario}
          removeFotoConfirmOpen={removeFotoConfirmOpen}
          setRemoveFotoConfirmOpen={setRemoveFotoConfirmOpen}
          setShowExpedienteDialog={setShowExpedienteDialog}
        />

      </div>
    </TooltipPrimitive.Provider>
  )
}
