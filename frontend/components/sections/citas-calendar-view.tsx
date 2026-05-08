"use client"
import { useState, useMemo, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, CalendarDays, X, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { updateEstatusCita, type Cita } from "@/services/citas"

const GRID_START=7,GRID_END=22,WORK_START=8,WORK_END=20
const CELL_H=64,TOTAL_H=GRID_END-GRID_START,GRID_H=CELL_H*TOTAL_H
const HOURS=Array.from({length:TOTAL_H+1},(_,i)=>i+GRID_START)
const DEFAULT_MINS=60
const DIAS_S=["L","M","X","J","V","S","D"]
const DIAS_L=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"]
const MESES=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

const BL:Record<string,string>={Confirmada:"border-l-emerald-400",Pendiente:"border-l-amber-400",Completada:"border-l-sky-400",Cancelada:"border-l-red-400"}
const BG:Record<string,string>={Confirmada:"bg-emerald-500/10",Pendiente:"bg-amber-500/10",Completada:"bg-sky-500/10",Cancelada:"bg-red-500/10"}
const DC:Record<string,string>={Confirmada:"bg-emerald-400",Pendiente:"bg-amber-400",Completada:"bg-sky-400",Cancelada:"bg-red-400"}
const TC:Record<string,string>={Confirmada:"text-emerald-300",Pendiente:"text-amber-300",Completada:"text-sky-300",Cancelada:"text-red-300"}

function sameDay(a:Date,b:Date){return a.getDate()===b.getDate()&&a.getMonth()===b.getMonth()&&a.getFullYear()===b.getFullYear()}
function getMon(d:Date):Date{const c=new Date(d);c.setHours(0,0,0,0);const day=c.getDay();c.setDate(c.getDate()-(day===0?6:day-1));return c}
function getWeek(mon:Date):Date[]{return Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d})}
function getDIM(y:number,m:number){return new Date(y,m+1,0).getDate()}
function getFDOW(y:number,m:number){const d=new Date(y,m,1).getDay();return d===0?6:d-1}
function toMins(h:string){const[hr,m]=(h||"08:00").split(":").map(Number);return hr*60+m}
function snap30(m:number){return Math.round(m/30)*30}
function minsToTop(m:number):number{return((m-GRID_START*60)/60)*CELL_H}
function durToH(m:number):number{return(m/60)*CELL_H}
function citasDay(list:Cita[],y:number,mo:number,d:number):Cita[]{
  return list.filter(c=>{if(!c.fecha)return false;const dt=new Date(c.fecha+"T12:00:00");return dt.getFullYear()===y&&dt.getMonth()===mo&&dt.getDate()===d})
    .sort((a,b)=>(a.hora||"").localeCompare(b.hora||""))
}

// ── Clustering algorithm (fixes width bug) ────────────────────────────────────
interface LItem{cita:Cita;top:number;height:number;left:number;widthPct:number}
type Item={cita:Cita;s:number;e:number}

function buildLayout(dayCitas:Cita[]):LItem[]{
  if(!dayCitas.length)return[]
  const items:Item[]=dayCitas.map(c=>({cita:c,s:snap30(toMins(c.hora||"08:00")),e:snap30(toMins(c.hora||"08:00"))+DEFAULT_MINS}))
  const visited=new Set<number>()
  const clusters:Item[][]=[]
  for(let i=0;i<items.length;i++){
    if(visited.has(i))continue
    const cluster:Item[]=[items[i]];visited.add(i)
    for(let j=i+1;j<items.length;j++){
      if(visited.has(j))continue
      if(cluster.some((c:Item)=>c.s<items[j].e&&c.e>items[j].s)){cluster.push(items[j]);visited.add(j)}
    }
    clusters.push(cluster)
  }
  const result:LItem[]=[]
  for(const cluster of clusters){
    const cols:Item[][]=[]
    const sorted=[...cluster].sort((a,b)=>a.s-b.s)
    for(const item of sorted){
      let placed=false
      for(const col of cols){if(col[col.length-1].e<=item.s){col.push(item);placed=true;break}}
      if(!placed)cols.push([item])
    }
    const N=cols.length
    cols.forEach((col,ci)=>col.forEach(item=>result.push({
      cita:item.cita,top:Math.max(0,minsToTop(item.s)),
      height:Math.max(durToH(DEFAULT_MINS),32),left:(ci/N)*100,widthPct:(1/N)*100,
    })))
  }
  return result
}

