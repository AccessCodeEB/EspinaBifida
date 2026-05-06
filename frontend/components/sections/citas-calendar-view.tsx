"use client"
import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { ChevronLeft, ChevronRight, CalendarDays, X, Check, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { updateEstatusCita, type Cita } from "@/services/citas"

// ─── Grid config ──────────────────────────────────────────────────────────────
const GRID_START   = 7    // 07:00
const GRID_END     = 22   // 22:00
const WORK_START   = 8    // disabled before this
const WORK_END     = 20   // disabled after this
const CELL_H       = 64   // px per hour — bigger = more readable
const TOTAL_HOURS  = GRID_END - GRID_START
const GRID_H       = CELL_H * TOTAL_HOURS   // 960px
const HOURS        = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => i + GRID_START)
const DEFAULT_MINS = 60   // assumed appointment duration

// ─── Palettes ─────────────────────────────────────────────────────────────────
const BORDER_L: Record<string, string> = {
  Confirmada: "border-l-emerald-400", Pendiente: "border-l-amber-400",
  Completada: "border-l-sky-400",     Cancelada: "border-l-red-400",
}
const BG_MUTED: Record<string, string> = {
  Confirmada: "bg-emerald-500/10", Pendiente: "bg-amber-500/10",
  Completada: "bg-sky-500/10",    Cancelada: "bg-red-500/10",
}
const DOT_COLOR: Record<string, string> = {
  Confirmada: "bg-emerald-400", Pendiente: "bg-amber-400",
  Completada: "bg-sky-400",     Cancelada: "bg-red-400",
}
const TEXT_COLOR: Record<string, string> = {
  Confirmada: "text-emerald-300", Pendiente: "text-amber-300",
  Completada: "text-sky-300",     Cancelada: "text-red-300",
}

// ─── Locale ───────────────────────────────────────────────────────────────────
const DIAS_S = ["L","M","X","J","V","S","D"]
const DIAS_L = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"]
const MESES  = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sameDay(a:Date,b:Date){return a.getDate()===b.getDate()&&a.getMonth()===b.getMonth()&&a.getFullYear()===b.getFullYear()}
function getMondayOf(d:Date):Date{const c=new Date(d);c.setHours(0,0,0,0);const day=c.getDay();c.setDate(c.getDate()-(day===0?6:day-1));return c}
function getWeekFrom(mon:Date):Date[]{return Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d})}
function getDaysInMonth(y:number,m:number){return new Date(y,m+1,0).getDate()}
function getFirstDow(y:number,m:number){const d=new Date(y,m,1).getDay();return d===0?6:d-1}
function toMins(hora:string){const[h,m]=(hora||"08:00").split(":").map(Number);return h*60+m}
function snapTo30(m:number){return Math.round(m/30)*30}

/** top in px from grid top */
function minsToTop(mins:number):number{return((mins-GRID_START*60)/60)*CELL_H}
/** height in px */
function durToH(mins:number):number{return(mins/60)*CELL_H}

function citasForDay(list:Cita[],y:number,m:number,d:number):Cita[]{
  return list.filter(c=>{
    if(!c.fecha)return false
    const dt=new Date(c.fecha+"T12:00:00")
    return dt.getFullYear()===y&&dt.getMonth()===m&&dt.getDate()===d
  }).sort((a,b)=>(a.hora||"").localeCompare(b.hora||""))
}

// ─── Overlap layout (Google Calendar column algorithm) ────────────────────────
interface LayoutItem{cita:Cita;top:number;height:number;left:number;widthPct:number}

function computeLayout(dayCitas:Cita[]):LayoutItem[]{
  if(!dayCitas.length)return[]
  const items=dayCitas.map(c=>({
    cita:c,
    s:snapTo30(toMins(c.hora||"08:00")),
    e:snapTo30(toMins(c.hora||"08:00"))+DEFAULT_MINS,
  }))
  // assign columns
  const cols:number[]=items.map(()=>-1)
  const colEnds:number[]=[]
  for(let i=0;i<items.length;i++){
    let placed=false
    for(let ci=0;ci<colEnds.length;ci++){
      if(colEnds[ci]<=items[i].s){cols[i]=ci;colEnds[ci]=items[i].e;placed=true;break}
    }
    if(!placed){cols[i]=colEnds.length;colEnds.push(items[i].e)}
  }
  const totalCols=colEnds.length
  return items.map((it,i)=>({
    cita:it.cita,
    top:Math.max(0,minsToTop(it.s)),
    height:Math.max(durToH(DEFAULT_MINS),28),
    left:(cols[i]/totalCols)*100,
    widthPct:(1/totalCols)*100,
  }))
}

