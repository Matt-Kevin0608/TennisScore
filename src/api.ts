
export type Tour = 'ATP' | 'WTA' | 'OTHER'
export type Player = { id: string; name: string }
export type SetScore = { p1: number; p2: number }
export type MatchLite = {
  id: string; tour: Tour; tournament: string; round?: string; startTime?: string;
  status: 'NotStarted'|'InProgress'|'Completed'|string;
  player1: Player; player2: Player; sets: SetScore[]; currentGame?: string; server?: 1|2|undefined;
}
export type LiveStats = {
  acesP1: number; acesP2: number; dfP1: number; dfP2: number;
  firstServePctP1: number; firstServePctP2: number;
  firstServeWonPctP1: number; firstServeWonPctP2: number;
  breakPtsWonP1: number; breakPtsWonP2: number; breakPtsTotalP1: number; breakPtsTotalP2: number;
  winnersP1: number; winnersP2: number; uesP1: number; uesP2: number;
  totalPtsWonP1: number; totalPtsWonP2: number;
  momentum: { t: number; m1: number; m2: number }[];
}
export type H2HItem = { matchId: string; date: string; tournament: string; round: string; winner: 1|2; score: string }

const SYDNEY_TZ = 'Australia/Sydney'
const DIRECT_BASE = 'https://api.api-tennis.com/tennis/'
// 新写法：生产用 /api/tennis；开发只有在你显式设置 VITE_TENNIS_API_PROXY 时才走代理
const PROXY =
  import.meta.env.VITE_TENNIS_API_PROXY ||
  (import.meta.env.PROD ? '/api/tennis' : '');


function mapTour(t?: string): Tour {
  if (!t) return 'OTHER'; const v=t.toLowerCase(); if (v.includes('wta')) return 'WTA'; if (v.includes('atp')) return 'ATP'; return 'OTHER'
}
function toSets(scores?: { score_first: string; score_second: string }[]): SetScore[] {
  return (scores??[]).map(s=>({ p1: Number(s.score_first||0), p2: Number(s.score_second||0) }))
}
async function callApi(params: Record<string,string>, retry=2): Promise<any[]> {
  if (PROXY){
    const url = new URL(PROXY, window.location.origin)
    Object.entries(params).forEach(([k,v])=> url.searchParams.set(k, v))
    const r = await fetch(url.toString()); if (!r.ok){ if (retry>0 && (r.status===429||r.status>=500)){ await new Promise(x=>setTimeout(x,(3-retry)*1000)); return callApi(params,retry-1)} throw new Error(`HTTP ${r.status}`) }
    const d = await r.json(); if (!d?.success) throw new Error('Proxy returned error'); return d.result
  } else {
    const key = import.meta.env.VITE_TENNIS_API_KEY; if (!key) throw new Error('Missing VITE_TENNIS_API_KEY or VITE_TENNIS_API_PROXY')
    const url = new URL(DIRECT_BASE); Object.entries({ ...params, APIkey:key, timezone: SYDNEY_TZ }).forEach(([k,v])=> url.searchParams.set(k,v))
    const r = await fetch(url.toString()); if (!r.ok){ if (retry>0 && (r.status===429||r.status>=500)){ await new Promise(x=>setTimeout(x,(3-retry)*1000)); return callApi(params,retry-1)} throw new Error(`HTTP ${r.status}`) }
    const d = await r.json(); if (!d?.success) throw new Error('API error'); return d.result
  }
}
export async function fetchLiveMatches(): Promise<MatchLite[]> {
  const rows = await callApi({ method: 'get_livescore' })
  return rows.map((r:any)=>({
    id:String(r.event_key), tour: mapTour(r.event_type_type), tournament: r.tournament_name, round: r.tournament_round||'',
    startTime: (r.event_date&&r.event_time)? new Date(`${r.event_date}T${r.event_time}:00`).toISOString(): undefined,
    status: r.event_status==='Finished'?'Completed': (r.event_live==='1'?'InProgress': (r.event_status||'NotStarted')),
    player1:{ id:String(r.first_player_key), name:r.event_first_player },
    player2:{ id:String(r.second_player_key), name:r.event_second_player },
    sets: toSets(r.scores), currentGame: r.event_game_result||undefined,
    server: r.event_serve==='First Player'?1: r.event_serve==='Second Player'?2: undefined
  }))
}
export async function fetchMatchDetails(matchId: string){
  const [row] = await callApi({ method:'get_fixtures', match_key:String(matchId), date_start:'2000-01-01', date_stop:'2100-01-01' })
  const match: MatchLite = {
    id:String(row.event_key), tour:mapTour(row.event_type_type), tournament:row.tournament_name, round:row.tournament_round||'',
    startTime:(row.event_date&&row.event_time)? new Date(`${row.event_date}T${row.event_time}:00`).toISOString():undefined,
    status: row.event_status==='Finished'?'Completed': (row.event_status||'NotStarted'),
    player1:{ id:String(row.first_player_key), name:row.event_first_player },
    player2:{ id:String(row.second_player_key), name:row.event_second_player },
    sets: toSets(row.scores), currentGame: row.event_game_result||undefined,
    server: row.event_serve==='First Player'?1: row.event_serve==='Second Player'?2: undefined
  }
  let p1=0,p2=0; const momentum: {t:number;m1:number;m2:number}[] = []; let t=Date.now()-60000
  for (const set of (row.pointbypoint??[])){ for (const pt of (set.points??[])){ const [a,b]=String(pt.score||'').split('-').map(x=>parseInt(x.trim(),10)||0); if(a!==b)(a>b?p1+=1:p2+=1); t+=60000; momentum.push({t, m1:p1, m2:p2}); } }
  const stats: LiveStats = { acesP1:0,acesP2:0, dfP1:0,dfP2:0, firstServePctP1:0,firstServePctP2:0, firstServeWonPctP1:0,firstServeWonPctP2:0,
    breakPtsWonP1:0,breakPtsWonP2:0, breakPtsTotalP1:0,breakPtsTotalP2:0, winnersP1:0,winnersP2:0, uesP1:0,uesP2:0, totalPtsWonP1:p1,totalPtsWonP2:p2, momentum }
  const h2h = await fetchH2H(match.player1.id, match.player2.id)
  return { stats, h2h, match }
}
export async function fetchH2H(firstPlayerKey:string, secondPlayerKey:string): Promise<H2HItem[]> {
  const arr = await callApi({ method:'get_H2H', first_player_key:String(firstPlayerKey), second_player_key:String(secondPlayerKey) })
  const wrapper = Array.isArray(arr)? arr[0]: arr; const list = (wrapper?.H2H??[]) as any[]
  return list.map((m:any)=>({ matchId:String(m.event_key), date:`${m.event_date}T${m.event_time??'00:00'}:00`, tournament:m.tournament_name, round:m.tournament_round??'', winner:m.event_winner==='First Player'?1:2, score:m.event_final_result??'' }))
}
export function subscribeLive(matchId: string, onTick:(p:{stats?:LiveStats; match?:MatchLite})=>void){
  let cancelled=false; (async function loop(){ while(!cancelled){ try{ const [list, d]=await Promise.all([fetchLiveMatches(), fetchMatchDetails(matchId)]); const m=list.find(x=>x.id===matchId)??d.match; onTick({ match:m!, stats:d.stats }) }catch(e){ console.error(e) } await new Promise(r=>setTimeout(r,8000)) } })(); return ()=>{cancelled=true}
}