// ── Validator ─────────────────────────────────────────────────────────────────
export function validateSlot(citas:Cita[],fecha:string,hora:string,especialista:string,curp:string):string|null{
  const s=snap30(toMins(hora)),e=s+DEFAULT_MINS
  if(s/60<WORK_START||s/60>=WORK_END)return`Horario fuera del rango (${WORK_START}:00–${WORK_END}:00)`
  // FIX #3: both doctor AND patient checked with range intersection
  const day=citas.filter(c=>c.fecha===fecha&&c.estatus!=="Cancelada")
  for(const c of day){
    const cs=snap30(toMins(c.hora)),ce=cs+DEFAULT_MINS
    const overlaps=s<ce&&e>cs
    if(!overlaps)continue
    if(especialista&&c.especialista===especialista)return`El doctor ya tiene una cita en este horario`
    if(curp&&c.folio&&c.folio===curp)return`El paciente ya tiene una cita en este horario`
  }
  return null
}

// ── Current time line ────────────────────────────────────────────────────────
function NowLine(){
  const[now,setNow]=useState(()=>new Date())
  const ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{ref.current?.scrollIntoView({behavior:"smooth",block:"center"});const id=setInterval(()=>setNow(new Date()),60_000);return()=>clearInterval(id)},[])
  const top=minsToTop(now.getHours()*60+now.getMinutes())
  if(top<0||top>GRID_H)return null
  return(
    <div ref={ref} className="absolute left-0 right-0 z-30 pointer-events-none flex items-center" style={{top:`${top}px`}}>
      <span className="size-2.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_8px_2px_rgba(59,130,246,0.6)]"/>
      <div className="h-[1.5px] flex-1 bg-blue-500/80"/>
    </div>
  )
}

// ── Appointment block ────────────────────────────────────────────────────────
function AppBlock({cita,height,onSelect}:{cita:Cita;height:number;onSelect:(c:Cita,r:DOMRect)=>void}){
  const ref=useRef<HTMLDivElement>(null)
  const border=BL[cita.estatus]??"border-l-slate-500"
  const bg=BG[cita.estatus]??"bg-slate-500/10"
  const tc=TC[cita.estatus]??"text-slate-300"
  const dot=DC[cita.estatus]??"bg-slate-400"
  return(
    <div ref={ref} className={`w-full h-full rounded-r-md border-l-4 border border-border/20 ${border} ${bg}
      px-1.5 py-1 overflow-hidden cursor-pointer hover:brightness-125 transition-all select-none`}
      onClick={()=>{if(ref.current)onSelect(cita,ref.current.getBoundingClientRect())}}>
      <div className={`flex items-center gap-1 text-[11px] font-semibold ${tc}`}>
        <span className={`size-1.5 rounded-full shrink-0 ${dot}`}/><span className="truncate">{cita.hora}</span>
      </div>
      {height>=40&&<p className="text-[10px] text-foreground/70 truncate mt-0.5">{cita.beneficiario}</p>}
    </div>
  )
}

