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
const PROXY = import.meta.env.VITE_TENNIS_API_PROXY || (import.meta.env.PROD ? '/api/tennis' : '')

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
/* ===== Rankings API (ATP/WTA × Singles/Doubles) ===== */
export type Discipline = 'Singles' | 'Doubles'
export type TourSimple = 'ATP' | 'WTA'
export type RankingItem = {
  rank: number
  playerKey: string
  name: string
  country?: string
  points?: number
  photo?: string
}
function normalizeRankingRow(r: any): RankingItem {
  const rank = Number(r.rank || r.player_rank || r.standing_place || r.position || 0)
  const points = Number(r.points || r.player_points || r.standing_points || r.total_points || 0)
  const name = r.player_name || r.player || r.name || r.player_fullname || ''
  const country = r.player_country || r.country || r.nationality || undefined
  const photo = r.player_logo || r.player_image || r.event_first_player_logo || undefined
  const playerKey = String(r.player_key || r.playerId || r.id || '')
  return { rank, playerKey, name, country, points, photo }
}
// 在模块顶部或 fetchRankings 附近放一个缓存，避免每次都打 get_events
let _eventTypeCache: Record<string, string> | null = null;

async function getEventTypeMap(): Promise<Record<string, string>> {
  if (_eventTypeCache) return _eventTypeCache;

  // 走你现有的代理/直连通道
  const base = import.meta.env.VITE_TENNIS_API_PROXY || (import.meta.env.PROD ? '/api/tennis' : '');
  const url = base
    ? new URL(base, window.location.origin)
    : new URL('https://api.api-tennis.com/tennis/');

  // method=get_events
  url.searchParams.set('method', 'get_events');
  if (!base) {
    url.searchParams.set('APIkey', import.meta.env.VITE_TENNIS_API_KEY!);
    url.searchParams.set('timezone', 'Europe/Berlin');
  }
  // 加一个时间戳，避免被某些层缓存
  url.searchParams.set('_ts', String(Date.now()));

  const res = await fetch(url.toString());
  const json = await res.json();
  const list: any[] = base ? (json?.result ?? []) : (json?.result ?? []);
  // 生成一个 “名字 -> key” 的字典
  // 例如： { "Atp Singles": "265", "Wta Singles": "266", "Atp Doubles": "267", "Wta Doubles": "268", ... }
  const map: Record<string, string> = {};
  for (const r of list) {
    if (r?.event_type_type && r?.event_type_key) {
      map[String(r.event_type_type)] = String(r.event_type_key);
    }
  }
  _eventTypeCache = map;
  return map;
}

function buildEventTypeName(tour: 'ATP'|'WTA', discipline: 'Singles'|'Doubles'): string {
  // 文档里的命名是 “Atp Singles / Wta Doubles …”
  const t = tour === 'ATP' ? 'Atp' : 'Wta';
  return `${t} ${discipline}`;
}

// src/api.ts
export async function fetchRankings(
  tour: 'ATP' | 'WTA',
  discipline: 'Singles' | 'Doubles' // 目前 API 不区分单双打，这里先保留参数
): Promise<RankingItem[]> {
  const params: Record<string, string> = {
    method: 'get_standings',
    event_type: tour,        // ✅ 必须传：'ATP' 或 'WTA'
  };

  const base = import.meta.env.VITE_TENNIS_API_PROXY || (import.meta.env.PROD ? '/api/tennis' : '');
  const call = async (p: Record<string,string>) => {
    if (base) {
      const u = new URL(base, window.location.origin);
      Object.entries(p).forEach(([k,v]) => u.searchParams.set(k, v));
      const r = await fetch(u.toString());
      const j = await r.json();
      if (!j?.success) throw new Error(j?.error || 'rankings proxy error');
      return j.result as any[];
    } else {
      const key = import.meta.env.VITE_TENNIS_API_KEY!;
      const u = new URL('https://api.api-tennis.com/tennis/');
      Object.entries({ ...p, APIkey: key, timezone: 'Europe/Berlin' })
        .forEach(([k,v]) => u.searchParams.set(k, v));
      const r = await fetch(u.toString());
      const j = await r.json();
      if (!j?.success) throw new Error(j?.error || 'rankings api error');
      return j.result as any[];
    }
  };

  const rows = await call(params);
  // 文档示例里字段可能叫 place/player/points，这里做兼容映射
  const normalized = rows.map((r:any) => ({
    rank: Number(r.rank ?? r.place ?? r.standing_place ?? 0),
    playerKey: String(r.player_key ?? r.playerId ?? r.id ?? ''),
    name: r.player_name ?? r.player ?? r.name ?? '',
    country: r.player_country ?? r.country,
    points: Number(r.points ?? r.player_points ?? r.total_points ?? 0),
    photo: r.player_logo ?? r.player_image ?? undefined,
  })) as RankingItem[];

  return normalized.sort((a,b) => a.rank - b.rank);
}

export async function fetchPlayerProfile(playerKey: string) {
  const params: Record<string,string> = { method: 'get_players', player_key: String(playerKey) }
  const base = import.meta.env.VITE_TENNIS_API_PROXY || (import.meta.env.PROD ? '/api/tennis' : '')
  const call = async () => {
    if (base) {
      const u = new URL(base, window.location.origin); Object.entries(params).forEach(([k,v]) => u.searchParams.set(k, v))
      const r = await fetch(u.toString()); const j = await r.json(); if (!j?.success) throw new Error('players proxy error'); return j.result as any[]
    } else {
      const key = import.meta.env.VITE_TENNIS_API_KEY; const u = new URL('https://api.api-tennis.com/tennis/')
      Object.entries({ ...params, APIkey: key!, timezone: 'Europe/Berlin' }).forEach(([k,v]) => u.searchParams.set(k, v))
      const r = await fetch(u.toString()); const j = await r.json(); if (!j?.success) throw new Error('players api error'); return j.result as any[]
    }
  }
  return call()
}
