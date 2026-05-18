'use client';
import { useState, useEffect, useMemo } from 'react';

const COLORS = {
  sakura:'#F2A7BB', mint:'#7DD4C0', sky:'#7EC8E3', sun:'#FFD166',
  coral:'#FF6B6B', navy:'#1A2B4A', cream:'#FFF8F2', white:'#FFFFFF',
  gray:'#8899AA', lightGray:'#EEF2F7', purple:'#A78BFA', orange:'#FB923C',
};

const ALL_23KU = [
  '千代田区','中央区','港区','新宿区','文京区','台東区','墨田区','江東区',
  '品川区','目黒区','大田区','世田谷区','渋谷区','中野区','杉並区','豊島区',
  '北区','荒川区','板橋区','練馬区','足立区','葛飾区','江戸川区',
];

const AREA_GROUPS = {
  '都心部':['千代田区','中央区','港区','新宿区','文京区','渋谷区'],
  '東部':  ['台東区','墨田区','江東区','荒川区','足立区','葛飾区','江戸川区'],
  '南部':  ['品川区','目黒区','大田区','世田谷区'],
  '西部':  ['中野区','杉並区','練馬区'],
  '北部':  ['豊島区','北区','板橋区'],
};

const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const DAY_NAMES   = ['日','月','火','水','木','金','土'];

const TARGET_OPTIONS = [
  { value:'all',    label:'👨‍👩‍👧 全員',     color:COLORS.navy },
  { value:'kids',   label:'👶 子ども向け', color:COLORS.coral },
  { value:'adult',  label:'🍷 大人向け',   color:COLORS.purple },
  { value:'family', label:'🏠 ファミリー', color:COLORS.mint },
  { value:'senior', label:'👴 シニア向け', color:COLORS.orange },
];

const EVENT_CATEGORIES = [
  { value:'festival',  label:'🎪 お祭り・縁日' },
  { value:'fireworks', label:'🎆 花火大会' },
  { value:'music',     label:'🎵 音楽・ライブ' },
  { value:'food',      label:'🍜 グルメ・マルシェ' },
  { value:'art',       label:'🎨 アート・展示' },
  { value:'sport',     label:'⚽ スポーツ・体験' },
  { value:'nature',    label:'🌸 自然・公園' },
  { value:'learn',     label:'📚 学び・ワークショップ' },
  { value:'nightlife', label:'🌙 ナイトイベント' },
];

function getDaysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function getFirstDay(y,m){ return new Date(y,m,1).getDay(); }

function applyFilters(events,{selectedAreas,selectedTargets,selectedCategories,freeOnly,indoorOnly,outdoorOnly}){
  return events.filter(ev=>{
    if(selectedAreas.length>0 && !selectedAreas.includes(ev.area)) return false;
    if(selectedTargets.length>0 && !selectedTargets.includes(ev.target) && ev.target!=='all') return false;
    if(selectedCategories.length>0 && !selectedCategories.includes(ev.category)) return false;
    if(freeOnly && !ev.free) return false;
    if(indoorOnly && ev.indoor===false) return false;
    if(outdoorOnly && ev.indoor===true) return false;
    return true;
  });
}