// ─── Doctor conflict validator ─────────────────────────────────────────────────
export function validateSlot(citas:Cita[],fecha:string,hora:string,especialista:string):string|null{
  const s=snapTo30(toMins(hora))
  const e=s+DEFAULT_MINS
  const hStart=s/60
  if(hStart<WORK_START||hStart>=WORK_END)return`Horario fuera del rango permitido (${WORK_START}:00–${WORK_END}:00)`
  if(!especialista)return null
  const conflicts=citas.filter(c=>c.fecha===fecha&&c.especialista===especialista&&c.estatus!=="Cancelada")
  for(const c of conflicts){
    const cs=snapTo30(toMins(c.hora));const ce=cs+DEFAULT_MINS
    if(s<ce&&e>cs)return`Horario ocupado por ${especialista}`
  }
  return null
}

// ─── Current time indicator ───────────────────────────────────────────────────
function NowLine(){
  const[now,setNow]=useState(()=>new Date())
  const ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    ref.current?.scrollIntoView({behavior:"smooth",block:"center"})
    const id=setInterval(()=>setNow(new Date()),60_000)
    return()=>clearInterval(id)
  },[])
  // exact px from GRID_START
  const top=minsToTop(now.getHours()*60+now.getMinutes())
  if(top<0||top>GRID_H)return null
  return(
    <div ref={ref} className="absolute left-0 right-0 z-30 pointer-events-none flex items-center" style={{top:`${top}px`}}>
      <span className="size-2.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_8px_2px_rgba(59,130,246,0.6)]"/>
      <div className="h-[1.5px] flex-1 bg-blue-500/80"/>
    </div>
  )
}

// ─── Popover (click-based) ────────────────────────────────────────────────────
function CitaPopover({cita,onClose,onAction,updatingId}:{
  cita:Cita;onClose:()=>void
  onAction:(id:number,e:Cita["estatus"])=>void
  updatingId:number|null
}){
  const dot=DOT_COLOR[cita.estatus]??"bg-slate-400"
  const tc=TEXT_COLOR[cita.estatus]??"text-slate-300"
  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:items-start sm:justify-start" onClick={onClose}>
      <div
        className="relative m-4 sm:m-0 sm:absolute bg-[#0f172a]/98 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl w-72 p-4 space-y-3"
        style={{boxShadow:"0 16px 48px rgba(0,0,0,0.7)"}}
        onClick={e=>e.stopPropagation()}
      >
        <button className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors" onClick={onClose}>
          <X className="size-4"/>
        </button>
        {/* Status header */}
        <div className="flex items-center gap-2">
          <span className={`size-2.5 rounded-full ${dot}`}/>
          <span className={`text-sm font-bold ${tc}`}>{cita.hora}</span>
          <span className="ml-auto text-[10px] rounded-full border border-border/50 px-2 py-px text-muted-foreground">{cita.estatus}</span>
        </div>
        {/* Patient */}
        <div>
          <p className="font-bold text-foreground leading-snug">{cita.beneficiario}</p>
          {cita.especialista&&<p className="text-xs text-muted-foreground mt-0.5">{cita.especialista}</p>}
        </div>
        {cita.notas&&<p className="text-xs italic text-muted-foreground/70 border-t border-border/30 pt-2">"{cita.notas}"</p>}
        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {cita.estatus==="Pendiente"&&<>
            <Button size="sm" className="h-7 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={updatingId===cita.id} onClick={()=>onAction(cita.id,"Confirmada")}>
              <Check className="size-3 mr-1"/>Confirmar
            </Button>
            <Button size="sm" variant="destructive" className="h-7 text-xs flex-1"
              disabled={updatingId===cita.id} onClick={()=>onAction(cita.id,"Cancelada")}>
              <X className="size-3 mr-1"/>Cancelar
            </Button>
          </>}
          {cita.estatus==="Confirmada"&&<>
            <Button size="sm" className="h-7 text-xs flex-1 bg-sky-600 hover:bg-sky-700"
              disabled={updatingId===cita.id} onClick={()=>onAction(cita.id,"Completada")}>
              Completar
            </Button>
            <Button size="sm" variant="destructive" className="h-7 text-xs flex-1"
              disabled={updatingId===cita.id} onClick={()=>onAction(cita.id,"Cancelada")}>
              <X className="size-3 mr-1"/>Cancelar
            </Button>
          </>}
        </div>
      </div>
    </div>
  )
}

