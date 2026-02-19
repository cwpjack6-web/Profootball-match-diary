import React, { useState, useMemo } from 'react';
import { AnalyticsProps } from '../types';
import { getTeamColorStyles, getTeamById } from '../utils/colors';
import { useLanguage } from '../context/LanguageContext';
import ShareCard from './ShareCard';
import { calculateBadges, BadgeState, getTierLabelKey } from '../utils/badges';

type TimeFilterType = 'all' | 'year' | 'season' | 'month';
type ChartSeries = 'rating' | 'goals' | 'assists';

const AnalyticsDashboard: React.FC<AnalyticsProps> = ({ matches, profile }) => {
  const { t } = useLanguage();
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [matchTypeFilter, setMatchTypeFilter] = useState<string>('all');
  const [timeFilterType, setTimeFilterType] = useState<TimeFilterType>('all');
  const [timeFilterValue, setTimeFilterValue] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState(false);

  // Chart series toggles
  const [activeSeries, setActiveSeries] = useState<Set<ChartSeries>>(
    new Set(['rating', 'goals', 'assists'])
  );

  // Badge Modal State
  const [selectedBadge, setSelectedBadge] = useState<BadgeState | null>(null);

  const completedMatches = useMemo(() => {
    return matches.filter(m => m.status !== 'scheduled');
  }, [matches]);

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
    const totalGoals   = filteredMatches.reduce((acc, m) => acc + m.arthurGoals, 0);
    const totalAssists = filteredMatches.reduce((acc, m) => acc + m.arthurAssists, 0);
    const teamGoals    = filteredMatches.reduce((acc, m) => acc + m.scoreMyTeam, 0);
    const contributions = totalGoals + totalAssists;
    const attackShare  = teamGoals > 0 ? Math.round((contributions / teamGoals) * 100) : 0;

    return {
      totalGoals,
      totalAssists,
      matchesPlayed: filteredMatches.length,
      avgRating: filteredMatches.length > 0
        ? (filteredMatches.reduce((acc, m) => acc + (m.rating || 0), 0) / filteredMatches.length).toFixed(1)
        : '0.0',
      teamGoals,
      contributions,
      attackShare,
    };
  }, [filteredMatches]);

  const { badges, totalLevel, maxLevel } = useMemo(() => calculateBadges(filteredMatches), [filteredMatches]);

  // ── Chart data ────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (filteredMatches.length === 0) return [];
    const dataToShow = timeFilterType === 'all' && filteredMatches.length > 15
      ? filteredMatches.slice(filteredMatches.length - 15)
      : filteredMatches;

    return dataToShow.map(m => ({
      date: m.date,
      rating:  m.rating  || 0,
      goals:   m.arthurGoals,
      assists: m.arthurAssists,
    }));
  }, [filteredMatches, timeFilterType]);

  const toggleSeries = (s: ChartSeries) => {
    setActiveSeries(prev => {
      const next = new Set(prev);
      if (next.has(s)) {
        if (next.size > 1) next.delete(s); // keep at least 1
      } else {
        next.add(s);
      }
      return next;
    });
  };

  // ── Multi-line Chart ──────────────────────────────────────────────────────
  const Chart = () => {
    if (chartData.length < 2) {
      return (
        <div className="text-center text-slate-400 py-10 text-xs">
          {t.trendNeedMoreData}
        </div>
      );
    }

    const svgW     = 600;
    const svgH     = 160;
    const padX     = 40;
    const padY     = 28;
    const graphW   = svgW - padX * 2;
    const graphH   = svgH - padY * 2;

    // Normalise each series to 0-10 scale for shared Y axis
    const maxGoals   = Math.max(...chartData.map(d => d.goals), 1);
    const maxAssists = Math.max(...chartData.map(d => d.assists), 1);

    const getX = (i: number) => (i / (chartData.length - 1)) * graphW + padX;

    // Rating: native 0-10
    const getRatingY = (v: number) => svgH - padY - (v / 10) * graphH;
    // Goals: scale max → 10
    const getGoalsY  = (v: number) => svgH - padY - (v / maxGoals) * graphH;
    // Assists: scale max → 10
    const getAssistsY = (v: number) => svgH - padY - (v / maxAssists) * graphH;

    const buildPolyline = (mapper: (d: typeof chartData[0]) => number) =>
      chartData.map((d, i) => `${getX(i)},${mapper(d)}`).join(' ');

    const buildAreaPath = (mapper: (d: typeof chartData[0]) => number) => {
      const pts = chartData.map((d, i) => `${getX(i)},${mapper(d)}`);
      const first = pts[0].split(',')[0];
      const last  = pts[pts.length - 1].split(',')[0];
      return `M${first},${svgH - padY} L${pts.join(' L')} L${last},${svgH - padY} Z`;
    };

    const SERIES_CONFIG = [
      {
        key: 'rating'  as ChartSeries,
        label: t.rating,
        color: '#3b82f6',
        gradId: 'gradRating',
        mapper: (d: typeof chartData[0]) => getRatingY(d.rating),
        getValue: (d: typeof chartData[0]) => d.rating,
      },
      {
        key: 'goals'   as ChartSeries,
        label: t.goals,
        color: '#10b981',
        gradId: 'gradGoals',
        mapper: (d: typeof chartData[0]) => getGoalsY(d.goals),
        getValue: (d: typeof chartData[0]) => d.goals,
      },
      {
        key: 'assists' as ChartSeries,
        label: t.assists,
        color: '#8b5cf6',
        gradId: 'gradAssists',
        mapper: (d: typeof chartData[0]) => getAssistsY(d.assists),
        getValue: (d: typeof chartData[0]) => d.assists,
      },
    ];

    return (
      <>
        {/* Legend / toggles */}
        <div className="flex gap-3 mb-3 flex-wrap">
          {SERIES_CONFIG.map(s => (
            <button
              key={s.key}
              onClick={() => toggleSeries(s.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                activeSeries.has(s.key)
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
              style={activeSeries.has(s.key) ? { backgroundColor: s.color, borderColor: s.color } : {}}
            >
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: activeSeries.has(s.key) ? 'white' : s.color }} />
              {s.label}
            </button>
          ))}
        </div>

        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-44 overflow-visible select-none">
          <defs>
            {SERIES_CONFIG.map(s => (
              <linearGradient key={s.gradId} id={s.gradId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {/* Grid lines */}
          {[3, 5, 7, 10].map(v => (
            <line key={v}
              x1={padX} y1={getRatingY(v)}
              x2={svgW - padX} y2={getRatingY(v)}
              stroke="#e2e8f0" strokeDasharray="4,4" strokeWidth="1"
            />
          ))}
          {/* Y labels (rating scale) */}
          {[5, 10].map(v => (
            <text key={v} x={padX - 6} y={getRatingY(v) + 4}
              textAnchor="end" fontSize="9" fill="#cbd5e1" fontWeight="bold">
              {v}
            </text>
          ))}

          {/* Area fills */}
          {SERIES_CONFIG.filter(s => activeSeries.has(s.key)).map(s => (
            <path key={s.key + '-area'}
              d={buildAreaPath(s.mapper)}
              fill={`url(#${s.gradId})`}
            />
          ))}

          {/* Lines */}
          {SERIES_CONFIG.filter(s => activeSeries.has(s.key)).map(s => (
            <polyline key={s.key + '-line'}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={buildPolyline(s.mapper)}
            />
          ))}

          {/* Dots + value labels */}
          {SERIES_CONFIG.filter(s => activeSeries.has(s.key)).map(s =>
            chartData.map((d, i) => {
              const x = getX(i);
              const y = s.mapper(d);
              const val = s.getValue(d);
              return (
                <g key={s.key + i}>
                  <circle cx={x} cy={y} r="4" fill="white" stroke={s.color} strokeWidth="2.5" />
                  {val > 0 && (
                    <text x={x} y={y - 9} textAnchor="middle" fontSize="9" fill={s.color} fontWeight="bold">
                      {val}
                    </text>
                  )}
                </g>
              );
            })
          )}

          {/* Date labels (bottom) */}
          {chartData.map((d, i) => {
            const dateObj = new Date(d.date);
            const label   = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
            return (
              <text key={i} x={getX(i)} y={svgH - 4}
                textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="bold">
                {label}
              </text>
            );
          })}
        </svg>
      </>
    );
  };

  // ── Attack contribution ring ───────────────────────────────────────────────
  const AttackRing = () => {
    const pct  = Math.min(stats.attackShare, 100);
    const r    = 38;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;

    return (
      <div className="bg-white rounded-xl p-5 shadow border border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <i className="fas fa-crosshairs text-emerald-500" />
          進攻影響力
          <span className="text-[10px] font-normal text-slate-400 ml-1">
            (G+A ÷ 球隊總入球)
          </span>
        </h3>

        <div className="flex items-center gap-6">
          {/* Ring */}
          <div className="relative w-24 h-24 flex-none">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
              <circle cx="50" cy="50" r={r} fill="none"
                stroke={pct >= 50 ? '#10b981' : pct >= 25 ? '#f59e0b' : '#3b82f6'}
                strokeWidth="10"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-slate-800 leading-none">{pct}%</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase">影響力</span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                {profile.name} G+A
              </span>
              <span className="text-sm font-black text-slate-800">{stats.contributions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                球隊總入球
              </span>
              <span className="text-sm font-black text-slate-800">{stats.teamGoals}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  backgroundColor: pct >= 50 ? '#10b981' : pct >= 25 ? '#f59e0b' : '#3b82f6',
                }}
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-snug">
              {pct >= 50
                ? '🔥 進攻核心！球隊超過一半入球與你有關。'
                : pct >= 25
                  ? '⚡ 重要貢獻！你是球隊的主要進攻力量之一。'
                  : '📈 繼續努力，你的進攻參與正在增長！'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-32 animate-fade-in">
      {/* Filters */}
      <div className="p-3 bg-white sticky top-0 z-20 shadow-sm border-b border-slate-100 flex flex-col gap-2">
        <div className="flex gap-2">
          <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}
            className="flex-1 bg-slate-100 text-sm rounded-lg px-3 py-2 outline-none border border-slate-200 font-bold text-slate-700">
            <option value="all">{t.allTeams}</option>
            {profile.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
          <select value={matchTypeFilter} onChange={(e) => setMatchTypeFilter(e.target.value)}
            className="flex-1 bg-slate-100 text-sm rounded-lg px-3 py-2 outline-none border border-slate-200 font-bold text-slate-700">
            <option value="all">{t.allTypes}</option>
            <option value="league">{t.typeLeague}</option>
            <option value="cup">{t.typeCup}</option>
            <option value="friendly">{t.typeFriendly}</option>
          </select>
        </div>
        <select value={timeFilterType} onChange={(e) => handleTypeChange(e.target.value as TimeFilterType)}
          className="w-full bg-slate-100 text-sm rounded-lg px-3 py-2 outline-none border border-slate-200 font-bold text-slate-700">
          <option value="all">{t.allTime}</option>
          <option value="year">{t.filterYear}</option>
          <option value="season">{t.filterSeason}</option>
          <option value="month">{t.filterMonth}</option>
        </select>
        {timeFilterType !== 'all' && (
          <select value={timeFilterValue} onChange={(e) => setTimeFilterValue(e.target.value)}
            className="w-full bg-blue-50 text-blue-700 text-sm rounded-lg px-3 py-2 outline-none border border-blue-200 font-bold">
            {timeFilterType === 'year'   && timeOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
            {timeFilterType === 'season' && timeOptions.quarters.map(q => <option key={q} value={q}>{q}</option>)}
            {timeFilterType === 'month'  && timeOptions.months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
        {filteredMatches.length > 0 && (
          <button onClick={() => setShowShareModal(true)}
            className="w-full bg-slate-800 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2">
            <i className="fas fa-share-alt" /> {t.shareSeason}
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl p-4 text-white shadow-lg">
            <div className="text-3xl font-black">{stats.totalGoals}</div>
            <div className="text-xs opacity-80 font-bold uppercase">{t.totalGoals}</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl p-4 text-white shadow-lg">
            <div className="text-3xl font-black">{stats.totalAssists}</div>
            <div className="text-xs opacity-80 font-bold uppercase">{t.totalAssists}</div>
          </div>
        </div>

        {/* Attack Contribution */}
        {stats.teamGoals > 0 && <AttackRing />}

        {/* Rating + Goals + Assists Trend Chart */}
        <div className="bg-white rounded-xl p-5 shadow border border-slate-100">
          <div className="flex justify-between items-end mb-4 border-b border-slate-50 pb-2">
            <h3 className="text-sm font-bold text-slate-800">
              <i className="fas fa-chart-line text-blue-500 mr-2" />
              {t.ratingTrend}
            </h3>
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
                <i className="fas fa-rocket text-blue-500" /> {t.achievements}
              </h3>
              <span className="text-xs font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                LVL {totalLevel}
              </span>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-600 transition-all duration-1000"
                style={{ width: `${(totalLevel / maxLevel) * 100}%` }} />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-bold">
              <span>{t.growthPoints}: {totalLevel}</span>
              <span>Max: {maxLevel}</span>
            </div>
          </div>

          <div className="p-4 grid grid-cols-3 gap-3">
            {badges.map(badge => (
              <button key={badge.id} onClick={() => setSelectedBadge(badge)}
                className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-300 active:scale-95 ${badge.color}`}>
                <div className="mb-2 text-2xl"><i className={`fas ${badge.icon}`} /></div>
                <span className="text-[10px] font-bold leading-tight uppercase tracking-wide">
                  {t[badge.labelKey as keyof typeof t]}
                </span>
                {badge.currentTier !== 'diamond' && (
                  <div className="w-full h-1 bg-black/10 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-current opacity-50" style={{ width: `${badge.progressPercent}%` }} />
                  </div>
                )}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-fade-in"
          onClick={() => setSelectedBadge(null)}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedBadge(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">
              <i className="fas fa-times" />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-4 border-4 ${selectedBadge.color.replace('border-', 'border-opacity-50 ')}`}>
                <i className={`fas ${selectedBadge.icon} ${selectedBadge.currentTier === 'locked' ? 'text-slate-300' : ''}`} />
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
                    <div className="absolute inset-0 bg-white/20"
                      style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }} />
                  </div>
                </div>
              </div>
              {selectedBadge.nextTier ? (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                  <span>{t.nextLevel}:</span>
                  <span className={`${selectedBadge.nextTier === 'bronze' ? 'text-orange-600' : selectedBadge.nextTier === 'silver' ? 'text-slate-600' : selectedBadge.nextTier === 'gold' ? 'text-yellow-600' : 'text-cyan-600'}`}>
                    {t[getTierLabelKey(selectedBadge.nextTier) as keyof typeof t]} ({selectedBadge.nextThreshold})
                  </span>
                </div>
              ) : (
                <div className="text-emerald-500 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  <i className="fas fa-check-circle mr-1" /> Max Level Reached!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ShareCard
        mode="season"
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        matches={filteredMatches}
        profile={profile}
        title={teamFilter !== 'all' ? getTeamById(profile.teams, teamFilter).name : t.allTeams}
      />
    </div>
  );
};

export default AnalyticsDashboard;
