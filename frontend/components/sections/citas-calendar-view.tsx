"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { updateEstatusCita, type Cita } from "@/services/citas"

// ─── Grid constants ───────────────────────────────────────────────────────────
const WORK_START   = 8    // visible work hours start (08:00)
const WORK_END     = 20   // visible work hours end   (20:00)
const GRID_START   = 7    // grid starts one hour before work
const GRID_END     = 22   // grid ends two hours after work
const CELL_H       = 48   // px per hour
const TOTAL_HOURS  = GRID_END - GRID_START
const GRID_H       = CELL_H * TOTAL_HOURS
const HOURS        = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => i + GRID_START)

// ─── Status palette — clean, left-border style ────────────────────────────────
const S_BORDER: Record<string, string> = {
  Confirmada: "border-l-emerald-400",
  Pendiente:  "border-l-amber-400",
  Completada: "border-l-sky-400",
  Cancelada:  "border-l-red-400",
}
const S_DOT: Record<string, string> = {
  Confirmada: "bg-emerald-400",
  Pendiente:  "bg-amber-400",
  Completada: "bg-sky-400",
  Cancelada:  "bg-red-400",
}
const S_TEXT: Record<string, string> = {
  Confirmada: "text-emerald-400",
  Pendiente:  "text-amber-400",
  Completada: "text-sky-400",
  Cancelada:  "text-red-400",
}

// ─── Locale constants ─────────────────────────────────────────────────────────
const DIAS_CORTO = ["L","M","X","J","V","S","D"]
const DIAS_LARGO = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"]
const MESES      = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sameDay(a: Date, b: Date) {
  return a.getDate()===b.getDate() && a.getMonth()===b.getMonth() && a.getFullYear()===b.getFullYear()
}
function getMondayOf(d: Date): Date {
  const c = new Date(d); c.setHours(0,0,0,0)
  const day = c.getDay(); c.setDate(c.getDate() - (day===0?6:day-1)); return c
}
function getWeekFrom(mon: Date): Date[] {
  return Array.from({length:7},(_,i)=>{ const d=new Date(mon); d.setDate(mon.getDate()+i); return d })
}
function getDaysInMonth(y:number,m:number){ return new Date(y,m+1,0).getDate() }
function getFirstDayOfWeek(y:number,m:number){ const d=new Date(y,m,1).getDay(); return d===0?6:d-1 }

function toMinutes(hora: string){ const [h,m]=(hora||"08:00").split(":").map(Number); return h*60+m }

/** Snap minutes to nearest 30-min slot */
function snapTo30(mins: number){ return Math.round(mins/30)*30 }

function timeToTop(hora: string): number {
  const mins = toMinutes(hora)
  return ((mins - GRID_START*60) / 60) * CELL_H
}

function citasForDay(list: Cita[], y:number, m:number, d:number){
  return list.filter(c=>{
    if(!c.fecha) return false
    const dt=new Date(c.fecha+"T12:00:00")
    return dt.getFullYear()===y && dt.getMonth()===m && dt.getDate()===d
  }).sort((a,b)=>(a.hora||"").localeCompare(b.hora||""))
}

// ─── Overlap layout (Google Calendar style) ───────────────────────────────────
const DEFAULT_DURATION = 30 // minutes

interface LayoutItem {
  cita: Cita; top: number; height: number; left: number; width: number
}

function computeLayout(dayCitas: Cita[]): LayoutItem[] {
  const items = dayCitas.map(c => ({
    cita: c,
    start: snapTo30(toMinutes(c.hora||"08:00")),
    end:   snapTo30(toMinutes(c.hora||"08:00")) + DEFAULT_DURATION,
  }))
  const columns: (typeof items[0])[][] = []
  for (const item of items) {
    let placed = false
    for (const col of columns) {
      if (col[col.length-1].end <= item.start) { col.push(item); placed=true; break }
    }
    if (!placed) columns.push([item])
  }
  const totalCols = columns.length
  const result: LayoutItem[] = []
  columns.forEach((col, ci) => {
    col.forEach(item => {
      const top    = ((item.start - GRID_START*60)/60)*CELL_H
      const height = Math.max(((item.end - item.start)/60)*CELL_H, 24)
      result.push({ cita:item.cita, top, height, left:(ci/totalCols)*100, width:(1/totalCols)*100 })
    })
  })
  return result
}