export default function App() {
  const now = new Date();
  const [view,setView]               = useState('calendar');
  const [events,setEvents]           = useState([]);
  const [loading,setLoading]         = useState(true);
  const [error,setError]             = useState(null);
  const [currentMonth,setCurrentMonth] = useState(now.getMonth());
  const [currentYear,setCurrentYear]   = useState(now.getFullYear());
  const [selectedDate,setSelectedDate] = useState(null);
  const [mapDate,setMapDate]           = useState(null);
  const [showFilters,setShowFilters]   = useState(false);
  const [showDetail,setShowDetail]     = useState(null);
  const [openAreaGroup,setOpenAreaGroup] = useState(null);
  const [favorites,setFavorites]       = useState([]);

  const [selectedAreas,setSelectedAreas]           = useState([]);
  const [selectedTargets,setSelectedTargets]       = useState([]);
  const [selectedCategories,setSelectedCategories] = useState([]);
  const [freeOnly,setFreeOnly]     = useState(false);
  const [indoorOnly,setIndoorOnly] = useState(false);
  const [outdoorOnly,setOutdoorOnly] = useState(false);

  useEffect(()=>{
    fetchEvents();
    try {
      const saved = localStorage.getItem('favorites');
      if(saved) setFavorites(JSON.parse(saved));
    } catch {}
  },[]);

  async function fetchEvents(){
    setLoading(true);
    try {
      const month = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}`;
      const res = await fetch(`/api/events?month=${month}`);
      const data = await res.json();
      if(data.success) setEvents(data.events);
      else setError(data.error);
    } catch(e){
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ fetchEvents(); },[currentMonth, currentYear]);

  const filterState = {selectedAreas,selectedTargets,selectedCategories,freeOnly,indoorOnly,outdoorOnly};
  const filteredEvents = useMemo(()=>applyFilters(events,filterState),
    [events,selectedAreas,selectedTargets,selectedCategories,freeOnly,indoorOnly,outdoorOnly]);

  const getEventsForDay = (day)=>{
    const dateStr = `${currentYear}/${String(currentMonth+1).padStart(2,'0')}/${String(day).padStart(2,'0')}`;
    return filteredEvents.filter(ev=>ev.date===dateStr);
  };

  const activeFilterCount =
    selectedAreas.length+selectedTargets.length+selectedCategories.length+
    (freeOnly?1:0)+(indoorOnly?1:0)+(outdoorOnly?1:0);

  const toggle=(setter,val)=>setter(p=>p.includes(val)?p.filter(v=>v!==val):[...p,val]);

  const toggleFav=(id)=>{
    setFavorites(p=>{
      const next = p.includes(id)?p.filter(f=>f!==id):[...p,id];
      try { localStorage.setItem('favorites',JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const resetFilters=()=>{
    setSelectedAreas([]);setSelectedTargets([]);setSelectedCategories([]);
    setFreeOnly(false);setIndoorOnly(false);setOutdoorOnly(false);
  };

  const days     = getDaysInMonth(currentYear,currentMonth);
  const firstDay = getFirstDay(currentYear,currentMonth);
  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : [];
  const mapEvents = mapDate ? getEventsForDay(mapDate) : [];
  const favEvents = events.filter(ev=>favorites.includes(ev.id));

  return (
    <div style={{fontFamily:"'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif",
      background:COLORS.cream,minHeight:'100vh',maxWidth:430,margin:'0 auto',
      position:'relative',boxShadow:'0 0 40px rgba(0,0,0,0.15)'}}>

      {/* HEADER */}
      <div style={{background:'linear-gradient(135deg,#F2A7BB 0%,#FFD166 50%,#7DD4C0 100%)',
        padding:'16px 16px 12px',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:10,color:'rgba(26,43,74,0.65)',fontWeight:700,letterSpacing:2}}>TOKYO EVENT NAVI</div>
            <div style={{fontSize:20,fontWeight:800,color:COLORS.navy}}>おでかけカレンダー 🗓️</div>
          </div>
          <button onClick={()=>setShowFilters(!showFilters)} style={{
            background:showFilters?COLORS.navy:'rgba(255,255,255,0.85)',
            border:'none',borderRadius:12,padding:'8px 12px',fontSize:12,fontWeight:700,
            color:showFilters?COLORS.white:COLORS.navy,cursor:'pointer',
            display:'flex',alignItems:'center',gap:4,position:'relative'}}>
            🔍 しぼり込み
            {activeFilterCount>0&&<span style={{position:'absolute',top:-6,right:-6,
              background:COLORS.coral,color:COLORS.white,borderRadius:'50%',
              width:18,height:18,fontSize:10,fontWeight:800,
              display:'flex',alignItems:'center',justifyContent:'center'}}>{activeFilterCount}</span>}
          </button>
        </div>

        {showFilters&&(
          <div style={{background:'rgba(255,255,255,0.97)',borderRadius:16,padding:14,
            marginTop:10,boxShadow:'0 4px 24px rgba(0,0,0,0.12)',maxHeight:'72vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <span style={{fontSize:13,fontWeight:800,color:COLORS.navy}}>絞り込み条件</span>
              {activeFilterCount>0&&<button onClick={resetFilters} style={{
                background:COLORS.lightGray,border:'none',borderRadius:8,
                padding:'4px 10px',fontSize:11,fontWeight:700,color:COLORS.gray,cursor:'pointer'}}>✕ リセット</button>}
            </div>
            <FilterSection label="👥 対象者">
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {TARGET_OPTIONS.map(t=>(
                  <FilterChip key={t.value} active={selectedTargets.includes(t.value)}
                    onClick={()=>toggle(setSelectedTargets,t.value)} activeColor={t.color}>{t.label}</FilterChip>
                ))}
              </div>
            </FilterSection>
            <FilterSection label="🎪 イベント種別">
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {EVENT_CATEGORIES.map(c=>(
                  <FilterChip key={c.value} active={selectedCategories.includes(c.value)}
                    onClick={()=>toggle(setSelectedCategories,c.value)} activeColor={COLORS.purple}>{c.label}</FilterChip>
                ))}
              </div>
            </FilterSection>
            <FilterSection label="💡 その他条件">
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                <FilterChip active={freeOnly} onClick={()=>setFreeOnly(!freeOnly)} activeColor={COLORS.mint}>🆓 無料のみ</FilterChip>
                <FilterChip active={indoorOnly} onClick={()=>{setIndoorOnly(!indoorOnly);if(!indoorOnly)setOutdoorOnly(false);}} activeColor={COLORS.sky}>🏠 屋内のみ</FilterChip>
                <FilterChip active={outdoorOnly} onClick={()=>{setOutdoorOnly(!outdoorOnly);if(!outdoorOnly)setIndoorOnly(false);}} activeColor="#7BBF6A">🌿 屋外のみ</FilterChip>
              </div>
            </FilterSection>
            <FilterSection label="📍 地域（東京23区）">
              <div style={{display:'flex',gap:6,marginBottom:8}}>
                <button onClick={()=>setSelectedAreas([...ALL_23KU])} style={{padding:'4px 10px',borderRadius:8,border:'none',background:COLORS.navy,color:COLORS.white,fontSize:11,fontWeight:700,cursor:'pointer'}}>全選択</button>
                <button onClick={()=>setSelectedAreas([])} style={{padding:'4px 10px',borderRadius:8,border:'none',background:COLORS.lightGray,color:COLORS.gray,fontSize:11,fontWeight:700,cursor:'pointer'}}>全解除</button>
                {selectedAreas.length>0&&<span style={{fontSize:11,color:COLORS.coral,fontWeight:700,alignSelf:'center'}}>{selectedAreas.length}区選択中</span>}
              </div>
              {Object.entries(AREA_GROUPS).map(([grpName,areas])=>{
                const isOpen=openAreaGroup===grpName;
                const cnt=areas.filter(a=>selectedAreas.includes(a)).length;
                return(
                  <div key={grpName} style={{marginBottom:5}}>
                    <button onClick={()=>setOpenAreaGroup(isOpen?null:grpName)} style={{
                      width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',
                      background:isOpen?'#EEF2FF':COLORS.lightGray,border:'none',borderRadius:10,
                      padding:'8px 12px',cursor:'pointer',marginBottom:isOpen?6:0}}>
                      <span style={{fontSize:12,fontWeight:700,color:COLORS.navy}}>
                        {grpName}
                        {cnt>0&&<span style={{marginLeft:6,background:COLORS.sky,color:COLORS.white,borderRadius:10,padding:'1px 7px',fontSize:10}}>{cnt}</span>}
                      </span>
                      <span style={{fontSize:11,color:COLORS.gray}}>{isOpen?'▲':'▼'}</span>
                    </button>
                    {isOpen&&<div style={{display:'flex',gap:5,flexWrap:'wrap',paddingLeft:6}}>
                      {areas.map(area=>(
                        <FilterChip key={area} active={selectedAreas.includes(area)}
                          onClick={()=>toggle(setSelectedAreas,area)} activeColor={COLORS.sky} small>{area}</FilterChip>
                      ))}
                    </div>}
                  </div>
                );
              })}
            </FilterSection>
            <button onClick={()=>setShowFilters(false)} style={{
              width:'100%',padding:12,borderRadius:12,border:'none',
              background:`linear-gradient(135deg,${COLORS.coral},${COLORS.sakura})`,
              color:COLORS.white,fontWeight:800,fontSize:14,cursor:'pointer',marginTop:4}}>
              {activeFilterCount>0?`この条件で表示（${filteredEvents.length}件）`:'閉じる'}
            </button>
          </div>
        )}
      </div>

      {/* タブ */}
      <div style={{display:'flex',background:COLORS.white,
        borderBottom:`2px solid ${COLORS.lightGray}`,position:'sticky',top:86,zIndex:90}}>
        {[{key:'calendar',icon:'📅',label:'カレンダー'},
          {key:'map',icon:'🗺️',label:'マップ'},
          {key:'favorites',icon:'❤️',label:'お気に入り'}].map(tab=>(
          <button key={tab.key} onClick={()=>setView(tab.key)} style={{
            flex:1,padding:'12px 0',border:'none',background:'none',fontSize:12,fontWeight:700,
            color:view===tab.key?COLORS.coral:COLORS.gray,
            borderBottom:view===tab.key?`3px solid ${COLORS.coral}`:'3px solid transparent',cursor:'pointer'}}>
            {tab.icon} {tab.label}
            {tab.key==='favorites'&&favorites.length>0&&(
              <span style={{marginLeft:3,background:COLORS.coral,color:COLORS.white,borderRadius:10,padding:'1px 5px',fontSize:9}}>{favorites.length}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{paddingBottom:90}}>
        {loading&&<LoadingView/>}
        {error&&<ErrorView message={error} onRetry={fetchEvents}/>}

        {!loading&&!error&&view==='calendar'&&(
          <CalendarView
            currentYear={currentYear} currentMonth={currentMonth}
            setCurrentYear={setCurrentYear} setCurrentMonth={setCurrentMonth}
            filteredEvents={filteredEvents} getEventsForDay={getEventsForDay}
            selectedDate={selectedDate} setSelectedDate={setSelectedDate}
            selectedDateEvents={selectedDateEvents}
            favorites={favorites} toggleFav={toggleFav}
            setShowDetail={setShowDetail} activeFilterCount={activeFilterCount}
            days={days} firstDay={firstDay}
          />
        )}
        {!loading&&!error&&view==='map'&&(
          <MapView
            currentYear={currentYear} currentMonth={currentMonth}
            getEventsForDay={getEventsForDay} mapDate={mapDate} setMapDate={setMapDate}
            mapEvents={mapEvents} favorites={favorites} toggleFav={toggleFav}
            setShowDetail={setShowDetail} firstDay={firstDay}
            filteredEvents={filteredEvents}
          />
        )}
        {!loading&&!error&&view==='favorites'&&(
          <FavoritesView favEvents={favEvents} favorites={favorites}
            toggleFav={toggleFav} setShowDetail={setShowDetail}/>
        )}
      </div>

      {showDetail&&(
        <DetailModal event={showDetail} favorites={favorites}
          toggleFav={toggleFav} onClose={()=>setShowDetail(null)}/>
      )}

      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',
        width:'100%',maxWidth:430,background:'rgba(255,255,255,0.96)',
        backdropFilter:'blur(10px)',borderTop:`1px solid ${COLORS.lightGray}`,
        padding:'8px 0 14px',display:'flex',justifyContent:'space-around',zIndex:150}}>
        {[{key:'calendar',icon:'📅',label:'カレンダー'},
          {key:'map',icon:'🗺️',label:'マップ'},
          {key:'favorites',icon:'❤️',label:'お気に入り'}].map(tab=>(
          <button key={tab.key} onClick={()=>setView(tab.key)} style={{
            background:'none',border:'none',cursor:'pointer',
            display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'4px 20px'}}>
            <span style={{fontSize:22}}>{tab.icon}</span>
            <span style={{fontSize:10,fontWeight:700,color:view===tab.key?COLORS.coral:COLORS.gray}}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CalendarView({currentYear,currentMonth,setCurrentYear,setCurrentMonth,
  filteredEvents,getEventsForDay,selectedDate,setSelectedDate,selectedDateEvents,
  favorites,toggleFav,setShowDetail,activeFilterCount,days,firstDay}){

  const prevMonth=()=>{
    if(currentMonth===0){setCurrentMonth(11);setCurrentYear(y=>y-1);}
    else setCurrentMonth(m=>m-1);
  };
  const nextMonth=()=>{
    if(currentMonth===11){setCurrentMonth(0);setCurrentYear(y=>y+1);}
    else setCurrentMonth(m=>m+1);
  };
  const today=new Date();

  return(
    <>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px 6px'}}>
        <button onClick={prevMonth} style={mBtn}>‹</button>
        <div style={{fontSize:19,fontWeight:800,color:COLORS.navy}}>
          {currentYear}年 {MONTH_NAMES[currentMonth]}
          {activeFilterCount>0&&<span style={{fontSize:11,color:COLORS.coral,fontWeight:700,marginLeft:8}}>{filteredEvents.length}件</span>}
        </div>
        <button onClick={nextMonth} style={mBtn}>›</button>
      </div>

      <div style={{padding:'0 12px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:3}}>
          {DAY_NAMES.map((d,i)=>(
            <div key={d} style={{textAlign:'center',fontSize:11,fontWeight:700,padding:'3px 0',
              color:i===0?COLORS.coral:i===6?COLORS.sky:COLORS.gray}}>{d}</div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
          {Array(firstDay).fill(null).map((_,i)=><div key={`e${i}`}/>)}
          {Array(days).fill(null).map((_,i)=>{
            const day=i+1;
            const dayEvs=getEventsForDay(day);
            const isSelected=selectedDate===day;
            const isToday=day===today.getDate()&&currentMonth===today.getMonth()&&currentYear===today.getFullYear();
            const dow=(firstDay+i)%7;
            return(
              <button key={day} onClick={()=>setSelectedDate(isSelected?null:day)} style={{
                aspectRatio:'1',borderRadius:10,
                border:isSelected?`2px solid ${COLORS.coral}`:isToday?`2px solid ${COLORS.mint}`:'2px solid transparent',
                background:isSelected?COLORS.coral:isToday?'#E8FAF7':COLORS.white,
                cursor:'pointer',display:'flex',flexDirection:'column',
                alignItems:'center',justifyContent:'center',padding:2,
                boxShadow:isSelected?`0 3px 10px rgba(255,107,107,0.3)`:'0 1px 3px rgba(0,0,0,0.05)',
                transition:'all 0.15s'}}>
                <span style={{fontSize:13,fontWeight:700,
                  color:isSelected?COLORS.white:dow===0?COLORS.coral:dow===6?COLORS.sky:COLORS.navy}}>{day}</span>
                <div style={{display:'flex',gap:1}}>
                  {dayEvs.slice(0,3).map((ev,j)=><span key={j} style={{fontSize:7}}>{ev.tag||'📅'}</span>)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate&&(
        <div style={{padding:'14px 14px 0'}}>
          <div style={{fontSize:13,fontWeight:800,color:COLORS.navy,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
            <span style={{background:COLORS.coral,color:COLORS.white,borderRadius:8,padding:'2px 10px',fontSize:12}}>
              {currentMonth+1}月{selectedDate}日
            </span>
            のイベント
            {selectedDateEvents.length===0&&<span style={{color:COLORS.gray,fontWeight:400,fontSize:12}}>（なし）</span>}
          </div>
          {selectedDateEvents.map(ev=>(
            <EventCard key={ev.id} event={ev} favorites={favorites}
              onFavorite={toggleFav} onDetail={()=>setShowDetail(ev)}/>
          ))}
        </div>
      )}

      <div style={{padding:'16px 14px 0'}}>
        <div style={{fontSize:13,fontWeight:800,color:COLORS.navy,marginBottom:8}}>
          📌 今月のイベント一覧
          <span style={{fontSize:11,color:COLORS.gray,fontWeight:400,marginLeft:6}}>{filteredEvents.length}件</span>
        </div>
        {filteredEvents.length===0?(
          <div style={{textAlign:'center',padding:'40px 0',color:COLORS.gray}}>
            <div style={{fontSize:32,marginBottom:8}}>🔍</div>
            <div style={{fontWeight:600,fontSize:13}}>条件に合うイベントがありません</div>
            <div style={{fontSize:12,marginTop:4}}>絞り込みを変えてみてください</div>
          </div>
        ):filteredEvents.slice(0,10).map(ev=>(
          <EventCard key={ev.id} event={ev} favorites={favorites}
            onFavorite={toggleFav} onDetail={()=>setShowDetail(ev)}/>
        ))}
        {filteredEvents.length>10&&(
          <div style={{textAlign:'center',padding:'8px 0',fontSize:12,color:COLORS.gray,fontWeight:600}}>
            他 {filteredEvents.length-10} 件
          </div>
        )}
      </div>
    </>
  );
}

// ─── マップビュー（Google Maps Embed API使用）────────────
function MapView({currentYear,currentMonth,getEventsForDay,mapDate,setMapDate,
  mapEvents,favorites,toggleFav,setShowDetail,firstDay,filteredEvents}){

  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  // 選択された日のイベントの座標からマップURLを生成
  const getMapUrl = () => {
    if (!mapDate || mapEvents.length === 0) return null;

    // 座標があるイベントを優先
    const evWithCoords = mapEvents.filter(ev => ev.lat && ev.lng);

    if (evWithCoords.length === 1) {
      // 1件の場合はその場所を中心に表示
      return `https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${evWithCoords[0].lat},${evWithCoords[0].lng}&zoom=10&language=ja`;
    } else if (evWithCoords.length > 1) {
      // 複数件の場合は検索で表示
      const query = encodeURIComponent(evWithCoords.map(e => e.place).join(' OR '));
      return `https://www.google.com/maps/embed/v1/search?key=${mapsKey}&q=${query}&language=ja`;
    } else {
      // 座標なしの場合は会場名で検索
      const query = encodeURIComponent(mapEvents[0].place + ' ' + mapEvents[0].area);
      return `https://www.google.com/maps/embed/v1/search?key=${mapsKey}&q=${query}&language=ja`;
    }
  };

  const mapSrc = getMapUrl();

  // 今日から14日分の日付を表示
  const dateButtons = Array.from({length:14}, (_,i) => {
    const d = new Date(currentYear, currentMonth, new Date().getDate() + i);
    return {
      day: d.getDate(),
      month: d.getMonth(),
      year: d.getFullYear(),
      dow: d.getDay(),
      evs: getEventsForDay(d.getDate()),
    };
  });

  return(
    <div style={{padding:14}}>
      <div style={{fontSize:13,fontWeight:800,color:COLORS.navy,marginBottom:10}}>
        🗓️ 日付を選んでマップで確認
      </div>

      {/* 日付選択バー */}
      <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:8,marginBottom:12}}>
        {dateButtons.map(({day,month,year,dow,evs})=>{
          const isActive = mapDate===day && month===currentMonth;
          return(
            <button key={`${year}${month}${day}`}
              onClick={()=>setMapDate(isActive?null:day)} style={{
              minWidth:50,padding:'8px 0',borderRadius:12,border:'none',
              background:isActive?COLORS.coral:evs.length>0?'#FFF0F3':COLORS.lightGray,
              color:isActive?COLORS.white:evs.length>0?COLORS.coral:COLORS.gray,
              fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0,
              boxShadow:isActive?`0 3px 10px rgba(255,107,107,0.3)`:'none'}}>
              <div style={{fontSize:9,marginBottom:2}}>{DAY_NAMES[dow]}</div>
              {day}
              {evs.length>0&&<div style={{fontSize:8,marginTop:2}}>{evs.length}件</div>}
            </button>
          );
        })}
      </div>

      {/* Google Maps */}
      <div style={{borderRadius:18,overflow:'hidden',marginBottom:14,
        border:`2px solid ${COLORS.sky}`,background:'#E8F4F8',position:'relative'}}>
        {mapSrc ? (
          <iframe
            src={mapSrc}
            width="100%"
            height="300"
            style={{border:0,display:'block'}}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div style={{height:300,display:'flex',alignItems:'center',
            justifyContent:'center',flexDirection:'column',gap:8}}>
            <div style={{fontSize:40}}>📍</div>
            <div style={{fontSize:12,fontWeight:600,color:COLORS.gray,textAlign:'center',padding:'0 20px'}}>
              上の日付を選ぶと<br/>イベント会場がマップに表示されます
            </div>
          </div>
        )}
      </div>

      {/* 選択日のイベント一覧 */}
      {mapDate && mapEvents.length > 0 && (
        <>
          <div style={{fontSize:12,fontWeight:800,color:COLORS.navy,marginBottom:8}}>
            {currentMonth+1}月{mapDate}日のイベント（{mapEvents.length}件）
          </div>
          {mapEvents.map(ev=>(
            <EventCard key={ev.id} event={ev} favorites={favorites}
              onFavorite={toggleFav} onDetail={()=>setShowDetail(ev)}/>
          ))}
        </>
      )}
      {mapDate && mapEvents.length === 0 && (
        <div style={{textAlign:'center',padding:'30px 0',color:COLORS.gray}}>
          <div style={{fontSize:28,marginBottom:8}}>🔍</div>
          <div style={{fontWeight:600,fontSize:13}}>この日のイベントはありません</div>
        </div>
      )}
    </div>
  );
}

