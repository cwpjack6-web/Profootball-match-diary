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

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'context' | 'growth' | 'opponent'>('overview');

  // Badges collapsible
  const [badgesExpanded, setBadgesExpanded] = useState(false);

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

  // ── Helper: calc W/D/L/goals/rating from a subset ─────────────────────────
  const calcGroup = (ms: typeof filteredMatches) => {
    const total = ms.length;
    if (total === 0) return { total, w: 0, d: 0, l: 0, winRate: 0, goals: 0, avgRating: 0 };
    const w = ms.filter(m => m.scoreMyTeam > m.scoreOpponent).length;
    const d = ms.filter(m => m.scoreMyTeam === m.scoreOpponent).length;
    const l = total - w - d;
    const goals = ms.reduce((a, m) => a + m.arthurGoals, 0);
    const avgRating = parseFloat((ms.reduce((a, m) => a + (m.rating || 0), 0) / total).toFixed(1));
    return { total, w, d, l, winRate: Math.round((w / total) * 100), goals, avgRating };
  };

  // ── 1. Home vs Away ───────────────────────────────────────────────────────
  const homeAwayData = useMemo(() => ({
    home: calcGroup(filteredMatches.filter(m => m.isHome)),
    away: calcGroup(filteredMatches.filter(m => !m.isHome)),
  }), [filteredMatches]);

  // ── 2. Position frequency ─────────────────────────────────────────────────
  const positionData = useMemo(() => {
    const freq: Record<string, number> = {};
    filteredMatches.forEach(m => {
      (m.positionPlayed || []).forEach(p => { freq[p] = (freq[p] || 0) + 1; });
    });
    const total = filteredMatches.length || 1;
    return Object.entries(freq)
      .map(([pos, count]) => ({ pos, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [filteredMatches]);

  // ── 3. Match type breakdown ───────────────────────────────────────────────
  const matchTypeData = useMemo(() => [
    { key: 'league',   label: t.typeLeague,   color: '#3b82f6', ...calcGroup(filteredMatches.filter(m => (m.matchType || 'league') === 'league')) },
    { key: 'cup',      label: t.typeCup,      color: '#a855f7', ...calcGroup(filteredMatches.filter(m => m.matchType === 'cup')) },
    { key: 'friendly', label: t.typeFriendly, color: '#10b981', ...calcGroup(filteredMatches.filter(m => m.matchType === 'friendly')) },
  ].filter(d => d.total > 0), [filteredMatches, t]);

  // ── 4. Streak ─────────────────────────────────────────────────────────────
  const streakData = useMemo(() => {
    const sorted = [...filteredMatches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (sorted.length === 0) return { current: 0, currentType: 'none' as const, bestWin: 0, bestUnbeaten: 0 };
    const result = (m: typeof sorted[0]) =>
      m.scoreMyTeam > m.scoreOpponent ? 'w' : m.scoreMyTeam < m.scoreOpponent ? 'l' : 'd';
    let current = 1;
    let currentType: 'win' | 'unbeaten' | 'loss' | 'none' = 'none';
    const last = result(sorted[sorted.length - 1]);
    currentType = last === 'w' ? 'win' : last === 'd' ? 'unbeaten' : 'loss';
    for (let i = sorted.length - 2; i >= 0; i--) {
      const r = result(sorted[i]);
      if (currentType === 'win' && r === 'w') current++;
      else if (currentType === 'unbeaten' && (r === 'w' || r === 'd')) current++;
      else if (currentType === 'loss' && r === 'l') current++;
      else break;
    }
    let bestWin = 0, tmpWin = 0;
    sorted.forEach(m => { if (result(m) === 'w') { tmpWin++; bestWin = Math.max(bestWin, tmpWin); } else tmpWin = 0; });
    let bestUnbeaten = 0, tmpU = 0;
    sorted.forEach(m => { if (result(m) !== 'l') { tmpU++; bestUnbeaten = Math.max(bestUnbeaten, tmpU); } else tmpU = 0; });
    return { current, currentType, bestWin, bestUnbeaten };
  }, [filteredMatches]);

  // ── 5. Weather & pitch impact ─────────────────────────────────────────────
  const conditionData = useMemo(() => {
    const weatherMap: Record<string, typeof filteredMatches> = {};
    const pitchMap: Record<string, typeof filteredMatches> = {};
    filteredMatches.forEach(m => {
      if (m.weather) weatherMap[m.weather] = [...(weatherMap[m.weather] || []), m];
      if (m.pitchType) pitchMap[m.pitchType] = [...(pitchMap[m.pitchType] || []), m];
    });
    const weatherRows = Object.entries(weatherMap).map(([key, ms]) => ({ key, ...calcGroup(ms) })).sort((a, b) => b.total - a.total);
    const pitchRows   = Object.entries(pitchMap).map(([key, ms]) => ({ key, ...calcGroup(ms) })).sort((a, b) => b.total - a.total);
    return { weatherRows, pitchRows };
  }, [filteredMatches]);

  // ── 6. Opponent difficulty ────────────────────────────────────────────────
  const opponentData = useMemo(() => {
    const map: Record<string, typeof filteredMatches> = {};
    filteredMatches.forEach(m => { map[m.opponent] = [...(map[m.opponent] || []), m]; });
    return Object.entries(map)
      .filter(([, ms]) => ms.length >= 2)
      .map(([opp, ms]) => ({ opp, ...calcGroup(ms) }))
      .sort((a, b) => a.winRate - b.winRate);
  }, [filteredMatches]);

  // ── 7. Format impact ─────────────────────────────────────────────────────
  const formatData = useMemo(() => {
    const map: Record<string, typeof filteredMatches> = {};
    filteredMatches.forEach(m => { const fmt = m.matchFormat || 'other'; map[fmt] = [...(map[fmt] || []), m]; });
    return Object.entries(map).map(([fmt, ms]) => ({ fmt, ...calcGroup(ms) })).sort((a, b) => b.total - a.total);
  }, [filteredMatches]);

  // ── 8. Peak matches Top 3 ────────────────────────────────────────────────
  const peakMatches = useMemo(() => {
    return [...filteredMatches]
      .map(m => ({ ...m, score: (m.rating || 0) * 2 + m.arthurGoals * 3 + m.arthurAssists * 2 + (m.isMotm ? 5 : 0) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [filteredMatches]);

  // ── 9. Progress speed ────────────────────────────────────────────────────
  const progressData = useMemo(() => {
    const sorted = [...filteredMatches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (sorted.length < 4) return null;
    const mid = Math.floor(sorted.length / 2);
    const early  = sorted.slice(0, mid);
    const recent = sorted.slice(mid);
    const avgEarly  = parseFloat((early.reduce((a, m) => a + (m.rating || 0), 0) / early.length).toFixed(1));
    const avgRecent = parseFloat((recent.reduce((a, m) => a + (m.rating || 0), 0) / recent.length).toFixed(1));
    const diff = parseFloat((avgRecent - avgEarly).toFixed(1));
    const byQuarter: { label: string; avg: number }[] = [];
    const qMap: Record<string, number[]> = {};
    sorted.forEach(m => {
      const d = new Date(m.date);
      const key = `${d.getFullYear()} Q${Math.floor((d.getMonth() + 3) / 3)}`;
      if (!qMap[key]) qMap[key] = [];
      qMap[key].push(m.rating || 0);
    });
    Object.entries(qMap).sort().forEach(([label, ratings]) => {
      byQuarter.push({ label, avg: parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) });
    });
    return { avgEarly, avgRecent, diff, earlyCount: early.length, recentCount: recent.length, byQuarter };
  }, [filteredMatches]);

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

    const svgW   = 600;
    const svgH   = 170;
    const padX   = 40;
    const padY   = 30;
    const graphW = svgW - padX * 2;
    const graphH = svgH - padY * 2;

    const getX = (i: number) => (i / (chartData.length - 1)) * graphW + padX;

    // ── Fixed Y-axis scales (not dynamic) ──────────────────────────────────
    // Rating: always 0–10 (native scale)
    // Goals & Assists: always 0–5 (fixed cap — scoring 5 in one match is extreme)
    // This keeps proportions honest and consistent across all months.
    const RATING_MAX  = 10;
    const GA_MAX      = 5;

    const getRatingY  = (v: number) => svgH - padY - (v / RATING_MAX) * graphH;
    const getGoalsY   = (v: number) => svgH - padY - (Math.min(v, GA_MAX) / GA_MAX) * graphH;
    const getAssistsY = (v: number) => svgH - padY - (Math.min(v, GA_MAX) / GA_MAX) * graphH;

    const buildPolyline = (mapper: (d: typeof chartData[0]) => number) =>
      chartData.map((d, i) => `${getX(i)},${mapper(d)}`).join(' ');

    const buildAreaPath = (mapper: (d: typeof chartData[0]) => number) => {
      const pts  = chartData.map((d, i) => `${getX(i)},${mapper(d)}`);
      const first = pts[0].split(',')[0];
      const last  = pts[pts.length - 1].split(',')[0];
      return `M${first},${svgH - padY} L${pts.join(' L')} L${last},${svgH - padY} Z`;
    };

    // Label Y-offsets per series to avoid stacking on the same point
    // Rating: above dot  Goals: upper-right  Assists: upper-left
    const LABEL_OFFSET: Record<ChartSeries, { dx: number; dy: number }> = {
      rating:  { dx:  0, dy: -11 },
      goals:   { dx: +9, dy:  -7 },
      assists: { dx: -9, dy:  -7 },
    };

    const SERIES_CONFIG = [
      {
        key:      'rating'  as ChartSeries,
        label:    t.rating,
        color:    '#3b82f6',
        gradId:   'gradRating',
        mapper:   (d: typeof chartData[0]) => getRatingY(d.rating),
        getValue: (d: typeof chartData[0]) => d.rating,
      },
      {
        key:      'goals'   as ChartSeries,
        label:    t.goals,
        color:    '#10b981',
        gradId:   'gradGoals',
        mapper:   (d: typeof chartData[0]) => getGoalsY(d.goals),
        getValue: (d: typeof chartData[0]) => d.goals,
      },
      {
        key:      'assists' as ChartSeries,
        label:    t.assists,
        color:    '#8b5cf6',
        gradId:   'gradAssists',
        mapper:   (d: typeof chartData[0]) => getAssistsY(d.assists),
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

        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-48 overflow-visible select-none">
          <defs>
            {SERIES_CONFIG.map(s => (
              <linearGradient key={s.gradId} id={s.gradId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.2" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {/* Grid lines — based on rating scale (left axis) */}
          {[2, 4, 6, 8, 10].map(v => (
            <line key={v}
              x1={padX} y1={getRatingY(v)}
              x2={svgW - padX} y2={getRatingY(v)}
              stroke="#e2e8f0" strokeDasharray="4,4" strokeWidth="1"
            />
          ))}

          {/* Left Y-axis labels: rating scale */}
          {[5, 10].map(v => (
            <text key={'r' + v} x={padX - 6} y={getRatingY(v) + 4}
              textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="bold">
              {v}
            </text>
          ))}

          {/* Right Y-axis labels: goals/assists scale (0–5) */}
          {[0, 2, 4].map(v => (
            <text key={'g' + v} x={svgW - padX + 8} y={getGoalsY(v) + 4}
              textAnchor="start" fontSize="9" fill="#94a3b8" fontWeight="bold">
              {v}
            </text>
          ))}

          {/* Right axis label */}
          <text x={svgW - padX + 8} y={padY - 10}
            textAnchor="start" fontSize="8" fill="#cbd5e1" fontWeight="bold">
            G/A
          </text>

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

          {/* Dots + value labels
              - Zero value → hollow dot, no label
              - Non-zero  → solid dot, label staggered by series to avoid overlap */}
          {SERIES_CONFIG.filter(s => activeSeries.has(s.key)).map(s =>
            chartData.map((d, i) => {
              const x      = getX(i);
              const y      = s.mapper(d);
              const val    = s.getValue(d);
              const isZero = val === 0;
              const off    = LABEL_OFFSET[s.key];

              return (
                <g key={s.key + i}>
                  {isZero ? (
                    // Hollow circle for zero
                    <circle cx={x} cy={y} r="3.5"
                      fill="white" stroke={s.color} strokeWidth="1.5" opacity="0.5" />
                  ) : (
                    // Solid circle for non-zero
                    <circle cx={x} cy={y} r="4.5"
                      fill="white" stroke={s.color} strokeWidth="2.5" />
                  )}
                  {/* Label only for non-zero values */}
                  {!isZero && (
                    <text
                      x={x + off.dx}
                      y={y + off.dy}
                      textAnchor="middle"
                      fontSize="9"
                      fill={s.color}
                      fontWeight="bold"
                    >
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
          {t.attackInfluence}
          <span className="text-[10px] font-normal text-slate-400 ml-1">
            {t.attackInfluenceFormula}
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
              <span className="text-[9px] font-bold text-slate-400 uppercase">{t.influence}</span>
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
                {t.teamTotalGoals}
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
                ? t.attackTierCore
                : pct >= 25
                  ? t.attackTierKey
                  : t.attackTierGrowing}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ── Active tab state ────────────────────────────────────────────────────
  const TABS = [
    { id: 'overview',  icon: 'fa-chart-pie',    labelZh: '總覽',  labelEn: 'Overview' },
    { id: 'context',   icon: 'fa-cloud-sun',    labelZh: '環境',  labelEn: 'Context'  },
    { id: 'growth',    icon: 'fa-seedling',     labelZh: '成長',  labelEn: 'Growth'   },
    { id: 'opponent',  icon: 'fa-chess',        labelZh: '對手',  labelEn: 'Opponent' },
  ] as const;
  type TabId = typeof TABS[number]['id'];

  return (
    <div className="pb-32 animate-fade-in">

      {/* ── Sticky header: filters + tab bar ─────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white shadow-sm border-b border-slate-100">

        {/* Filters */}
        <div className="p-3 flex flex-col gap-2">
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

        {/* Tab bar */}
        <div className="flex border-t border-slate-100">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-[10px] font-black uppercase tracking-wide transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              <i className={`fas ${tab.icon} text-sm`} />
              {(t as any)[`tab_${tab.id}`] || tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────────── */}
      <div className="p-4 space-y-4">

        {/* ══ OVERVIEW TAB ══════════════════════════════════════════════════ */}
        {activeTab === 'overview' && <>

          {/* Stat cards */}
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

          {/* Attack contribution */}
          {stats.teamGoals > 0 && <AttackRing />}

          {/* Rating trend */}
          <div className="bg-white rounded-xl p-5 shadow border border-slate-100">
            <div className="flex justify-between items-end mb-4 border-b border-slate-50 pb-2">
              <h3 className="text-sm font-bold text-slate-800">
                <i className="fas fa-chart-line text-blue-500 mr-2" />{t.ratingTrend}
              </h3>
              <div className="text-right">
                <div className="text-2xl font-black text-blue-600 leading-none">{stats.avgRating}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase">{t.avgRating}</div>
              </div>
            </div>
            <Chart />
          </div>

          {/* Streak */}
          {filteredMatches.length >= 2 && (
            <div className="bg-white rounded-xl shadow border border-slate-100 p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <i className="fas fa-fire text-orange-500" /> {t.streakTitle}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className={`rounded-xl p-3 text-center border-2 ${
                  streakData.currentType === 'win'  ? 'bg-emerald-50 border-emerald-200' :
                  streakData.currentType === 'loss' ? 'bg-rose-50 border-rose-200' :
                  'bg-slate-50 border-slate-200'}`}>
                  <div className={`text-3xl font-black ${
                    streakData.currentType === 'win'  ? 'text-emerald-600' :
                    streakData.currentType === 'loss' ? 'text-rose-500' : 'text-slate-500'}`}>
                    {streakData.current}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                    {streakData.currentType === 'win' ? t.streakWin :
                     streakData.currentType === 'loss' ? t.streakLoss : t.streakUnbeaten}
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                  <div className="text-2xl font-black text-emerald-600">{streakData.bestWin}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{t.bestWinStreak}</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                  <div className="text-2xl font-black text-blue-600">{streakData.bestUnbeaten}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{t.bestUnbeaten}</div>
                </div>
              </div>
            </div>
          )}

          {/* Badges — collapsible */}
          <div className="bg-white rounded-xl shadow border border-slate-100 overflow-hidden">
            <button onClick={() => setBadgesExpanded(v => !v)}
              className="w-full p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                  <i className="fas fa-rocket text-blue-500" /> {t.achievements}
                </h3>
                <span className="text-xs font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                  LVL {totalLevel}
                </span>
              </div>
              <i className={`fas fa-chevron-${badgesExpanded ? 'up' : 'down'} text-slate-400 text-xs`} />
            </button>
            {/* Always-visible progress bar */}
            <div className="px-4 pt-3 pb-1">
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-600 transition-all duration-1000"
                  style={{ width: `${(totalLevel / maxLevel) * 100}%` }} />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-bold">
                <span>{t.growthPoints}: {totalLevel}</span>
                <span>Max: {maxLevel}</span>
              </div>
            </div>
            {badgesExpanded && (
              <div className="p-4 pt-2 grid grid-cols-3 gap-3 animate-fade-in">
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
            )}
          </div>
        </>}

        {/* ══ CONTEXT TAB ═══════════════════════════════════════════════════ */}
        {activeTab === 'context' && <>

          {/* Home vs Away */}
          {(homeAwayData.home.total > 0 || homeAwayData.away.total > 0) && (
            <div className="bg-white rounded-xl shadow border border-slate-100 p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <i className="fas fa-home text-blue-500" /> {t.homeAwayTitle}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: t.home, data: homeAwayData.home, color: 'blue' },
                  { label: t.away, data: homeAwayData.away, color: 'orange' },
                ].map(({ label, data, color }) => (
                  <div key={label} className={`rounded-xl p-3 border bg-${color}-50 border-${color}-100`}>
                    <div className={`text-xs font-black text-${color}-600 uppercase mb-2`}>{label} ({data.total}{t.matchesUnit})</div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-bold">{t.winRate}</span>
                        <span className={`text-sm font-black text-${color}-600`}>{data.winRate}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <div className={`h-full bg-${color}-400 rounded-full`} style={{ width: `${data.winRate}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 pt-1">
                        <span className="text-emerald-600">{data.w}{t.winShort}</span>
                        <span>{data.d}{t.drawShort}</span>
                        <span className="text-rose-500">{data.l}{t.lossShort}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 border-t border-white/60 pt-1">
                        <span>⚽ {data.goals}</span>
                        <span>★ {data.avgRating}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Match type */}
          {matchTypeData.length >= 2 && (
            <div className="bg-white rounded-xl shadow border border-slate-100 p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <i className="fas fa-trophy text-purple-500" /> {t.matchTypeTitle}
              </h3>
              <div className="space-y-3">
                {matchTypeData.map(d => (
                  <div key={d.key}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: d.color }} />
                        {d.label}
                        <span className="text-slate-400 font-normal">({d.total}{t.matchesUnit})</span>
                      </span>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        <span className="text-emerald-600">{d.w}{t.winShort}</span>
                        <span>{d.d}{t.drawShort}</span>
                        <span className="text-rose-500">{d.l}{t.lossShort}</span>
                        <span className="ml-1 font-black" style={{ color: d.color }}>{d.winRate}%</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${d.winRate}%`, backgroundColor: d.color }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>⚽ {d.goals}</span>
                      <span>★ avg {d.avgRating}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Format impact */}
          {formatData.length >= 2 && (
            <div className="bg-white rounded-xl shadow border border-slate-100 p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <i className="fas fa-users text-teal-500" /> {t.formatTitle}
              </h3>
              <div className="space-y-2">
                {formatData.map(d => {
                  const maxWin = Math.max(...formatData.map(x => x.winRate), 1);
                  return (
                    <div key={d.fmt} className="flex items-center gap-3">
                      <span className="text-xs font-black text-slate-600 w-12 text-center bg-slate-100 rounded px-1 py-0.5">{d.fmt}</span>
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-400 rounded-full transition-all"
                          style={{ width: `${(d.winRate / maxWin) * 100}%` }} />
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 w-28 justify-end">
                        <span className="text-teal-600 font-black">{d.winRate}%</span>
                        <span className="text-slate-300">|</span>
                        <span>{d.total}{t.matchesUnit}</span>
                        <span>★{d.avgRating}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Weather & Pitch */}
          {(conditionData.weatherRows.length > 0 || conditionData.pitchRows.length > 0) && (
            <div className="bg-white rounded-xl shadow border border-slate-100 p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <i className="fas fa-cloud-sun text-sky-500" /> {t.conditionTitle}
              </h3>
              {conditionData.weatherRows.length > 0 && (
                <div className="mb-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase mb-2">{t.weather}</div>
                  <div className="space-y-2">
                    {conditionData.weatherRows.map(row => {
                      const icon = row.key === 'sunny' ? 'fa-sun' : row.key === 'rain' ? 'fa-cloud-rain' :
                        row.key === 'cloudy' ? 'fa-cloud' : row.key === 'night' ? 'fa-moon' :
                        row.key === 'hot' ? 'fa-temperature-high' : 'fa-wind';
                      const label = (t as any)[`weather${row.key.charAt(0).toUpperCase() + row.key.slice(1)}`] || row.key;
                      return (
                        <div key={row.key} className="flex items-center gap-2">
                          <i className={`fas ${icon} text-sky-400 w-4 text-center text-xs`} />
                          <span className="text-xs text-slate-600 font-bold w-14">{label}</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-sky-400" style={{ width: `${row.winRate}%` }} />
                          </div>
                          <span className="text-[10px] font-black text-sky-600 w-8 text-right">{row.winRate}%</span>
                          <span className="text-[10px] text-slate-400 w-8 text-right">{row.total}{t.matchesUnit}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {conditionData.pitchRows.length > 0 && (
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase mb-2">{t.pitch}</div>
                  <div className="space-y-2">
                    {conditionData.pitchRows.map(row => {
                      const label = (t as any)[`pitch${row.key.charAt(0).toUpperCase() + row.key.slice(1)}`] || row.key;
                      return (
                        <div key={row.key} className="flex items-center gap-2">
                          <i className="fas fa-layer-group text-emerald-400 w-4 text-center text-xs" />
                          <span className="text-xs text-slate-600 font-bold w-14">{label}</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${row.winRate}%` }} />
                          </div>
                          <span className="text-[10px] font-black text-emerald-600 w-8 text-right">{row.winRate}%</span>
                          <span className="text-[10px] text-slate-400 w-8 text-right">{row.total}{t.matchesUnit}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="text-[9px] text-slate-300 mt-3 text-center">{t.conditionDisclaimer}</p>
            </div>
          )}

          {/* Empty state */}
          {homeAwayData.home.total === 0 && homeAwayData.away.total === 0 &&
           matchTypeData.length < 2 && formatData.length < 2 &&
           conditionData.weatherRows.length === 0 && conditionData.pitchRows.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <i className="fas fa-cloud-sun text-4xl mb-3 opacity-30" />
              <p className="text-sm font-bold">{t.notEnoughData}</p>
            </div>
          )}
        </>}

        {/* ══ GROWTH TAB ════════════════════════════════════════════════════ */}
        {activeTab === 'growth' && <>

          {/* Progress speed */}
          {progressData ? (
            <div className="bg-white rounded-xl shadow border border-slate-100 p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <i className="fas fa-chart-line text-violet-500" /> {t.progressTitle}
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 text-center bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">{t.progressEarly}</div>
                  <div className="text-2xl font-black text-slate-600">{progressData.avgEarly}</div>
                  <div className="text-[9px] text-slate-400">{t.progressFirstN.replace('{n}', String(progressData.earlyCount))}</div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className={`text-2xl font-black ${progressData.diff > 0 ? 'text-emerald-500' : progressData.diff < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                    {progressData.diff > 0 ? '▲' : progressData.diff < 0 ? '▼' : '─'}
                    {Math.abs(progressData.diff)}
                  </div>
                  <div className="text-[9px] text-slate-400 font-bold">{t.change}</div>
                </div>
                <div className="flex-1 text-center bg-violet-50 rounded-xl p-3 border border-violet-100">
                  <div className="text-[10px] text-violet-500 font-bold uppercase mb-1">{t.progressRecent}</div>
                  <div className="text-2xl font-black text-violet-600">{progressData.avgRecent}</div>
                  <div className="text-[9px] text-violet-400">{t.progressRecentN.replace('{n}', String(progressData.recentCount))}</div>
                </div>
              </div>
              {progressData.byQuarter.length >= 2 && (
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase mb-2">{t.progressQuarterly}</div>
                  <div className="flex items-end gap-1 h-16">
                    {progressData.byQuarter.map((q, i) => {
                      const maxAvg = Math.max(...progressData.byQuarter.map(x => x.avg), 1);
                      const heightPct = (q.avg / maxAvg) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                          <span className="text-[8px] font-black text-violet-600">{q.avg}</span>
                          <div className="w-full bg-violet-100 rounded-t-sm" style={{ height: `${heightPct}%`, minHeight: '4px' }}>
                            <div className="w-full h-full bg-violet-400 rounded-t-sm" />
                          </div>
                          <span className="text-[7px] text-slate-400 truncate w-full text-center">{q.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="text-[9px] text-slate-400 mt-3 text-center">
                {progressData.diff > 0.5 ? t.progressImproving :
                 progressData.diff > 0 ? t.progressSlightImprove :
                 progressData.diff < -0.5 ? t.progressDecline :
                 t.progressStable}
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-400 border border-slate-100">
              <i className="fas fa-seedling text-3xl mb-2 opacity-40" />
              <p className="text-xs font-bold">{t.progressNeedMore}</p>
            </div>
          )}

          {/* Peak matches */}
          {peakMatches.length > 0 && (
            <div className="bg-white rounded-xl shadow border border-slate-100 p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <i className="fas fa-crown text-yellow-500" /> {t.peakTitle} Top {peakMatches.length}
              </h3>
              <div className="space-y-3">
                {peakMatches.map((m, i) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const resultColor = m.scoreMyTeam > m.scoreOpponent ? 'text-emerald-600' :
                    m.scoreMyTeam < m.scoreOpponent ? 'text-rose-500' : 'text-slate-500';
                  return (
                    <div key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                      i === 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-slate-50 border-slate-100'}`}>
                      <span className="text-xl">{medals[i]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-black text-slate-700 truncate">vs {m.opponent}</span>
                          {m.isMotm && <span className="text-[9px] bg-yellow-200 text-yellow-800 font-bold px-1 rounded">MOTM</span>}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                          <span>{m.date}</span>
                          <span className={`font-black ${resultColor}`}>{m.scoreMyTeam}-{m.scoreOpponent}</span>
                          {m.arthurGoals > 0 && <span className="text-emerald-600">⚽{m.arthurGoals}</span>}
                          {m.arthurAssists > 0 && <span className="text-indigo-600">👟{m.arthurAssists}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-black text-yellow-600">{m.rating}</span>
                        <span className="text-[8px] text-slate-400 font-bold">{t.rating}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Position distribution */}
          {positionData.length > 0 && (
            <div className="bg-white rounded-xl shadow border border-slate-100 p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                <i className="fas fa-running text-indigo-500" /> {t.positionTitle}
              </h3>
              <p className="text-[10px] text-slate-400 mb-3">{t.positionHint}</p>
              <div className="flex flex-wrap gap-2">
                {positionData.map(d => {
                  const intensity = Math.max(20, d.pct);
                  return (
                    <div key={d.pos} className="flex flex-col items-center gap-1">
                      <div className="relative w-14 h-14 rounded-xl flex items-center justify-center border-2 border-indigo-100"
                        style={{ backgroundColor: `rgba(99,102,241,${intensity / 150})` }}>
                        <span className="text-sm font-black text-indigo-800">{d.pos}</span>
                        <span className="absolute -top-1.5 -right-1.5 text-[9px] font-black bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center">
                          {d.count}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400">{d.pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>}

        {/* ══ OPPONENT TAB ══════════════════════════════════════════════════ */}
        {activeTab === 'opponent' && <>

          {opponentData.length > 0 ? (
            <div className="bg-white rounded-xl shadow border border-slate-100 p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <i className="fas fa-chess text-rose-500" /> {t.opponentDiffTitle}
                <span className="text-[10px] font-normal text-slate-400">({t.opponentDiffHint})</span>
              </h3>
              <div className="space-y-2">
                {opponentData.map((d, i) => {
                  const isHard = d.winRate < 40;
                  const isEasy = d.winRate >= 70;
                  return (
                    <div key={d.opp} className="flex items-center gap-2 py-1">
                      <span className="text-base w-6 text-center">
                        {i === 0 ? '😤' : i === opponentData.length - 1 ? '😊' : ''}
                      </span>
                      <span className="text-xs font-bold text-slate-700 flex-1 truncate">{d.opp}</span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <span className="text-emerald-600">{d.w}{t.winShort}</span>
                        <span>{d.d}{t.drawShort}</span>
                        <span className="text-rose-500">{d.l}{t.lossShort}</span>
                      </div>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                        isHard ? 'bg-rose-100 text-rose-600' :
                        isEasy ? 'bg-emerald-100 text-emerald-600' :
                        'bg-slate-100 text-slate-600'}`}>
                        {d.winRate}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <i className="fas fa-chess text-4xl mb-3 opacity-30" />
              <p className="text-sm font-bold">{t.opponentNeedMore}</p>
            </div>
          )}
        </>}

      </div>{/* end tab content */}

      {/* ── Badge Detail Modal ─────────────────────────────────────────────── */}
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
