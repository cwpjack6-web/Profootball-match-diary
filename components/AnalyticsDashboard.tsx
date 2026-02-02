
import React, { useState, useMemo } from 'react';
import { AnalyticsProps } from '../types';
import { getTeamColorStyles, getTeamById } from '../utils/colors';
import { useLanguage } from '../context/LanguageContext';
import SeasonShareModal from './SeasonShareModal';
import { calculateBadges, BadgeState, getTierLabelKey } from '../utils/badges';

type TimeFilterType = 'all' | 'year' | 'season' | 'month';

const AnalyticsDashboard: React.FC<AnalyticsProps> = ({ matches, profile }) => {
  const { t } = useLanguage();
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [matchTypeFilter, setMatchTypeFilter] = useState<string>('all');
  const [timeFilterType, setTimeFilterType] = useState<TimeFilterType>('all');
  const [timeFilterValue, setTimeFilterValue] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Badge Modal State
  const [selectedBadge, setSelectedBadge] = useState<BadgeState | null>(null);

  // Filter out scheduled matches for ALL stats
  const completedMatches = useMemo(() => {
      return matches.filter(m => m.status !== 'scheduled');
  }, [matches]);

  // Time Options logic
  const timeOptions = useMemo(() => {
    const years = new Set<string>();
    const months = new Set<string>();
    const quarters = new Set<string>();
    completedMatches.forEach(m => {
      const d = new Date(m.date);
      const year = d.getFullYear().toString();
      const month = d.toLocaleString('en-US', { month: '2-digit' });
      const q = Math.floor((d.getMonth() + 3) / 3);
      years.add(year);
      months.add(`${year}-${month}`);
      quarters.add(`${year}-Q${q}`);
    });
    return {
      years: Array.from(years).sort().reverse(),
      months: Array.from(months).sort().reverse(),
      quarters: Array.from(quarters).sort().reverse()
    };
  }, [completedMatches]);

  const handleTypeChange = (newType: TimeFilterType) => {
    setTimeFilterType(newType);
    if (newType === 'year' && timeOptions.years.length > 0) setTimeFilterValue(timeOptions.years[0]);
    if (newType === 'season' && timeOptions.quarters.length > 0) setTimeFilterValue(timeOptions.quarters[0]);
    if (newType === 'month' && timeOptions.months.length > 0) setTimeFilterValue(timeOptions.months[0]);
  };

  const filteredMatches = useMemo(() => {
    let result = completedMatches;
    if (teamFilter !== 'all') result = result.filter(m => m.teamId === teamFilter);
    if (matchTypeFilter !== 'all') result = result.filter(m => (m.matchType || 'league') === matchTypeFilter);
    if (timeFilterType !== 'all' && timeFilterValue) {
      if (timeFilterType === 'year') result = result.filter(m => m.date.startsWith(timeFilterValue));
      else if (timeFilterType === 'month') result = result.filter(m => m.date.startsWith(timeFilterValue));
      else if (timeFilterType === 'season') {
        const [year, qStr] = timeFilterValue.split('-Q');
        const q = parseInt(qStr);
        result = result.filter(m => {
          const d = new Date(m.date);
          const mQ = Math.floor((d.getMonth() + 3) / 3);
          return d.getFullYear().toString() === year && mQ === q;
        });
      }
    }
    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [completedMatches, teamFilter, matchTypeFilter, timeFilterType, timeFilterValue]);

  const stats = useMemo(() => {
    return {
      totalGoals: filteredMatches.reduce((acc, m) => acc + m.arthurGoals, 0),
      totalAssists: filteredMatches.reduce((acc, m) => acc + m.arthurAssists, 0),
      matchesPlayed: filteredMatches.length,
      avgRating: filteredMatches.length > 0 
        ? (filteredMatches.reduce((acc, m) => acc + (m.rating || 0), 0) / filteredMatches.length).toFixed(1) 
        : '0.0'
    };
  }, [filteredMatches]);

  const { badges, totalLevel, maxLevel } = useMemo(() => calculateBadges(filteredMatches), [filteredMatches]);

  // Chart Logic
  const chartData = useMemo(() => {
    if (filteredMatches.length === 0) return [];
    // Only show last 10 matches if too many to prevent overcrowding, or show all if specifically filtered
    const dataToShow = timeFilterType === 'all' && filteredMatches.length > 15 
        ? filteredMatches.slice(filteredMatches.length - 15) 
        : filteredMatches;
        
    return dataToShow.map(m => ({ date: m.date, rating: m.rating || 0 }));
  }, [filteredMatches, timeFilterType]);
  
  const Chart = () => {
      if (chartData.length < 2) return <div className="text-center text-slate-400 py-10 text-xs">{t.trendNeedMoreData}</div>;
      
      const height = 150;
      const width = 600; // High res internal width
      const paddingX = 40;
      const paddingY = 30;
      const graphHeight = height - (paddingY * 2);
      const graphWidth = width - (paddingX * 2);
      const maxRating = 10;

      const getX = (i: number) => (i / (chartData.length - 1)) * graphWidth + paddingX;
      const getY = (r: number) => height - paddingY - (r / maxRating) * graphHeight;

      const points = chartData.map((d, i) => `${getX(i)},${getY(d.rating)}`).join(' ');

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible select-none">
          {/* Grid Lines */}
          <line x1={paddingX} y1={getY(5)} x2={width - paddingX} y2={getY(5)} stroke="#e2e8f0" strokeDasharray="5,5" strokeWidth="1" />
          <line x1={paddingX} y1={getY(10)} x2={width - paddingX} y2={getY(10)} stroke="#e2e8f0" strokeDasharray="5,5" strokeWidth="1" />
          
          {/* Axis Labels */}
          <text x={paddingX - 10} y={getY(5) + 4} textAnchor="end" className="text-[10px] fill-slate-300 font-bold">5</text>
          <text x={paddingX - 10} y={getY(10) + 4} textAnchor="end" className="text-[10px] fill-slate-300 font-bold">10</text>

          {/* Connection Line */}
          <polyline fill="none" stroke="#3b82f6" strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Area fill (optional visual flair) */}
          <path d={`M${points.split(' ')[0].split(',')[0]},${height-paddingY} L${points.replace(/ /g, ' L')} L${points.split(' ').pop()?.split(',')[0]},${height-paddingY} Z`} fill="url(#gradient)" opacity="0.1" />
          <defs>
            <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          {/* Data Points */}
          {chartData.map((d, i) => {
             const x = getX(i);
             const y = getY(d.rating);
             const dateObj = new Date(d.date);
             const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
             
             return (
                 <g key={i}>
                    {/* The Dot */}
                    <circle cx={x} cy={y} r="5" fill="white" stroke="#3b82f6" strokeWidth="3" />
                    
                    {/* Rating Value (Top) */}
                    <text x={x} y={y - 12} textAnchor="middle" className="text-sm font-black fill-slate-700">{d.rating}</text>
                    
                    {/* Date (Bottom) */}
                    <text x={x} y={height - 5} textAnchor="middle" className="text-[10px] font-bold fill-slate-400">{dateStr}</text>
                 </g>
             );
          })}
        </svg>
      );
  };

  return (
    <div className="pb-32 animate-fade-in">
       {/* Filters */}
       <div className="p-3 bg-white sticky top-0 z-20 shadow-sm border-b border-slate-100 flex flex-col gap-2">
           <div className="flex gap-2">
              <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="flex-1 bg-slate-100 text-sm rounded-lg px-3 py-2 outline-none border border-slate-200 font-bold text-slate-700">
                <option value="all">{t.allTeams}</option>
                {profile.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
               <select value={matchTypeFilter} onChange={(e) => setMatchTypeFilter(e.target.value)} className="flex-1 bg-slate-100 text-sm rounded-lg px-3 py-2 outline-none border border-slate-200 font-bold text-slate-700">
                <option value="all">{t.allTypes}</option>
                <option value="league">{t.typeLeague}</option>
                <option value="cup">{t.typeCup}</option>
                <option value="friendly">{t.typeFriendly}</option>
              </select>
           </div>
           <select value={timeFilterType} onChange={(e) => handleTypeChange(e.target.value as TimeFilterType)} className="w-full bg-slate-100 text-sm rounded-lg px-3 py-2 outline-none border border-slate-200 font-bold text-slate-700">
             <option value="all">{t.allTime}</option>
             <option value="year">{t.filterYear}</option>
             <option value="season">{t.filterSeason}</option>
             <option value="month">{t.filterMonth}</option>
           </select>
           {timeFilterType !== 'all' && (
              <select value={timeFilterValue} onChange={(e) => setTimeFilterValue(e.target.value)} className="w-full bg-blue-50 text-blue-700 text-sm rounded-lg px-3 py-2 outline-none border border-blue-200 font-bold">
                 {timeFilterType === 'year' && timeOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
                 {timeFilterType === 'season' && timeOptions.quarters.map(q => <option key={q} value={q}>{q}</option>)}
                 {timeFilterType === 'month' && timeOptions.months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
           )}
           {filteredMatches.length > 0 && <button onClick={() => setShowShareModal(true)} className="w-full bg-slate-800 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2"><i className="fas fa-share-alt"></i> {t.shareSeason}</button>}
       </div>

       <div className="p-4 space-y-4">
          {/* Main Stats */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl p-4 text-white shadow-lg"><div className="text-3xl font-black">{stats.totalGoals}</div><div className="text-xs opacity-80 font-bold uppercase">{t.totalGoals}</div></div>
             <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl p-4 text-white shadow-lg"><div className="text-3xl font-black">{stats.totalAssists}</div><div className="text-xs opacity-80 font-bold uppercase">{t.totalAssists}</div></div>
          </div>
          
          {/* Rating Trend */}
          <div className="bg-white rounded-xl p-5 shadow border border-slate-100">
              <div className="flex justify-between items-end mb-4 border-b border-slate-50 pb-2">
                  <h3 className="text-sm font-bold text-slate-800"><i className="fas fa-chart-line text-blue-500 mr-2"></i>{t.ratingTrend}</h3>
                  <div className="text-right">
                      <div className="text-2xl font-black text-blue-600 leading-none">{stats.avgRating}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">{t.avgRating}</div>
                  </div>
              </div>
              <Chart />
          </div>

          {/* Growth Journey & Badges */}
          <div className="bg-white rounded-xl shadow border border-slate-100 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                   <div className="flex justify-between items-center mb-2">
                       <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                           <i className="fas fa-rocket text-blue-500"></i> {t.achievements}
                       </h3>
                       <span className="text-xs font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                           LVL {totalLevel}
                       </span>
                   </div>
                   {/* Overall Progress Bar */}
                   <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-gradient-to-r from-blue-400 to-indigo-600 transition-all duration-1000" 
                         style={{ width: `${(totalLevel / maxLevel) * 100}%` }}
                       ></div>
                   </div>
                   <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-bold">
                       <span>{t.growthPoints}: {totalLevel}</span>
                       <span>Max: {maxLevel}</span>
                   </div>
              </div>

              {/* Badges Grid */}
              <div className="p-4 grid grid-cols-3 gap-3">
                  {badges.map(badge => (
                      <button 
                        key={badge.id} 
                        onClick={() => setSelectedBadge(badge)}
                        className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-300 active:scale-95 ${badge.color}`}
                      >
                          <div className="mb-2 text-2xl">
                              <i className={`fas ${badge.icon}`}></i>
                          </div>
                          <span className="text-[10px] font-bold leading-tight uppercase tracking-wide">{t[badge.labelKey as keyof typeof t]}</span>
                          
                          {/* Mini Progress Bar below badge */}
                          {badge.currentTier !== 'diamond' && (
                              <div className="w-full h-1 bg-black/10 rounded-full mt-2 overflow-hidden">
                                  <div className="h-full bg-current opacity-50" style={{ width: `${badge.progressPercent}%` }}></div>
                              </div>
                          )}
                          
                          {/* Tier Indicator */}
                          <div className="mt-1 text-[9px] font-black opacity-70">
                              {t[getTierLabelKey(badge.currentTier) as keyof typeof t]}
                          </div>
                      </button>
                  ))}
              </div>
          </div>
       </div>

       {/* Badge Detail Modal */}
       {selectedBadge && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-fade-in" onClick={() => setSelectedBadge(null)}>
               <div className="bg-white w-full max-w-sm rounded-2xl p-6 relative shadow-2xl" onClick={e => e.stopPropagation()}>
                   <button onClick={() => setSelectedBadge(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">
                       <i className="fas fa-times"></i>
                   </button>
                   
                   <div className="flex flex-col items-center text-center">
                       <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-4 border-4 ${selectedBadge.color.replace('border-', 'border-opacity-50 ')}`}>
                           <i className={`fas ${selectedBadge.icon} ${selectedBadge.currentTier === 'locked' ? 'text-slate-300' : ''}`}></i>
                       </div>
                       
                       <h2 className="text-xl font-black text-slate-800 uppercase mb-1">{t[selectedBadge.labelKey as keyof typeof t]}</h2>
                       <p className="text-sm text-slate-500 font-medium mb-6">{t[selectedBadge.descriptionKey as keyof typeof t]}</p>

                       <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100 mb-4">
                           <div className="flex justify-between items-end mb-2">
                               <span className="text-xs font-bold text-slate-400 uppercase">{t.progress}</span>
                               <span className="text-lg font-black text-blue-600">
                                   {selectedBadge.currentValue} <span className="text-slate-400 text-xs font-medium">/ {selectedBadge.nextThreshold}</span>
                               </span>
                           </div>
                           <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden border border-slate-100">
                               <div className="h-full bg-blue-500 transition-all duration-500 relative" style={{ width: `${selectedBadge.progressPercent}%` }}>
                                   <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
                               </div>
                           </div>
                       </div>

                       {selectedBadge.nextTier && (
                           <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                               <span>{t.nextLevel}:</span>
                               <span className={`${selectedBadge.nextTier === 'bronze' ? 'text-orange-600' : selectedBadge.nextTier === 'silver' ? 'text-slate-600' : selectedBadge.nextTier === 'gold' ? 'text-yellow-600' : 'text-cyan-600'}`}>
                                   {t[getTierLabelKey(selectedBadge.nextTier) as keyof typeof t]} ({selectedBadge.nextThreshold})
                               </span>
                           </div>
                       )}
                       {!selectedBadge.nextTier && (
                           <div className="text-emerald-500 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                               <i className="fas fa-check-circle mr-1"></i> Max Level Reached!
                           </div>
                       )}
                   </div>
               </div>
           </div>
       )}

       <SeasonShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} matches={filteredMatches} profile={profile} title={teamFilter !== 'all' ? getTeamById(profile.teams, teamFilter).name : t.allTeams} />
    </div>
  );
};

export default AnalyticsDashboard;