function FavoritesView({favEvents,favorites,toggleFav,setShowDetail}){
  return(
    <div style={{padding:14}}>
      <div style={{fontSize:13,fontWeight:800,color:COLORS.navy,marginBottom:10}}>❤️ お気に入りイベント</div>
      {favEvents.length===0?(
        <div style={{textAlign:'center',padding:'50px 0',color:COLORS.gray}}>
          <div style={{fontSize:36,marginBottom:10}}>🔖</div>
          <div style={{fontWeight:600}}>まだお気に入りがありません</div>
          <div style={{fontSize:12,marginTop:4}}>カレンダーの ❤️ を押して保存しよう</div>
        </div>
      ):favEvents.map(ev=>(
        <EventCard key={ev.id} event={ev} favorites={favorites}
          onFavorite={toggleFav} onDetail={()=>setShowDetail(ev)}/>
      ))}
    </div>
  );
}

function DetailModal({event,favorites,toggleFav,onClose}){
  const isFav=favorites.includes(event.id);
  const targetInfo=TARGET_OPTIONS.find(t=>t.value===event.target);
  const mapsUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.place+' '+event.area)}`;

  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(26,43,74,0.65)',
      zIndex:200,display:'flex',alignItems:'flex-end',backdropFilter:'blur(4px)'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:COLORS.white,borderRadius:'22px 22px 0 0',
        padding:22,width:'100%',maxWidth:430,boxShadow:'0 -8px 40px rgba(0,0,0,0.2)'}}>
        <div style={{textAlign:'center',marginBottom:10}}>
          <div style={{fontSize:42}}>{event.tag||'📅'}</div>
        </div>
        <div style={{fontSize:16,fontWeight:800,color:COLORS.navy,marginBottom:8}}>{event.name}</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
          <Tag color={COLORS.sky}>{event.area}</Tag>
          <Tag color={event.free?COLORS.mint:COLORS.sun}>{event.free?'🆓 無料':'💰 有料'}</Tag>
          <Tag color={targetInfo?.color||COLORS.gray}>{targetInfo?.label||'全員'}</Tag>
          <Tag color={event.indoor?COLORS.sakura:'#7BBF6A'}>{event.indoor?'🏠 屋内':'🌿 屋外'}</Tag>
        </div>
        <InfoRow icon="📅" label="日時" value={`${event.date}${event.endDate?' 〜 '+event.endDate:''} ${event.startTime||''}${event.endTime?' 〜 '+event.endTime:''}`}/>
        <InfoRow icon="📍" label="場所" value={event.place}/>
        {event.url&&<InfoRow icon="🔗" label="詳細URL" value={event.url} link/>}

        {/* ミニマップ */}
        {event.lat && event.lng && (
          <div style={{borderRadius:12,overflow:'hidden',marginBottom:12,border:`1px solid ${COLORS.lightGray}`}}>
            <iframe
              src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&q=${event.lat},${event.lng}&zoom=13&language=ja`}
              width="100%"
              height="150"
              style={{border:0,display:'block'}}
              allowFullScreen
              loading="lazy"
            />
          </div>
        )}

        <div style={{display:'flex',gap:8,marginTop:8}}>
          <button onClick={()=>toggleFav(event.id)} style={{
            flex:1,padding:12,borderRadius:12,border:'none',
            background:isFav?'#FFF0F0':COLORS.lightGray,
            color:isFav?COLORS.coral:COLORS.gray,fontWeight:700,fontSize:13,cursor:'pointer'}}>
            {isFav?'❤️ 保存済み':'🤍 お気に入り'}
          </button>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{
            flex:2,padding:12,borderRadius:12,border:'none',textDecoration:'none',
            background:`linear-gradient(135deg,${COLORS.coral},${COLORS.sakura})`,
            color:COLORS.white,fontWeight:800,fontSize:13,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            🗺️ Google Mapで開く
          </a>
        </div>
      </div>
    </div>
  );
}

