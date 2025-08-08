
import React, { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import type { MatchLite, LiveStats, SetScore } from './api'
import { fetchLiveMatches, subscribeLive } from './api'

type Tour = 'ATP'|'WTA'|'ALL'
function fmtSetScore(s: SetScore){ return `${s.p1}-${s.p2}` }
function WinnerBadge({ status }: { status: string }){
  if (status === 'Completed') return <Badge variant="secondary">Completed</Badge>
  if (status === 'InProgress' || status === 'Live') return <Badge>Live</Badge>
  if (status === 'NotStarted') return <Badge variant="outline">Upcoming</Badge>
  return <Badge variant="destructive">{status}</Badge>
}
function Pill({children}:{children:React.ReactNode}){ return <span className="pill mr-2">{children}</span> }
function MatchRow({ m, onOpen }: { m: MatchLite; onOpen: (id: string)=>void }){
  return (
    <div className="card p-4 cursor-pointer hover:shadow-md transition" onClick={()=>onOpen(m.id)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[260px]">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-2">
            <WinnerBadge status={m.status} /><span>{m.tour}</span><span>•</span><span>{m.tournament}</span>{m.round && (<><span>•</span><span>{m.round}</span></>)}
          </div>
          <div className="font-semibold">{m.player1.name} {m.server===1 && <span className="ml-1">🎾</span>} <span className="mx-2">vs</span> {m.player2.name} {m.server===2 && <span className="ml-1">🎾</span>}</div>
          <div className="text-sm text-muted-foreground mt-1 flex items-center flex-wrap gap-2">
            {m.currentGame && <Pill>Game {m.currentGame}</Pill>}{m.startTime && <Pill>{new Date(m.startTime).toLocaleTimeString()}</Pill>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {m.sets.length>0 ? m.sets.map((s,i)=>(<div className="text-lg mono" key={i}>{fmtSetScore(s)}</div>)) : <div className="text-muted-foreground">No score yet</div>}
        </div>
      </div>
    </div>
  )
}
function useLiveMatches(){
  const [data, setData] = useState<MatchLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string|undefined>()
  const tick = async () => { try{ const res = await fetchLiveMatches(); setData(res); setError(undefined) } catch(e:any){ setError(e?.message ?? 'Failed to load') } finally{ setLoading(false) } }
  useEffect(()=>{ tick(); const id = setInterval(tick, 10000); return ()=>clearInterval(id) }, [])
  return { data, loading, error }
}
function Scoreboard({ onOpen }:{ onOpen: (id:string)=>void }){
  const { data, loading, error } = useLiveMatches()
  const [tour, setTour] = useState<Tour>('ALL')
  const [q, setQ] = useState('')
  const filtered = useMemo(()=> data.filter(m => (tour==='ALL'? true : m.tour===tour) && `${m.player1.name} ${m.player2.name} ${m.tournament}`.toLowerCase().includes(q.toLowerCase())), [data, tour, q])
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={tour} onChange={e=>setTour(e.target.value as Tour)} className="w-[160px]">
          <option value="ALL">All Tours</option><option value="ATP">ATP</option><option value="WTA">WTA</option>
        </Select>
        <Input placeholder="Search players or tournament..." value={q} onChange={e=>setQ(e.target.value)} className="max-w-sm" />
        <div className="text-sm text-muted-foreground ml-auto">{loading ? 'Refreshing…' : 'Live'}{error && <span className="text-destructive ml-2">{error}</span>}</div>
      </div>
      {filtered.length===0 && <div className="text-muted-foreground">No matches found.</div>}
      <div className="grid grid-cols-1 gap-3">{filtered.map(m => <MatchRow key={m.id} m={m} onOpen={onOpen} />)}</div>
    </div>
  )
}
function StatBar({ label, p1, p2, invert=false }:{ label:string; p1:number; p2:number; invert?:boolean }){
  const total = Math.max(p1+p2, 1); const leftPct = Math.round((p1/total)*100); const rightPct = 100-leftPct
  const leftVal = invert ? p2 : p1; const rightVal = invert ? p1 : p2; const leftW = invert ? rightPct : leftPct; const rightW = 100-leftW
  return (<div className="mb-3"><div className="flex items-center justify-between text-sm mb-1"><span>{label}</span><span className="mono">{leftVal} : {rightVal}</span></div><div className="h-2 w-full bg-muted rounded overflow-hidden flex"><div style={{ width:`${leftW}%` }} className="bg-primary/70" /><div style={{ width:`${rightW}%` }} className="bg-secondary" /></div></div>)
}
function Details({ matchId, onBack }:{ matchId:string; onBack: ()=>void }){
  const [stats, setStats] = useState<LiveStats | null>(null)
  const [match, setMatch] = useState<MatchLite | null>(null)
  useEffect(()=>{ const unsub = subscribeLive(matchId, ({ stats, match }) => { if (stats) setStats(stats); if (match) setMatch(match) }); return () => { unsub?.() } }, [matchId])
  const momentum = useMemo(()=> (stats?.momentum ?? []).map(x => ({ time: new Date(x.t).toLocaleTimeString(), p1: x.m1, p2: x.m2 })), [stats])
  const setsForChart = useMemo(()=> (match?.sets ?? []).map((s, i) => ({ set: `Set ${i+1}`, p1: s.p1, p2: s.p2 })), [match?.sets])
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3"><Button variant="outline" onClick={onBack}>← Back</Button><div className="text-sm text-muted-foreground">Live match details, technical stats & H2H</div></div>
      <Card><CardContent className="p-4"><div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-2">{match && <Badge>Live</Badge>}<span>{match?.tour}</span><span>•</span><span>{match?.tournament}</span><span>•</span><span>{match?.round}</span></div>
        <div className="text-xl font-semibold">{match?.player1.name} <span className="mx-2">vs</span> {match?.player2.name}</div>
        <div className="text-sm text-muted-foreground mt-1 flex items-center flex-wrap gap-2">{match?.currentGame && <span className="pill">Game {match.currentGame}</span>}{match?.startTime && <span className="pill">{new Date(match.startTime).toLocaleTimeString()}</span>}</div></div>
        <div className="flex items-center gap-3">{(match?.sets ?? []).map((s, i) => (<div key={i} className="text-lg mono">{`${s.p1}-${s.p2}`}</div>))}</div>
      </div></CardContent></Card>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card><CardContent className="p-4"><div className="font-semibold mb-3">Technical Statistics (Live)</div>{!stats && <div className="text-muted-foreground">Loading live stats…</div>}{stats && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div>
          <StatBar label="Aces" p1={stats.acesP1} p2={stats.acesP2} />
          <StatBar label="Double Faults" p1={stats.dfP1} p2={stats.dfP2} invert />
          <StatBar label="Winners" p1={stats.winnersP1} p2={stats.winnersP2} />
          <StatBar label="Unforced Errors" p1={stats.uesP1} p2={stats.uesP2} invert />
          <StatBar label="Break Points (won)" p1={stats.breakPtsWonP1} p2={stats.breakPtsWonP2} />
          <div className="text-xs text-muted-foreground">Totals: {stats.breakPtsWonP1}/{stats.breakPtsTotalP1} vs {stats.breakPtsWonP2}/{stats.breakPtsTotalP2}</div>
        </div><div>
          <StatBar label="1st Serve % (won)" p1={Math.round(stats.firstServePctP1 * stats.firstServeWonPctP1 / 100)} p2={Math.round(stats.firstServePctP2 * stats.firstServeWonPctP2 / 100)} />
          <StatBar label="Total Points Won" p1={stats.totalPtsWonP1} p2={stats.totalPtsWonP2} />
        </div></div>)}</CardContent></Card>
        <Card><CardContent className="p-4"><div className="font-semibold mb-3">Set-by-Set Chart</div><div className="text-sm text-muted-foreground">（此处可替换为图表库展示，每盘得分）</div></CardContent></Card>
      </div>
    </div>
  )
}
export default function App(){
  const [view, setView] = useState<'board' | { type:'details'; id:string }>('board')
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <div className="min-h-screen py-6"><div className="container-narrow">
      <header className="mb-6"><div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">WTA/ATP Live Scoreboard</h1>
        <div className="flex items-center gap-2"><Button variant="outline" onClick={()=>setView('board')}>Scoreboard</Button></div>
      </div><p className="text-sm text-muted-foreground mt-1">实时比分 + 技术统计 + H2H（API-Tennis，经 Vercel 代理）</p></header>
      {view === 'board' && <Scoreboard onOpen={(id)=>{ setSelected(id); setView({ type:'details', id }) }} />}
      {typeof view === 'object' && view.type==='details' && selected && <Details matchId={selected} onBack={()=>setView('board')} />}
      <footer className="mt-8 text-xs text-muted-foreground">生产环境默认走 <code>/api/tennis</code>；本地可用 <code>VITE_TENNIS_API_KEY</code> 或 <code>VITE_TENNIS_API_PROXY</code>。</footer>
    </div></div>
  )
}