// ─── Appointment block (click → popover) ──────────────────────────────────────
function AppBlock({cita,height,widthPct,left,onSelect}:{
  cita:Cita;height:number;widthPct:number;left:number;onSelect:(c:Cita)=>void
}){
  const border=BORDER_L[cita.estatus]??"border-l-slate-500"
  const bg=BG_MUTED[cita.estatus]??"bg-slate-500/10"
  const tc=TEXT_COLOR[cita.estatus]??"text-slate-300"
  const dot=DOT_COLOR[cita.estatus]??"bg-slate-400"
  const showName=height>=40
  return(
    <div
      className={`absolute cursor-pointer rounded-r-md border-l-4 border-t border-b border-r border-border/20 ${border} ${bg}
        px-1.5 py-1 overflow-hidden select-none hover:brightness-125 transition-all`}
      style={{top:0,left:0,width:"100%",height:"100%"}}
      onClick={e=>{e.stopPropagation();onSelect(cita)}}
    >
      <div className={`flex items-center gap-1 text-[11px] font-semibold ${tc} leading-none`}>
        <span className={`size-1.5 rounded-full shrink-0 ${dot}`}/>
        <span className="truncate">{cita.hora}</span>
      </div>
      {showName&&<p className="text-[10px] text-foreground/70 truncate mt-0.5 leading-tight">{cita.beneficiario}</p>}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props{citas:Cita[];onReload:()=>void;stats:{hoy:number;semana:number;pendientes:number}}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function CitasCalendarView({citas,onReload,stats}:Props){
  const todayRef=useMemo(()=>{const d=new Date();d.setHours(0,0,0,0);return d},[])
  const[weekAnchor,setWeekAnchor]=useState<Date>(()=>getMondayOf(new Date()))
  const[calYear,setCalYear]=useState(()=>new Date().getFullYear())
  const[calMonth,setCalMonth]=useState(()=>new Date().getMonth())
  const[selectedCita,setSelectedCita]=useState<Cita|null>(null)
  const[updatingId,setUpdatingId]=useState<number|null>(null)

  const weekDates=useMemo(()=>getWeekFrom(weekAnchor),[weekAnchor])
  const isThisWeek=weekDates.some(d=>sameDay(d,todayRef))

  function prevMonth(){if(calMonth===0){setCalYear(y=>y-1);setCalMonth(11)}else setCalMonth(m=>m-1)}
  function nextMonth(){if(calMonth===11){setCalYear(y=>y+1);setCalMonth(0)}else setCalMonth(m=>m+1)}

  function handleDayClick(d:Date){
    setWeekAnchor(getMondayOf(d));setCalYear(d.getFullYear());setCalMonth(d.getMonth())
  }

  // Mini-cal: full rows with prev/next overflow days
  const miniCells=useMemo(()=>{
    const fd=getFirstDow(calYear,calMonth)
    const dim=getDaysInMonth(calYear,calMonth)
    const cells:{date:Date;out:boolean}[]=[]
    for(let i=fd-1;i>=0;i--){const d=new Date(calYear,calMonth,0-i);cells.push({date:d,out:true})}
    for(let i=1;i<=dim;i++)cells.push({date:new Date(calYear,calMonth,i),out:false})
    let nd=1
    while(cells.length%7!==0)cells.push({date:new Date(calYear,calMonth+1,nd++),out:true})
    return cells
  },[calYear,calMonth])

  const citasSemana=useMemo(()=>
    weekDates.map(d=>({date:d,layout:computeLayout(citasForDay(citas,d.getFullYear(),d.getMonth(),d.getDate()))}))
  ,[citas,weekDates])

  async function doUpdate(id:number,estatus:Cita["estatus"]){
    setUpdatingId(id)
    try{
      await updateEstatusCita(id,estatus)
      toast.success(`Cita marcada como ${estatus}`)
      onReload();setSelectedCita(null)
    }catch{toast.error("No se pudo actualizar.")}
    finally{setUpdatingId(null)}
  }

  return(
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">

      {/* ── LEFT ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-border/50 bg-card p-3">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth} className="rounded-lg p-1 hover:bg-muted transition-colors"><ChevronLeft className="size-4"/></button>
            <span className="text-xs font-bold">{MESES[calMonth]} {calYear}</span>
            <button onClick={nextMonth} className="rounded-lg p-1 hover:bg-muted transition-colors"><ChevronRight className="size-4"/></button>
          </div>
          <div className="grid grid-cols-7 text-center mb-1">
            {DIAS_S.map(d=><span key={d} className="text-[9px] font-semibold text-muted-foreground">{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {miniCells.map(({date,out},idx)=>{
              const dc=citasForDay(citas,date.getFullYear(),date.getMonth(),date.getDate())
              const dotCount=Math.min(dc.length,3)
              const inWeek=weekDates.some(w=>sameDay(w,date))
              const isToday=sameDay(date,todayRef)
              return(
                <div key={idx} className="flex flex-col items-center gap-px">
                  <button
                    onClick={()=>handleDayClick(date)}
                    className={`flex size-6 items-center justify-center rounded-full text-[11px] font-medium transition-all
                      ${out?"text-muted-foreground/25 hover:bg-muted/30"
                        :isToday?"bg-primary text-primary-foreground shadow-sm"
                        :inWeek?"bg-primary/20 text-primary"
                        :"text-foreground hover:bg-muted"}`}
                  >{date.getDate()}</button>
                  {/* 1-3 dots, subtle primary */}
                  <div className="flex gap-px h-1.5 items-center">
                    {!out&&Array.from({length:dotCount}).map((_,i)=>(
                      <span key={i} className={`size-1 rounded-full ${isToday?"bg-primary-foreground/80":"bg-primary/50"}`}/>
                    ))}
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
            {label:"Hoy",val:stats.hoy,color:"text-foreground"},
            {label:"Esta semana",val:stats.semana,color:"text-primary"},
            {label:"Pendientes",val:stats.pendientes,color:"text-amber-400"},
          ].map(({label,val,color})=>(
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className={`text-xl font-bold tabular-nums ${color}`}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT ────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden flex flex-col">
        {/* Week nav */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary"/>
            <span className="text-sm font-semibold">
              {weekDates[0].getDate()} – {weekDates[6].getDate()} {MESES[weekDates[6].getMonth()]} {weekDates[6].getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={()=>setWeekAnchor(w=>{const p=new Date(w);p.setDate(w.getDate()-7);return p})} className="rounded-lg p-1.5 hover:bg-muted transition-colors"><ChevronLeft className="size-4"/></button>
            <button onClick={()=>{const m=getMondayOf(new Date());setWeekAnchor(m);setCalYear(m.getFullYear());setCalMonth(m.getMonth())}} className="rounded-lg px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors">Hoy</button>
            <button onClick={()=>setWeekAnchor(w=>{const n=new Date(w);n.setDate(w.getDate()+7);return n})} className="rounded-lg p-1.5 hover:bg-muted transition-colors"><ChevronRight className="size-4"/></button>
          </div>
        </div>

        {/* Day-of-week header row */}
        <div className="flex border-b border-border/30 shrink-0">
          <div className="w-14 shrink-0"/>
          {citasSemana.map(({date},ci)=>{
            const isToday=sameDay(date,todayRef)
            return(
              <div key={ci} className={`flex-1 flex flex-col items-center py-2 cursor-pointer hover:bg-muted/30 transition-colors
                ${isToday?"bg-primary/10":""}`} onClick={()=>handleDayClick(date)}>
                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">{DIAS_L[ci]}</span>
                <span className={`mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-bold
                  ${isToday?"bg-primary text-primary-foreground":"text-foreground"}`}>{date.getDate()}</span>
              </div>
            )
          })}
        </div>

        {/* Scrollable grid */}
        <div className="flex flex-1 overflow-y-auto" style={{maxHeight:"calc(100vh - 240px)"}}>
          {/* Hour labels */}
          <div className="w-14 shrink-0 relative border-r border-border/20" style={{height:`${GRID_H}px`}}>
            {HOURS.slice(0,-1).map((h,i)=>(
              <div key={h} className="absolute right-2 text-[10px] text-muted-foreground/50 font-medium"
                style={{top:`${i*CELL_H-7}px`}}>
                {String(h).padStart(2,"0")}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex-1 flex">
            {citasSemana.map(({date,layout},ci)=>{
              const isToday=sameDay(date,todayRef)
              return(
                <div key={ci} className={`flex-1 relative border-r border-border/15 last:border-r-0 ${isToday?"bg-primary/[0.025]":""}`}
                  style={{height:`${GRID_H}px`}}>
                  {/* Hour grid lines */}
                  {HOURS.slice(0,-1).map((h,i)=>{
                    const disabled=h<WORK_START||h>=WORK_END
                    return(
                      <div key={h} className={`absolute left-0 right-0 border-t border-border/15 ${disabled?"bg-muted/10":""}`}
                        style={{top:`${i*CELL_H}px`,height:`${CELL_H}px`}}>
                        <div className="absolute left-0 right-0 border-t border-border/[0.06]" style={{top:"50%"}}/>
                      </div>
                    )
                  })}

                  {/* Current time — only on today */}
                  {isToday&&isThisWeek&&<NowLine/>}

                  {/* Appointments — absolute positioned */}
                  {layout.map(({cita,top,height,left,widthPct})=>(
                    <div key={cita.id} className="absolute px-0.5"
                      style={{top:`${top}px`,height:`${height}px`,left:`${left}%`,width:`${widthPct}%`}}>
                      <AppBlock cita={cita} height={height} widthPct={widthPct} left={left} onSelect={setSelectedCita}/>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Popover ─────────────────────────────────────────────────────── */}
      {selectedCita&&(
        <CitaPopover cita={selectedCita} updatingId={updatingId}
          onClose={()=>setSelectedCita(null)}
          onAction={doUpdate}/>
      )}
    </div>
  )
}
