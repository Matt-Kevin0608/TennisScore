import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { Discipline, RankingItem, TourSimple } from '@/api'
import { fetchRankings } from '@/api'

function Avatar({ name, src }: { name: string; src?: string }) {
  if (src) {
    return <img src={src} alt={name} className="h-8 w-8 rounded-full object-cover border" loading="lazy" />
  }
  const initials = name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()
  return (
    <div className="h-8 w-8 rounded-full border bg-muted flex items-center justify-center text-xs">
      {initials || 'P'}
    </div>
  )
}

function CountryCell({ country }: { country?: string }) {
  if (!country) return <span className="text-muted-foreground">—</span>
  return <span>{country}</span>
}

export default function RankingsPage() {
  const [tour, setTour] = useState<TourSimple>('ATP')
  const [discipline, setDiscipline] = useState<Discipline>('Singles')
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<RankingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()

 useEffect(() => {
   let cancelled = false
   async function run() {
     setLoading(true)
     setRows([])
     try {
       const data = await fetchRankings(tour, discipline)
       if (!cancelled) { setRows(data); setError(undefined) }
     } catch (e: any) {
       if (!cancelled) setError(e?.message || 'Failed to load rankings')
     } finally {
       if (!cancelled) setLoading(false)
     }
   }
   run()
   return () => { cancelled = true }
 }, [tour, discipline])


  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase()
    if (!key) return rows
    return rows.filter(r => `${r.name} ${r.country ?? ''}`.toLowerCase().includes(key))
  }, [rows, q])

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={tour} onChange={(e)=>setTour(e.target.value as TourSimple)} className="w-[140px]">
              <option value="ATP">ATP</option>
              <option value="WTA">WTA</option>
            </Select>
            <Select value={discipline} onChange={(e)=>setDiscipline(e.target.value as Discipline)} className="w-[140px]">
              <option value="Singles">Singles</option>
              <option value="Doubles" disabled>Doubles</option>
            </Select>
            <Input
              placeholder="Search player or country..."
              className="max-w-sm"
              value={q}
              onChange={(e)=>setQ(e.target.value)}
            />
            <div className="text-sm text-muted-foreground ml-auto">
              {loading ? 'Loading rankings…' : `Showing ${filtered.length} players`}
              {error && <span className="text-destructive ml-2">{error}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-4 py-3">
          <div className="text-sm text-muted-foreground">
            {tour} {discipline} World Rankings
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            <div className="grid grid-cols-12 px-4 py-2 text-xs uppercase text-muted-foreground">
              <div className="col-span-1">Rank</div>
              <div className="col-span-6">Player</div>
              <div className="col-span-3">Country</div>
              <div className="col-span-2 text-right">Points</div>
            </div>
            {filtered.map((r) => (
              <div key={`${r.playerKey}-${r.rank}`} className="grid grid-cols-12 px-4 py-2 items-center">
                <div className="col-span-1 font-medium">{r.rank || '—'}</div>
                <div className="col-span-6 flex items-center gap-3">
                  <Avatar name={r.name} src={r.photo} />
                  <div className="leading-tight">
                    <div className="font-medium">{r.name || '-'}</div>
                    {r.playerKey && <div className="text-xs text-muted-foreground">ID: {r.playerKey}</div>}
                  </div>
                </div>
                <div className="col-span-3"><CountryCell country={r.country} /></div>
                <div className="col-span-2 text-right mono">{r.points ?? '—'}</div>
              </div>
            ))}
            {!loading && filtered.length===0 && (
              <div className="px-4 py-6 text-sm text-muted-foreground">No players found.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