function EventCard({event,favorites,onFavorite,onDetail}){
  const isFav=favorites.includes(event.id);
  const targetInfo=TARGET_OPTIONS.find(t=>t.value===event.target);
  return(
    <div style={{background:COLORS.white,borderRadius:14,padding:'12px',marginBottom:8,
      boxShadow:'0 2px 10px rgba(0,0,0,0.06)',display:'flex',alignItems:'center',gap:10,
      border:`1px solid ${COLORS.lightGray}`}}>
      <div style={{width:46,height:46,borderRadius:12,flexShrink:0,
        background:`linear-gradient(135deg,${COLORS.cream},#FFE8D6)`,
        display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>
        {event.tag||'📅'}
      </div>
      <div onClick={onDetail} style={{flex:1,minWidth:0,cursor:'pointer'}}>
        <div style={{fontSize:12,fontWeight:700,color:COLORS.navy,marginBottom:4,
          whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{event.name}</div>
        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
          <Tag color={COLORS.sky} small>{event.area}</Tag>
          <Tag color={targetInfo?.color||COLORS.gray} small>{targetInfo?.label}</Tag>
          <Tag color={event.free?COLORS.mint:COLORS.sun} small>{event.free?'🆓':'💰'}</Tag>
          <Tag color={event.indoor?COLORS.sakura:'#7BBF6A'} small>{event.indoor?'🏠':'🌿'}</Tag>
        </div>
      </div>
      <button onClick={()=>onFavorite(event.id)} style={{
        background:isFav?'#FFF0F0':COLORS.lightGray,border:'none',borderRadius:10,
        width:34,height:34,fontSize:15,cursor:'pointer',flexShrink:0,
        display:'flex',alignItems:'center',justifyContent:'center'}}>
        {isFav?'❤️':'🤍'}
      </button>
    </div>
  );
}

function FilterSection({label,children}){
  return(
    <div style={{marginBottom:12}}>
      <div style={{fontSize:11,fontWeight:700,color:COLORS.gray,marginBottom:7,letterSpacing:0.5}}>{label}</div>
      {children}
    </div>
  );
}

function FilterChip({active,onClick,activeColor,children,small}){
  return(
    <button onClick={onClick} style={{
      padding:small?'4px 9px':'5px 11px',borderRadius:20,
      border:active?`2px solid ${activeColor}`:'2px solid transparent',
      fontSize:small?11:12,fontWeight:700,
      background:active?activeColor:COLORS.lightGray,
      color:active?COLORS.white:COLORS.navy,cursor:'pointer',transition:'all 0.15s'}}>
      {children}
    </button>
  );
}

function Tag({color,children,small}){
  return(
    <span style={{background:color,color:COLORS.white,borderRadius:5,
      padding:small?'2px 5px':'3px 9px',fontSize:small?10:12,fontWeight:700,whiteSpace:'nowrap'}}>
      {children}
    </span>
  );
}

function InfoRow({icon,label,value,link}){
  return(
    <div style={{display:'flex',gap:10,marginBottom:9,alignItems:'flex-start'}}>
      <span style={{fontSize:15}}>{icon}</span>
      <div>
        <div style={{fontSize:10,fontWeight:700,color:COLORS.gray,marginBottom:1}}>{label}</div>
        {link
          ?<a href={value} target="_blank" rel="noopener noreferrer"
              style={{fontSize:12,color:COLORS.sky,fontWeight:600,textDecoration:'none',wordBreak:'break-all'}}>{value}</a>
          :<div style={{fontSize:12,fontWeight:600,color:COLORS.navy}}>{value}</div>
        }
      </div>
    </div>
  );
}

function LoadingView(){
  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      padding:'80px 0',gap:16,color:COLORS.gray}}>
      <div style={{fontSize:48}}>🗓️</div>
      <div style={{fontWeight:600,fontSize:14}}>イベント情報を読み込み中...</div>
    </div>
  );
}

function ErrorView({message,onRetry}){
  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      padding:'80px 20px',gap:16,color:COLORS.gray,textAlign:'center'}}>
      <div style={{fontSize:48}}>😵</div>
      <div style={{fontWeight:700,fontSize:14,color:COLORS.coral}}>エラーが発生しました</div>
      <div style={{fontSize:12}}>{message}</div>
      <button onClick={onRetry} style={{padding:'10px 24px',borderRadius:12,border:'none',
        background:COLORS.coral,color:COLORS.white,fontWeight:700,cursor:'pointer'}}>
        再試行
      </button>
    </div>
  );
}

const mBtn={background:COLORS.lightGray,border:'none',borderRadius:10,
  padding:'7px 14px',fontSize:16,cursor:'pointer',fontWeight:700,color:COLORS.navy};