// ── Anchored Popover ─────────────────────────────────────────────────────────
function CitaPopover({cita,anchor,onClose,onAction,updatingId}:{
  cita:Cita;anchor:DOMRect;onClose:()=>void
  onAction:(id:number,e:Cita["estatus"])=>void;updatingId:number|null
}){
  const dot=DC[cita.estatus]??"bg-slate-400"
  const tc=TC[cita.estatus]??"text-slate-300"
  const popW=280
  // Position to the right of the card; if off-screen, flip left
  const left=anchor.right+8+popW>window.innerWidth?anchor.left-popW-8:anchor.right+8
  const top=Math.min(anchor.top,window.innerHeight-320)
  return(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}/>
      <div className="fixed z-50 rounded-2xl border border-border/50 bg-[#0f172a]/98 backdrop-blur-xl shadow-2xl p-4 space-y-3"
        style={{left:`${left}px`,top:`${top}px`,width:`${popW}px`,boxShadow:"0 16px 48px rgba(0,0,0,0.7)"}}>
        <button className="absolute top-3 right-3 text-muted-foreground hover:text-foreground" onClick={onClose}><X className="size-4"/></button>
        <div className="flex items-center gap-2">
          <span className={`size-2.5 rounded-full ${dot}`}/>
          <span className={`font-bold ${tc}`}>{cita.hora}</span>
          <span className="ml-auto text-[10px] border border-border/50 rounded-full px-2 py-px text-muted-foreground">{cita.estatus}</span>
        </div>
        <div>
          <p className="font-bold text-foreground">{cita.beneficiario}</p>
          {cita.especialista&&<p className="text-xs text-muted-foreground mt-0.5">{cita.especialista}</p>}
        </div>
        {cita.notas&&<p className="text-xs italic text-muted-foreground/60 border-t border-border/30 pt-2">"{cita.notas}"</p>}
        <div className="flex gap-2">
          {cita.estatus==="Pendiente"&&<>
            <Button size="sm" className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700" disabled={updatingId===cita.id} onClick={()=>onAction(cita.id,"Confirmada")}><Check className="size-3 mr-1"/>Confirmar</Button>
            <Button size="sm" variant="destructive" className="flex-1 h-8 text-xs" disabled={updatingId===cita.id} onClick={()=>onAction(cita.id,"Cancelada")}><X className="size-3 mr-1"/>Cancelar</Button>
          </>}
          {cita.estatus==="Confirmada"&&<>
            <Button size="sm" className="flex-1 h-8 text-xs bg-sky-600 hover:bg-sky-700" disabled={updatingId===cita.id} onClick={()=>onAction(cita.id,"Completada")}>Completar</Button>
            <Button size="sm" variant="destructive" className="flex-1 h-8 text-xs" disabled={updatingId===cita.id} onClick={()=>onAction(cita.id,"Cancelada")}><X className="size-3 mr-1"/>Cancelar</Button>
          </>}
        </div>
      </div>
    </>
  )
}

