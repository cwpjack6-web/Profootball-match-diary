import React, { useMemo, useState, useEffect, useRef } from 'react';
import { MatchData, UserProfile } from '../types';
import { getTeamById, getTeamColorStyles } from '../utils/colors';
import { useLanguage } from '../context/LanguageContext';

interface MatchTimelineProps {
  matches: MatchData[]; 
  profile: UserProfile;
  isSelectionMode: boolean;
  selectedMatchIds: Set<string>;
  deleteConfirmId: string | null;
  expandedMatchIds: Set<string>;
  onSelectMatch: (id: string) => void;
  onShare: (e: React.MouseEvent, match: MatchData) => void;
  onEdit: (e: React.MouseEvent, match: MatchData) => void;
  onTrashClick: (e: React.MouseEvent, id: string) => void;
  onConfirmDelete: (e: React.MouseEvent, id: string) => void;
  onCancelDelete: (e: React.MouseEvent) => void;
  onToggleExpansion: (e: React.MouseEvent, id: string) => void;
  onOpenVideo: (e: React.MouseEvent, url: string) => void;
  onOpponentClick: (e: React.MouseEvent, opponent: string) => void;
}

const MatchTimeline: React.FC<MatchTimelineProps> = ({
  matches, profile, isSelectionMode, selectedMatchIds, deleteConfirmId, expandedMatchIds,
  onSelectMatch, onShare, onEdit, onTrashClick, onConfirmDelete, onCancelDelete, onToggleExpansion, onOpenVideo, onOpponentClick
}) => {
  const { t } = useLanguage();
  
  const [expandedMonthGroups, setExpandedMonthGroups] = useState<Set<string>>(new Set());
  const [swipedMatchId, setSwipedMatchId] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);

  const { scheduled, completed } = useMemo(() => ({
    scheduled: matches.filter(m => m.status === 'scheduled').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    completed: matches.filter(m => m.status !== 'scheduled')
  }), [matches]);

  const groupedMatches = useMemo((): Record<string, MatchData[]> => {
    if (!completed || completed.length === 0) return {};
    const groups: Record<string, MatchData[]> = {};
    const sorted = [...completed].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    sorted.forEach(match => {
      const date = new Date(match.date);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(match);
    });
    return groups;
  }, [completed]);

  const groupKeys = useMemo(() => {
    return Object.keys(groupedMatches).sort((a, b) => {
      const [y1, m1] = a.split('-').map(Number);
      const [y2, m2] = b.split('-').map(Number);
      return y2 - y1 || m2 - m1;
    });
  }, [groupedMatches]);

  useEffect(() => {
    if (groupKeys.length > 0 && expandedMonthGroups.size === 0) {
      setExpandedMonthGroups(new Set([groupKeys[0]]));
    }
  }, [groupKeys.length]);

  const toggleMonthGroup = (key: string) => {
    setExpandedMonthGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // ── [改動 3] Fixture countdown helper ────────────────────────────────────────
  const getCountdown = (dateStr: string): { label: string; urgent: boolean } => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const matchDay = new Date(dateStr); matchDay.setHours(0, 0, 0, 0);
    const diffMs = matchDay.getTime() - today.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (days < 0) return { label: '', urgent: false };
    if (days === 0) return { label: t.countdownToday, urgent: true };
    if (days === 1) return { label: t.countdownTomorrow, urgent: true };
    return { label: t.countdownDays.replace('{n}', String(days)), urgent: days <= 3 };
  };

  // ── [改動 1] Month summary calculator ────────────────────────────────────────
  const getMonthSummary = (groupMatches: MatchData[]) => {
    let w = 0, d = 0, l = 0, goals = 0, totalRating = 0, ratingCount = 0;
    groupMatches.forEach(m => {
      if (m.scoreMyTeam > m.scoreOpponent) w++;
      else if (m.scoreMyTeam < m.scoreOpponent) l++;
      else d++;
      goals += m.arthurGoals;
      if (m.rating) { totalRating += m.rating; ratingCount++; }
    });
    const avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : null;
    return { w, d, l, goals, avgRating };
  };

  // ── Touch swipe ───────────────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (_e: React.TouchEvent) => {};
  const handleTouchEnd = (e: React.TouchEvent, id: string) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) setSwipedMatchId(id);
    else if (diff < -50 && swipedMatchId === id) setSwipedMatchId(null);
    touchStartX.current = null;
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const getResultColor = (my: number, op: number) =>
    my > op ? 'border-l-emerald-500' : my < op ? 'border-l-rose-500' : 'border-l-slate-400';

  const getResultBadge = (my: number, op: number) => {
    if (my > op) return <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded shadow-sm">{t.win}</span>;
    if (my < op) return <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-0.5 rounded shadow-sm">{t.loss}</span>;
    return <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded shadow-sm">{t.draw}</span>;
  };

  const getPitchLabel = (type?: string) => {
    switch (type) {
      case 'turf': return t.pitchTurf; case 'artificial': return t.pitchArtificial;
      case 'hard': return t.pitchHard; case 'indoor': return t.pitchIndoor;
      default: return t.pitchOther;
    }
  };

  const getWeatherIcon = (type?: string) => {
    switch (type) {
      case 'sunny': return 'fa-sun'; case 'rain': return 'fa-cloud-rain';
      case 'cloudy': return 'fa-cloud'; case 'night': return 'fa-moon';
      case 'hot': return 'fa-temperature-high'; case 'windy': return 'fa-wind';
      default: return null;
    }
  };

  const getWeatherLabel = (type?: string) => {
    switch (type) {
      case 'sunny': return t.weatherSunny; case 'rain': return t.weatherRain;
      case 'cloudy': return t.weatherCloudy; case 'night': return t.weatherNight;
      case 'hot': return t.weatherHot; case 'windy': return t.weatherWindy;
      default: return null;
    }
  };

  const handleOpenMaps = (e: React.MouseEvent, location: string) => {
    e.stopPropagation();
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank');
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="pb-4" onClick={() => setSwipedMatchId(null)}>

      {/* Scheduled Fixtures */}
      {scheduled.length > 0 && (
        <div className="mb-6">
          <div className="sticky top-12 z-10 bg-blue-50/90 backdrop-blur-sm px-4 py-2 flex items-center justify-between border-b border-blue-100">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-wide flex items-center gap-2">
              <i className="fas fa-calendar-alt"></i> {t.upcomingMatches}
            </h3>
            <span className="text-[10px] font-bold text-blue-400 bg-white px-2 py-0.5 rounded-full border border-blue-100 shadow-sm">{scheduled.length}</span>
          </div>
          <div className="p-4 space-y-4">
            {scheduled.map(match => {
              const team = getTeamById(profile.teams, match.teamId);
              const isSelected = selectedMatchIds.has(match.id);
              // [改動 3] Countdown
              const countdown = getCountdown(match.date);

              return (
                <div key={match.id} onClick={() => isSelectionMode && onSelectMatch(match.id)}
                  className={`bg-white rounded-xl shadow-sm border-2 border-dashed border-slate-200 overflow-hidden relative transition-all duration-200 ${isSelectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {isSelectionMode && (
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                            {isSelected && <i className="fas fa-check text-white text-[10px]"></i>}
                          </div>
                        )}
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">{match.date}</span>

                        {/* [改動 3] Countdown badge */}
                        {countdown.label && (
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full border flex items-center gap-1 ${
                            countdown.urgent
                              ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse'
                              : 'bg-blue-50 text-blue-500 border-blue-100'}`}>
                            <i className={`fas ${countdown.urgent ? 'fa-bell' : 'fa-clock'} text-[9px]`}></i>
                            {countdown.label}
                          </span>
                        )}

                        {match.matchLabel && (
                          <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded border border-purple-200 shadow-sm">
                            {match.matchLabel}
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 bg-slate-50 flex items-center gap-1">
                          {team.logo && <img src={team.logo} className="w-3 h-3 object-contain" alt="logo" />}
                          {team.name}
                        </span>
                        {match.matchFormat && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-400">{match.matchFormat}</span>}
                      </div>
                      {!isSelectionMode && (
                        <div className="flex gap-2 -mr-2 -mt-2 items-center">
                          <button onClick={e => onEdit(e, match)} className="text-slate-400 hover:text-blue-500 p-2"><i className="fas fa-edit"></i></button>
                          {deleteConfirmId === match.id ? (
                            <div className="flex items-center bg-slate-100 rounded p-1">
                              <button onClick={e => onConfirmDelete(e, match.id)} className="bg-red-500 text-white text-[10px] px-2 py-1 rounded mr-1">Confirm</button>
                              <button onClick={onCancelDelete}><i className="fas fa-times"></i></button>
                            </div>
                          ) : (
                            <button onClick={e => onTrashClick(e, match.id)} className="text-slate-400 hover:text-red-500 p-2"><i className="fas fa-trash-alt"></i></button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center mb-4 px-1 gap-2">
                      <div className="w-5/12 flex flex-col justify-center min-h-[3rem]">
                        <div className="font-black text-slate-600 text-base sm:text-lg leading-none break-words line-clamp-2">{team.name}</div>
                      </div>
                      <div className="w-2/12 shrink-0 flex items-center justify-center font-black text-slate-400 italic">VS</div>
                      <div className="w-5/12 flex flex-col items-end justify-center text-right min-h-[3rem]">
                        <div className="font-black text-slate-600 text-base sm:text-lg leading-none break-words line-clamp-2">{match.opponent}</div>
                      </div>
                    </div>

                    {(match.matchTime || match.assemblyTime) && (
                      <div className="flex gap-4 mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {match.matchTime && (
                          <div className="flex-1">
                            <div className="text-[9px] uppercase font-bold text-slate-400">{t.matchTime}</div>
                            <div className="text-sm font-black text-blue-600 flex items-center gap-1">
                              <i className="far fa-clock text-xs"></i> {match.matchTime}
                            </div>
                          </div>
                        )}
                        {match.assemblyTime && (
                          <div className="flex-1">
                            <div className="text-[9px] uppercase font-bold text-slate-400">{t.assemblyTime}</div>
                            <div className="text-sm font-black text-slate-600 flex items-center gap-1">
                              <i className="fas fa-users text-xs"></i> {match.assemblyTime}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {match.location && (
                      <div className="flex justify-between items-center mb-4 border-t border-slate-50 pt-2">
                        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 truncate">
                          <i className="fas fa-map-marker-alt"></i> {match.location}
                        </div>
                        {!isSelectionMode && (
                          <button onClick={e => handleOpenMaps(e, match.location)}
                            className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[10px] font-bold border border-emerald-100 flex items-center gap-1 active:scale-90 transition-transform shrink-0">
                            <i className="fas fa-map"></i> {t.openInMaps}
                          </button>
                        )}
                      </div>
                    )}

                    {!isSelectionMode && (
                      <button onClick={e => { e.stopPropagation(); onEdit(e, { ...match, status: 'completed' }); }}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                        <i className="fas fa-clipboard-check"></i> {t.reportResult}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {groupKeys.length === 0 && scheduled.length === 0 && (
        <div className="text-center py-16 text-slate-400 p-4"><p>{t.noMatches}</p></div>
      )}

      {/* Completed match groups */}
      {groupKeys.map(groupKey => {
        const [year, monthIndex] = groupKey.split('-');
        const title = `${year} ${t[('month' + monthIndex) as keyof typeof t]}`;
        const groupMatches = groupedMatches[groupKey];
        const isGroupExpanded = expandedMonthGroups.has(groupKey);

        // [改動 1] Month summary
        const summary = getMonthSummary(groupMatches);

        return (
          <div key={groupKey} className="scroll-mt-32">
            <button
              onClick={() => toggleMonthGroup(groupKey)}
              className="sticky top-12 z-10 w-full bg-slate-100/95 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between border-b border-slate-200/50 hover:bg-slate-200/50 transition-colors text-left group"
            >
              {/* Left: chevron + month title */}
              <div className="flex items-center gap-2 min-w-0">
                <i className={`fas fa-chevron-right text-xs text-slate-400 transition-transform duration-200 shrink-0 ${isGroupExpanded ? 'rotate-90' : ''}`}></i>
                <h3 className="text-xs font-black text-slate-600 uppercase tracking-wide truncate">{title}</h3>
              </div>

              {/* [改動 1] Right: summary pills */}
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {/* W/D/L */}
                <span className="text-[10px] font-bold bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full shadow-sm font-mono">
                  <span className="text-emerald-600">{summary.w}</span>
                  <span className="text-slate-300 mx-0.5">·</span>
                  <span className="text-slate-400">{summary.d}</span>
                  <span className="text-slate-300 mx-0.5">·</span>
                  <span className="text-rose-500">{summary.l}</span>
                </span>
                {/* Goals */}
                {summary.goals > 0 && (
                  <span className="text-[10px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                    <i className="fas fa-futbol text-[8px]"></i>{summary.goals}
                  </span>
                )}
                {/* Avg rating */}
                {summary.avgRating && (
                  <span className="text-[10px] font-bold bg-yellow-50 border border-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                    <i className="fas fa-star text-[8px]"></i>{summary.avgRating}
                  </span>
                )}
                {/* Match count */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm transition-colors ${isGroupExpanded ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-white text-slate-400 border-slate-200'}`}>
                  {groupMatches.length}
                </span>
              </div>
            </button>

            {isGroupExpanded && (
              <div className="p-4 space-y-4 animate-fade-in">
                {groupMatches.map(match => {
                  const team = getTeamById(profile.teams, match.teamId);
                  const styles = getTeamColorStyles(team.themeColor);
                  const isExpanded = expandedMatchIds.has(match.id);
                  const isSelected = selectedMatchIds.has(match.id);
                  const isSwiped = swipedMatchId === match.id;

                  // [改動 9] Build scorer display list
                  const scorerDisplay = match.scorers
                    ?.filter(s => s.count > 0)
                    .map(s => {
                      const tm = team.roster.find(r => r.id === s.teammateId);
                      return tm ? { name: tm.name, number: tm.number, count: s.count } : null;
                    })
                    .filter(Boolean) as { name: string; number?: string; count: number }[];

                  return (
                    <div key={match.id} id={`match-${match.id}`} className="relative overflow-hidden rounded-xl">
                      {/* Swipe actions */}
                      <div className="absolute inset-y-0 right-0 flex w-32">
                        <button onClick={e => onEdit(e, match)} className="w-1/2 bg-blue-500 text-white flex items-center justify-center font-bold text-xs">
                          <i className="fas fa-edit"></i>
                        </button>
                        <button onClick={e => { if (deleteConfirmId === match.id) onConfirmDelete(e, match.id); else onTrashClick(e, match.id); }}
                          className={`w-1/2 flex items-center justify-center font-bold text-xs text-white ${deleteConfirmId === match.id ? 'bg-red-700' : 'bg-red-500'}`}>
                          {deleteConfirmId === match.id ? <i className="fas fa-check"></i> : <i className="fas fa-trash"></i>}
                        </button>
                      </div>

                      {/* Foreground card */}
                      <div
                        onClick={() => isSelectionMode ? onSelectMatch(match.id) : null}
                        onTouchStart={e => !isSelectionMode && handleTouchStart(e, match.id)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={e => !isSelectionMode && handleTouchEnd(e, match.id)}
                        className={`swipe-card relative z-10 ${styles.light} border-l-[6px] ${getResultColor(match.scoreMyTeam, match.scoreOpponent)} shadow-sm transition-transform duration-200 ${isSelectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                        style={{ transform: isSwiped ? 'translateX(-128px)' : 'translateX(0)' }}
                      >
                        <div className="p-4">
                          {/* Top row */}
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {isSelectionMode && (
                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                                  {isSelected && <i className="fas fa-check text-white text-[10px]"></i>}
                                </div>
                              )}
                              <span className="text-xs font-bold text-slate-500 bg-white/60 px-2 py-1 rounded">{new Date(match.date).getDate()}日</span>
                              {match.matchLabel && (
                                <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded border border-purple-200 shadow-sm">
                                  {match.matchLabel}
                                </span>
                              )}
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-white/80 border-slate-200 text-slate-600 flex items-center gap-1">
                                {team.logo && <img src={team.logo} className="w-3 h-3 object-contain" alt="logo" />}
                                {team.name}
                              </span>
                              {match.matchFormat && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-500">{match.matchFormat}</span>}
                              {getResultBadge(match.scoreMyTeam, match.scoreOpponent)}
                            </div>
                            {/* Desktop buttons */}
                            <div className="hidden sm:flex gap-2 -mr-2 -mt-2 items-center">
                              <button onClick={e => onShare(e, match)} className="text-slate-400 hover:text-emerald-500 p-2"><i className="fas fa-share-alt"></i></button>
                              <button onClick={e => onEdit(e, match)} className="text-slate-400 hover:text-blue-500 p-2"><i className="fas fa-edit"></i></button>
                              {deleteConfirmId === match.id ? (
                                <div className="flex items-center bg-slate-100 rounded p-1">
                                  <button onClick={e => onConfirmDelete(e, match.id)} className="bg-red-500 text-white text-[10px] px-2 py-1 rounded mr-1">{t.delete}</button>
                                  <button onClick={onCancelDelete} className="text-slate-400 p-1"><i className="fas fa-times"></i></button>
                                </div>
                              ) : (
                                <button onClick={e => onTrashClick(e, match.id)} className="text-slate-400 hover:text-red-500 p-2"><i className="fas fa-trash-alt"></i></button>
                              )}
                            </div>
                            {/* Mobile share */}
                            <div className="sm:hidden -mr-2 -mt-2">
                              <button onClick={e => onShare(e, match)} className="text-slate-400 hover:text-emerald-500 p-2"><i className="fas fa-share-alt"></i></button>
                            </div>
                          </div>

                          {/* Collapsed info row */}
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mb-2 px-1 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded border ${match.isHome ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                              {match.isHome ? t.homeShort : t.awayShort}
                            </span>
                            {match.tournamentName && (
                              <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                                <i className="fas fa-trophy text-[9px]"></i> {match.tournamentName}
                              </span>
                            )}
                            {match.location && (
                              <span className="flex items-center gap-1 truncate max-w-[150px]">
                                <i className="fas fa-map-marker-alt text-slate-400"></i> {match.location}
                              </span>
                            )}
                            {match.matchTime && (
                              <span className="flex items-center gap-1 text-blue-600">
                                <i className="far fa-clock"></i> {match.matchTime}
                              </span>
                            )}
                            {match.weather && (
                              <span className="text-slate-400 ml-auto">
                                <i className={`fas ${getWeatherIcon(match.weather)}`}></i>
                              </span>
                            )}
                          </div>

                          {/* Score row */}
                          <div className="flex justify-between items-center mb-4 px-1 gap-2">
                            <div className="w-2/5 flex flex-col justify-center min-h-[3.5rem]">
                              <div className={`flex items-center gap-2 font-black text-base sm:text-xl leading-none break-words line-clamp-2 ${styles.text}`}>
                                <span>{team.name}</span>
                                {team.logo && <img src={team.logo} className="w-9 h-9 object-contain shrink-0 drop-shadow-sm" alt="logo" />}
                              </div>
                              <div className="text-[10px] text-slate-400 uppercase mt-1 font-bold">{t.us}</div>
                            </div>
                            <div className="w-1/5 shrink-0 flex items-center justify-center gap-1 sm:gap-2">
                              <span className="text-3xl sm:text-4xl font-mono font-black text-slate-900">{match.scoreMyTeam}</span>
                              <span className="text-slate-400 font-bold">-</span>
                              <span className="text-3xl sm:text-4xl font-mono font-black text-slate-900">{match.scoreOpponent}</span>
                            </div>
                            <div className="w-2/5 flex flex-col items-end justify-center text-right min-h-[3.5rem]"
                              onClick={e => onOpponentClick(e, match.opponent)}>
                              <div className="font-black text-slate-800 text-base sm:text-xl leading-none break-words line-clamp-2">{match.opponent}</div>
                              <div className="text-[10px] text-slate-400 uppercase mt-1 font-bold">{t.opponent}</div>
                            </div>
                          </div>

                          {/* Stats bar */}
                          <div className="bg-white/60 rounded-lg p-2.5 text-sm border border-black/5 flex justify-between items-center backdrop-blur-sm">
                            <div className="flex gap-3 sm:gap-4 items-center">
                              <div className={`flex items-center gap-1.5 ${match.arthurGoals > 0 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                                <i className="fas fa-futbol"></i> <span>{match.arthurGoals}</span>
                              </div>
                              <div className={`flex items-center gap-1.5 ${match.arthurAssists > 0 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                                <i className="fas fa-shoe-prints"></i> <span>{match.arthurAssists}</span>
                              </div>
                            </div>
                            {match.isMotm && (
                              <div className="mx-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full border border-yellow-200 shadow-sm flex items-center whitespace-nowrap">
                                <i className="fas fa-trophy mr-1 text-yellow-500"></i> MOTM
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <div className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200">{t.rating}: {match.rating}</div>
                              <button onClick={e => onToggleExpansion(e, match.id)} className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-200/80 text-slate-500">
                                <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px]`}></i>
                              </button>
                            </div>
                          </div>

                          {/* Expanded details */}
                          {isExpanded && (
                            <div className="mt-3 space-y-3 pt-2 animate-fade-in border-t border-black/5 border-dashed">
                              <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
                                {match.matchTime && <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-100 text-blue-600"><i className="far fa-clock"></i> {t.matchTime}: {match.matchTime}</span>}
                                {match.assemblyTime && <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-100"><i className="fas fa-users"></i> {t.assemblyTime}: {match.assemblyTime}</span>}
                                {match.periodsPlayed !== undefined && <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-100 text-slate-700"><i className="fas fa-hourglass-half text-slate-400"></i> {t.periodsPlayed}: {match.periodsPlayed} {t.unitPeriod}</span>}
                                {match.pitchType && <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-100"><i className="fas fa-layer-group text-slate-400"></i> {getPitchLabel(match.pitchType)}</span>}
                                {match.weather && <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-100"><i className={`fas ${getWeatherIcon(match.weather)} text-slate-400`}></i> {getWeatherLabel(match.weather)}</span>}
                                {match.location && <button onClick={e => handleOpenMaps(e, match.location)} className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-100 active:scale-95 transition-transform"><i className="fas fa-map"></i> {t.openInMaps}</button>}
                              </div>

                              {/* [改動 9] Scorer list */}
                              {scorerDisplay && scorerDisplay.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  <span className="text-[10px] font-bold text-slate-400 self-center">{t.whoScored}:</span>
                                  {scorerDisplay.map((s, i) => (
                                    <span key={i} className="flex items-center gap-1 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                      {s.number && <span className="text-[8px] bg-slate-100 text-slate-400 w-3.5 h-3.5 rounded-full flex items-center justify-center">{s.number}</span>}
                                      {s.name}
                                      {s.count > 1 && <span className="bg-emerald-100 text-emerald-600 rounded-full px-1 text-[8px]">×{s.count}</span>}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {match.dadComment && (
                                <div className="flex gap-2">
                                  <span className="text-xs font-bold text-slate-400 shrink-0 mt-0.5">{match.commenterIdentity || 'Dad'}:</span>
                                  <p className="text-slate-700 italic text-sm">{match.dadComment}</p>
                                </div>
                              )}
                              {match.kidInterview && (
                                <div className="flex gap-2">
                                  <span className="text-xs font-bold text-slate-400 shrink-0 mt-0.5">{t.interview}:</span>
                                  <p className="text-slate-700 text-sm">{match.kidInterview}</p>
                                </div>
                              )}
                              {match.videos.length > 0 && (
                                <div className="pt-1 flex flex-wrap gap-2">
                                  {match.videos.map(v => (
                                    <button key={v.id} onClick={e => onOpenVideo(e, v.url)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-red-100 text-red-700 border-red-200">
                                      <i className="fab fa-youtube"></i>{t.tagHighlight}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MatchTimeline;