// ─── Validate new appointment (same-doctor block) ─────────────────────────────
function validateSlot(citas: Cita[], fecha: string, hora: string, especialista: string): string|null {
  const newStart = snapTo30(toMinutes(hora))
  const newEnd   = newStart + DEFAULT_DURATION
  const h = newStart / 60
  if (h < WORK_START || h >= WORK_END) return `Horario fuera del rango permitido (${WORK_START}:00–${WORK_END}:00)`
  if (!especialista) return null
  const dayC = citas.filter(c=>c.fecha===fecha && c.especialista===especialista && c.estatus!=="Cancelada")
  for (const c of dayC) {
    const s = snapTo30(toMinutes(c.hora))
    const e = s + DEFAULT_DURATION
    if (newStart < e && newEnd > s) return `Horario ocupado por ${especialista}`
  }
  return null
}

// ─── CurrentTimeLine ──────────────────────────────────────────────────────────
function CurrentTimeLine() {
  const [now, setNow] = useState(()=>new Date())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(()=>{
    ref.current?.scrollIntoView({behavior:"smooth",block:"center"})
    const id = setInterval(()=>setNow(new Date()),30_000)
    return ()=>clearInterval(id)
  },[])

  // FIX #4: exact px position from grid top
  const mins = now.getHours()*60 + now.getMinutes()
  const top  = ((mins - GRID_START*60)/60)*CELL_H
  if (top<0||top>GRID_H) return null

  return (
    <div ref={ref} className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
      style={{top:`${top}px`}}>
      <span className="size-2.5 rounded-full bg-primary shrink-0 shadow-[0_0_6px_2px_rgba(99,102,241,0.6)]"/>
      <div className="h-px flex-1 bg-primary/80"/>
    </div>
  )
}