// ── Action Center ────────────────────────────────────────────────────────────
function ActionCenter({citas,onNavigate}:{citas:Cita[];onNavigate:(c:Cita)=>void}){
  const now=new Date();now.setHours(0,0,0,0)
  // Pendientes sin confirmar del pasado
  const alerts=citas.filter(c=>{
    if(c.estatus==="Cancelada"||c.estatus==="Completada")return false
    const d=new Date(c.fecha+"T12:00:00");return d<now
  }).slice(0,5)
  if(!alerts.length)return(
    <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Alertas</p>
      <p className="text-xs text-muted-foreground/50">Sin alertas pendientes ✓</p>
    </div>
  )
  return(
    <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <AlertCircle className="size-3 text-amber-400"/>Requieren atención
      </p>
      <div className="space-y-1.5">
        {alerts.map(c=>(
          // FIX #5 nav: click navigates to that cita's week and opens its popover
          <button key={c.id} onClick={()=>onNavigate(c)}
            className="w-full text-left rounded-xl border border-border/30 bg-muted/20 hover:bg-muted/40 px-3 py-2.5 transition-colors group">
            <p className="text-[11px] font-semibold text-foreground/80 truncate group-hover:text-foreground transition-colors">{c.beneficiario}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`size-1.5 rounded-full shrink-0 ${DC[c.estatus]??"bg-slate-400"}`}/>
              <p className="text-[10px] text-muted-foreground">{c.fecha} · {c.estatus}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

interface Props{
  citas:Cita[]
  onReload:()=>void
  /** Called after a successful status update — updates parent citas array without setLoading(true) */
  onSilentUpdate:(updater:(prev:Cita[])=>Cita[])=>void
  stats:{hoy:number;semana:number;pendientes:number}
}

export function CitasCalendarView({citas:citasProp,onReload,onSilentUpdate,stats}:Props){
  // Local optimistic state — initialised from props, updated immediately on action
  const[citas,setCitas]=useState<Cita[]>(citasProp)
  // Sync only when a full reload happens (new cita created, page mount)
  // We use a ref to avoid overwriting an in-progress optimistic update
  const isMutating=useRef(false)
  useEffect(()=>{
    if(!isMutating.current)setCitas(citasProp)
  },[citasProp])

  const todayRef=useMemo(()=>{const d=new Date();d.setHours(0,0,0,0);return d},[])
  const[weekAnchor,setWeekAnchor]=useState<Date>(()=>getMon(new Date()))
  const[calYear,setCalYear]=useState(()=>new Date().getFullYear())
  const[calMonth,setCalMonth]=useState(()=>new Date().getMonth())
  const[selected,setSelected]=useState<{cita:Cita;rect:DOMRect}|null>(null)
  const[updatingId,setUpdatingId]=useState<number|null>(null)

  const weekDates=useMemo(()=>getWeek(weekAnchor),[weekAnchor])
  const isThisWeek=weekDates.some(d=>sameDay(d,todayRef))

  function prevMonth(){if(calMonth===0){setCalYear(y=>y-1);setCalMonth(11)}else setCalMonth(m=>m-1)}
  function nextMonth(){if(calMonth===11){setCalYear(y=>y+1);setCalMonth(0)}else setCalMonth(m=>m+1)}
  function handleDay(d:Date){setWeekAnchor(getMon(d));setCalYear(d.getFullYear());setCalMonth(d.getMonth())}

  // Mini-cal cells with overflow
  const miniCells=useMemo(()=>{
    const fd=getFDOW(calYear,calMonth),dim=getDIM(calYear,calMonth)
    const cells:{date:Date;out:boolean}[]=[]
    for(let i=fd-1;i>=0;i--){cells.push({date:new Date(calYear,calMonth,0-i),out:true})}
    for(let i=1;i<=dim;i++)cells.push({date:new Date(calYear,calMonth,i),out:false})
    let nd=1;while(cells.length%7!==0)cells.push({date:new Date(calYear,calMonth+1,nd++),out:true})
    return cells
  },[calYear,calMonth])

  // FIX #1: only non-cancelled for the grid; citasDay already sorted
  const citasSemana=useMemo(()=>weekDates.map(d=>{
    const all=citasDay(citas,d.getFullYear(),d.getMonth(),d.getDate())
    // FIX #2: Cancelled not rendered in the weekly grid
    const visible=all.filter(c=>c.estatus!=="Cancelada")
    return{date:d,layout:buildLayout(visible)}
  }),[citas,weekDates])

  // FIX #5: navigate to cita's week when clicking Action Center alert
  function navigateToCita(c:Cita){
    const d=new Date(c.fecha+"T12:00:00")
    handleDay(d)
  }

  async function doUpdate(id:number,estatus:Cita["estatus"]){
    setSelected(null)
    isMutating.current=true
    const updater=(prev:Cita[])=>prev.map(c=>c.id===id?{...c,estatus}:c)
    // Optimistic: update local + parent immediately
    setCitas(updater)
    onSilentUpdate(updater)
    setUpdatingId(id)
    try{
      await updateEstatusCita(id,estatus)
      toast.success(`Cita marcada como ${estatus}`)
    }catch{
      // Revert both
      const revert=(prev:Cita[])=>prev.map(c=>c.id===id?{...c,estatus:citasProp.find(x=>x.id===id)?.estatus??c.estatus}:c)
      setCitas(revert)
      onSilentUpdate(revert)
      toast.error("No se pudo actualizar. Cambio revertido.")
    }finally{setUpdatingId(null);isMutating.current=false}
  }

  return(
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
      {/* LEFT */}
      <div className="flex flex-col gap-4">
        {/* Mini-cal */}
        <div className="rounded-2xl border border-border/50 bg-card p-3">
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
              const dc=citasDay(citas,date.getFullYear(),date.getMonth(),date.getDate())
              const dots=Math.min(dc.length,3)
              const inW=weekDates.some(w=>sameDay(w,date))
              const isT=sameDay(date,todayRef)
              return(
                  <div key={idx} className="flex flex-col items-center gap-px">
                    <button onClick={()=>handleDay(date)}
                      className={`flex size-6 items-center justify-center rounded-full text-[11px] font-medium transition-all
                        ${out?"text-muted-foreground/25 hover:bg-muted/30"
                          :isT?"bg-primary text-primary-foreground shadow-sm"
                          :inW?"bg-primary/20 text-primary"
                          :"text-foreground hover:bg-muted"}`}>
                      {date.getDate()}
                    </button>
                    {/* FIX #6: dots shown for ALL days incl. overflow, just dimmer */}
                    <div className="flex gap-px h-1.5 items-center">
                      {Array.from({length:dots}).map((_,i)=>(
                        <span key={i} className={`size-1 rounded-full
                          ${isT?"bg-primary-foreground/80":out?"bg-primary/25":"bg-primary/50"}`}/>
                      ))}
                    </div>
                  </div>
              )
            })}
          </div>
        </div>
        {/* Action Center with navigation */}
        <ActionCenter citas={citas} onNavigate={navigateToCita}/>
      </div>

      {/* RIGHT */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden flex flex-col">
        {/* Nav */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary"/>
            <span className="text-sm font-semibold">{weekDates[0].getDate()} – {weekDates[6].getDate()} {MESES[weekDates[6].getMonth()]} {weekDates[6].getFullYear()}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={()=>setWeekAnchor(w=>{const p=new Date(w);p.setDate(w.getDate()-7);return p})} className="rounded-lg p-1.5 hover:bg-muted transition-colors"><ChevronLeft className="size-4"/></button>
            <button onClick={()=>{const m=getMon(new Date());setWeekAnchor(m);setCalYear(m.getFullYear());setCalMonth(m.getMonth())}} className="rounded-lg px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors">Hoy</button>
            <button onClick={()=>setWeekAnchor(w=>{const n=new Date(w);n.setDate(w.getDate()+7);return n})} className="rounded-lg p-1.5 hover:bg-muted transition-colors"><ChevronRight className="size-4"/></button>
          </div>
        </div>
        {/* Day headers */}
        <div className="flex border-b border-border/30 shrink-0">
          <div className="w-14 shrink-0"/>
          {citasSemana.map(({date},ci)=>{
            const isT=sameDay(date,todayRef)
            return(
              <div key={ci} className={`flex-1 flex flex-col items-center py-2 cursor-pointer hover:bg-muted/30 transition-colors ${isT?"bg-primary/10":""}`} onClick={()=>handleDay(date)}>
                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">{DIAS_L[ci]}</span>
                <span className={`mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-bold ${isT?"bg-primary text-primary-foreground":"text-foreground"}`}>{date.getDate()}</span>
              </div>
            )
          })}
        </div>
        {/* Scrollable grid */}
        <div className="flex flex-1 overflow-y-auto" style={{maxHeight:"calc(100vh - 240px)"}}>
          {/* Hours column — FIX #6: pt-0 + offset labels to align with grid lines */}
          <div className="w-14 shrink-0 relative border-r border-border/20" style={{height:`${GRID_H}px`}}>
            {HOURS.slice(0,-1).map((h,i)=>(
              <div key={h} className="absolute right-2 text-[10px] text-muted-foreground/50 font-medium select-none"
                style={{top:`${i===0?2:i*CELL_H-7}px`}}>
                {String(h).padStart(2,"0")}:00
              </div>
            ))}
          </div>
          {/* Day columns */}
          <div className="flex-1 flex">
            {citasSemana.map(({date,layout},ci)=>{
              const isT=sameDay(date,todayRef)
              return(
                <div key={ci} className={`flex-1 relative border-r border-border/15 last:border-r-0 ${isT?"bg-primary/[0.025]":""}`} style={{height:`${GRID_H}px`}}>
                  {HOURS.slice(0,-1).map((h,i)=>{
                    const disabled=h<WORK_START||h>=WORK_END
                    return(
                      <div key={h} className={`absolute left-0 right-0 border-t border-border/15 ${disabled?"bg-muted/[0.08]":""}`} style={{top:`${i*CELL_H}px`,height:`${CELL_H}px`}}>
                        <div className="absolute left-0 right-0 border-t border-border/[0.06]" style={{top:"50%"}}/>
                      </div>
                    )
                  })}
                  {isT&&isThisWeek&&<NowLine/>}
                  {layout.map(({cita,top,height,left,widthPct})=>(
                    <div key={cita.id} className="absolute px-0.5" style={{top:`${top}px`,height:`${height}px`,left:`${left}%`,width:`${widthPct}%`}}>
                      <AppBlock cita={cita} height={height} onSelect={(c,r)=>setSelected({cita:c,rect:r})}/>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Anchored Popover */}
      {selected&&(
        <CitaPopover cita={selected.cita} anchor={selected.rect} updatingId={updatingId}
          onClose={()=>setSelected(null)} onAction={doUpdate}/>
      )}
    </div>
  )
}