// ─── AppCard ─────────────────────────────────────────────────────────────────
function AppCard({ cita, height, onAction, updatingId }:{
  cita:Cita; height:number
  onAction:(id:number,estatus:Cita["estatus"])=>void
  updatingId:number|null
}){
  const [open,setOpen]=useState(false)
  const border = S_BORDER[cita.estatus] ?? "border-l-slate-500"
  const dot    = S_DOT[cita.estatus]   ?? "bg-slate-400"
  const stText = S_TEXT[cita.estatus]  ?? "text-slate-400"
  const compact = height < 36

  return (
    <div className="relative w-full h-full group" style={{zIndex:open?50:1}}
      onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}>

      {/* ── Compact card: clean transparent bg + left border accent ── */}
      <div className={`w-full h-full rounded-r-md border border-border/30 border-l-4 ${border}
        bg-[#0f172a]/80 backdrop-blur-sm px-2 py-1 text-[11px] leading-tight overflow-hidden cursor-pointer
        transition-opacity duration-150 ${open?"opacity-0 pointer-events-none":"opacity-100"}
        hover:bg-[#1e293b]/90`}>
        <div className={`flex items-center gap-1.5 font-semibold ${stText}`}>
          <span className={`size-1.5 rounded-full shrink-0 ${dot}`}/>
          {cita.hora}
        </div>
        {!compact&&<p className="text-foreground/80 truncate mt-0.5 text-[10px]">{cita.beneficiario}</p>}
      </div>

      {/* ── Pop-out expanded (glassmorphism) ── */}
      {open&&(
        <div className={`absolute left-0 top-0 z-50 min-w-[200px] max-w-[240px] rounded-r-xl
          rounded-tl-none rounded-bl-none border border-border/40 border-l-4 ${border}
          bg-[#0f172a]/95 backdrop-blur-xl shadow-2xl text-xs
          animate-in fade-in zoom-in-95 duration-150`}
          style={{boxShadow:"0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)"}}
          onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}>
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${dot}`}/>
              <span className={`font-bold text-sm ${stText}`}>{cita.hora}</span>
              <span className="ml-auto rounded-full border border-border/40 px-1.5 py-px text-[9px] font-medium text-muted-foreground">
                {cita.estatus}
              </span>
            </div>
            <p className="font-semibold text-foreground leading-snug">{cita.beneficiario}</p>
            {cita.especialista&&<p className="text-muted-foreground text-[10px]">{cita.especialista}</p>}
            {cita.notas&&<p className="italic text-muted-foreground/60 text-[10px] border-t border-border/30 pt-2">"{cita.notas}"</p>}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {cita.estatus==="Pendiente"&&<>
                <ABtn label="Confirmar" color="emerald" disabled={updatingId===cita.id} onClick={()=>onAction(cita.id,"Confirmada")}/>
                <ABtn label="Cancelar"  color="red"     disabled={updatingId===cita.id} onClick={()=>onAction(cita.id,"Cancelada")}/>
              </>}
              {cita.estatus==="Confirmada"&&<>
                <ABtn label="Completar" color="sky"  disabled={updatingId===cita.id} onClick={()=>onAction(cita.id,"Completada")}/>
                <ABtn label="Cancelar"  color="red"  disabled={updatingId===cita.id} onClick={()=>onAction(cita.id,"Cancelada")}/>
              </>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ABtn({label,color,onClick,disabled}:{label:string;color:string;onClick:()=>void;disabled:boolean}){
  const c:Record<string,string>={
    emerald:"bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30",
    red:    "bg-red-500/20     text-red-300     border-red-500/40     hover:bg-red-500/30",
    sky:    "bg-sky-500/20     text-sky-300     border-sky-500/40     hover:bg-sky-500/30",
  }
  return(
    <button disabled={disabled} onClick={e=>{e.stopPropagation();onClick()}}
      className={`rounded border px-2 py-0.5 text-[10px] font-semibold transition-colors disabled:opacity-40 ${c[color]}`}>
      {label}
    </button>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  citas: Cita[]
  onReload: ()=>void
  stats: {hoy:number;semana:number;pendientes:number}
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function CitasCalendarView({citas,onReload,stats}:Props){
  const [weekAnchor,setWeekAnchor]=useState<Date>(()=>getMondayOf(new Date()))
  const [calYear,setCalYear]     =useState(()=>new Date().getFullYear())
  const [calMonth,setCalMonth]   =useState(()=>new Date().getMonth())
  const today=useMemo(()=>{const d=new Date();d.setHours(0,0,0,0);return d},[])

  const weekDates=useMemo(()=>getWeekFrom(weekAnchor),[weekAnchor])
  const isThisWeek=weekDates.some(d=>sameDay(d,today))

  function prevMonth(){if(calMonth===0){setCalYear(y=>y-1);setCalMonth(11)}else setCalMonth(m=>m-1)}
  function nextMonth(){if(calMonth===11){setCalYear(y=>y+1);setCalMonth(0)}else setCalMonth(m=>m+1)}

  function handleDayClick(d:Date){
    setWeekAnchor(getMondayOf(d)); setCalYear(d.getFullYear()); setCalMonth(d.getMonth())
  }

  // ── Build mini-cal grid with overflow days (PART 1 #1) ──────────────────────
  const miniCalCells = useMemo(()=>{
    const firstDay = getFirstDayOfWeek(calYear,calMonth)
    const daysInMonth = getDaysInMonth(calYear,calMonth)
    const prevDays = getDaysInMonth(calYear,calMonth===0?11:calMonth-1)
    const cells: {date:Date;outOfMonth:boolean}[] = []

    // Fill leading days from previous month
    for(let i=firstDay-1;i>=0;i--){
      const d=new Date(calYear,calMonth,0-i)
      cells.push({date:d,outOfMonth:true})
    }
    // Current month
    for(let i=1;i<=daysInMonth;i++) cells.push({date:new Date(calYear,calMonth,i),outOfMonth:false})
    // Trailing days to fill last row (always complete 6 rows = 42 cells)
    let nextDay=1
    while(cells.length%7!==0) cells.push({date:new Date(calYear,calMonth+1,nextDay++),outOfMonth:true})

    return cells
  },[calYear,calMonth])

  const citasSemana=useMemo(()=>
    weekDates.map(d=>({
      date:d,
      items:computeLayout(citasForDay(citas,d.getFullYear(),d.getMonth(),d.getDate()))
    })),[citas,weekDates])

  const [updatingId,setUpdatingId]=useState<number|null>(null)
  const [confirmPending,setConfirmPending]=useState<{id:number;estatus:Cita["estatus"];name:string}|null>(null)

  async function doUpdate(id:number,estatus:Cita["estatus"]){
    setUpdatingId(id)
    try{
      await updateEstatusCita(id,estatus)
      toast.success(`Cita marcada como ${estatus}`)
      onReload(); setConfirmPending(null)
    }catch{toast.error("No se pudo actualizar el estatus.")}
    finally{setUpdatingId(null)}
  }

  return(
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">

      {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">

        {/* Mini-calendar */}
        <div className="rounded-2xl border border-border/50 bg-card p-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth} className="rounded-lg p-1 hover:bg-muted transition-colors"><ChevronLeft className="size-4"/></button>
            <span className="text-xs font-bold">{MESES[calMonth]} {calYear}</span>
            <button onClick={nextMonth} className="rounded-lg p-1 hover:bg-muted transition-colors"><ChevronRight className="size-4"/></button>
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 text-center mb-1">
            {DIAS_CORTO.map(d=><span key={d} className="text-[9px] font-semibold text-muted-foreground">{d}</span>)}
          </div>
          {/* PART 1 #1 — full rows with overflow days */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {miniCalCells.map(({date,outOfMonth},idx)=>{
              const dayCitas=citasForDay(citas,date.getFullYear(),date.getMonth(),date.getDate())
              const hasActivity=dayCitas.length>0
              const isInWeek=weekDates.some(w=>sameDay(w,date))
              const isToday=sameDay(date,today)
              return(
                <div key={idx} className="flex flex-col items-center">
                  <button
                    onClick={()=>handleDayClick(date)}
                    className={`flex size-6 items-center justify-center rounded-full text-[11px] font-medium transition-all
                      ${outOfMonth?"text-muted-foreground/30 hover:bg-muted/50"
                        :isToday?"bg-primary text-primary-foreground shadow-sm"
                        :isInWeek?"bg-primary/20 text-primary"
                        :"text-foreground hover:bg-muted"}`}
                  >{date.getDate()}</button>
                  {/* PART 1 #2 — subtle single-color dot (primary/teal) */}
                  <div className="h-1.5 flex items-center justify-center">
                    {hasActivity&&!outOfMonth&&(
                      <span className={`size-1 rounded-full ${isToday?"bg-primary-foreground":"bg-primary/60"}`}/>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Résumen */}
        <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Resumen</p>
          {[
            {label:"Hoy",         val:stats.hoy,        color:"text-foreground"},
            {label:"Esta semana", val:stats.semana,     color:"text-primary"},
            {label:"Pendientes",  val:stats.pendientes, color:"text-amber-400"},
          ].map(({label,val,color})=>(
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className={`text-xl font-bold tabular-nums ${color}`}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden flex flex-col min-h-0">
        {/* Week nav */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary"/>
            <span className="text-sm font-semibold">
              {weekDates[0].getDate()} – {weekDates[6].getDate()} {MESES[weekDates[6].getMonth()]} {weekDates[6].getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={()=>setWeekAnchor(w=>{const p=new Date(w);p.setDate(w.getDate()-7);return p})}
              className="rounded-lg p-1.5 hover:bg-muted transition-colors"><ChevronLeft className="size-4"/></button>
            <button onClick={()=>{const m=getMondayOf(new Date());setWeekAnchor(m);setCalYear(m.getFullYear());setCalMonth(m.getMonth())}}
              className="rounded-lg px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors">Hoy</button>
            <button onClick={()=>setWeekAnchor(w=>{const n=new Date(w);n.setDate(w.getDate()+7);return n})}
              className="rounded-lg p-1.5 hover:bg-muted transition-colors"><ChevronRight className="size-4"/></button>
          </div>
        </div>

        {/* Scrollable grid */}
        <div className="flex flex-1 overflow-y-auto" style={{maxHeight:"calc(100vh - 220px)"}}>

          {/* Hours column */}
          <div className="shrink-0 w-14 border-r border-border/30 relative bg-card" style={{height:`${GRID_H}px`}}>
            {HOURS.slice(0,-1).map((h,i)=>(
              <div key={h} className="absolute right-2 text-[10px] text-muted-foreground/50 font-medium leading-none"
                style={{top:`${i*CELL_H-6}px`}}>
                {String(h).padStart(2,"0")}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex-1 grid" style={{gridTemplateColumns:`repeat(7,minmax(0,1fr))`}}>
            {citasSemana.map(({date,items},colIdx)=>{
              const isToday=sameDay(date,today)
              return(
                <div key={colIdx} className={`flex flex-col border-r border-border/20 last:border-r-0 ${isToday?"bg-primary/[0.03]":""}`}>
                  {/* Day header */}
                  <div className={`sticky top-0 z-10 flex flex-col items-center py-2 border-b border-border/30 cursor-pointer shrink-0
                    ${isToday?"bg-primary/10":"bg-card"}`} onClick={()=>handleDayClick(date)}>
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">{DIAS_LARGO[colIdx]}</span>
                    <span className={`mt-0.5 flex size-6 items-center justify-center rounded-full text-xs font-bold
                      ${isToday?"bg-primary text-primary-foreground":"text-foreground"}`}>{date.getDate()}</span>
                  </div>

                  {/* Timed body */}
                  <div className="relative" style={{height:`${GRID_H}px`}}>
                    {/* Hour lines + disabled zones (PART 2 #1) */}
                    {HOURS.slice(0,-1).map((h,i)=>{
                      const disabled = h<WORK_START||h>=WORK_END
                      return(
                        <div key={h}>
                          <div className={`absolute left-0 right-0 border-t border-border/15 ${disabled?"bg-muted/10":""}`}
                            style={{top:`${i*CELL_H}px`,height:`${CELL_H}px`}}/>
                          {/* Half-hour line */}
                          <div className="absolute left-0 right-0 border-t border-border/[0.06]"
                            style={{top:`${i*CELL_H+CELL_H/2}px`}}/>
                          {/* Disabled stripe */}
                          {disabled&&(
                            <div className="absolute left-0 right-0 bg-muted/[0.12] pointer-events-none"
                              style={{top:`${i*CELL_H}px`,height:`${CELL_H}px`}}/>
                          )}
                        </div>
                      )
                    })}

                    {/* Current time (PART 1 #4 — fixed calculation) */}
                    {isToday&&isThisWeek&&<CurrentTimeLine/>}

                    {/* Appointments */}
                    {items.map(({cita,top,height,left,width})=>(
                      <div key={cita.id} className="absolute px-px"
                        style={{top:`${top}px`,height:`${height}px`,left:`${left}%`,width:`${width}%`}}>
                        <AppCard cita={cita} height={height} updatingId={updatingId}
                          onAction={(id,estatus)=>setConfirmPending({id,estatus,name:cita.beneficiario})}/>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Confirm dialog ───────────────────────────────────────────────── */}
      {confirmPending&&(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl border border-border/60 bg-card shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-bold mb-2">Confirmar cambio</h3>
            <p className="text-sm text-muted-foreground mb-5">
              ¿Marcar la cita de <strong className="text-foreground">{confirmPending.name}</strong> como{" "}
              <strong className="text-foreground">{confirmPending.estatus}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={()=>setConfirmPending(null)} disabled={updatingId!==null}>Cancelar</Button>
              <Button size="sm" variant={confirmPending.estatus==="Cancelada"?"destructive":"default"}
                disabled={updatingId!==null} onClick={()=>doUpdate(confirmPending.id,confirmPending.estatus)}>
                {updatingId!==null?"Guardando...":"Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Export validator for use in the new-appointment dialog ──────────────────
export { validateSlot }
