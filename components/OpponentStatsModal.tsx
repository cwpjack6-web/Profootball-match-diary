import React, { useMemo } from 'react';
import { MatchData, UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getTeamById, getTeamColorStyles } from '../utils/colors';

interface OpponentStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  opponentName: string;
  allMatches: MatchData[];
  profile: UserProfile;
}

const OpponentStatsModal: React.FC<OpponentStatsModalProps> = ({ isOpen, onClose, opponentName, allMatches, profile }) => {
  const { t } = useLanguage();

  const history = useMemo(() => {
    if (!opponentName) return [];
    return allMatches
      .filter(m => m.opponent.trim().toLowerCase() === opponentName.trim().toLowerCase() && m.status !== 'scheduled')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allMatches, opponentName]);

  const stats = useMemo(() => {
    let w = 0, d = 0, l = 0, gf = 0, ga = 0, arthurGoals = 0, arthurAssists = 0;
    let totalRating = 0, ratingCount = 0, motmCount = 0;

    history.forEach(m => {
      if (m.scoreMyTeam > m.scoreOpponent) w++;
      else if (m.scoreMyTeam < m.scoreOpponent) l++;
      else d++;
      gf += m.scoreMyTeam;
      ga += m.scoreOpponent;
      arthurGoals += m.arthurGoals;
      arthurAssists += m.arthurAssists;
      if (m.rating) { totalRating += m.rating; ratingCount++; }
      if (m.isMotm) motmCount++;
    });

    const played = history.length;
    const avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : null;
    const avgGoals = played > 0 ? (arthurGoals / played).toFixed(1) : '0';
    const avgAssists = played > 0 ? (arthurAssists / played).toFixed(1) : '0';
    // Contribution: player G+A vs team goals scored (gf)
    const contributionPct = gf > 0 ? Math.round(((arthurGoals + arthurAssists) / gf) * 100) : 0;

    return { w, d, l, gf, ga, arthurGoals, arthurAssists, played, avgRating, avgGoals, avgAssists, contributionPct, motmCount };
  }, [history]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl h-[85vh] sm:h-auto flex flex-col">

        {/* Header */}
        <div className="bg-slate-900 p-4 rounded-t-2xl flex justify-between items-center text-white flex-none">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.h2h}</div>
            <h2 className="text-xl font-bold">{opponentName}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">

          {/* Overview */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
              <div className="text-2xl font-black text-slate-800">{stats.played}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">{t.played}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
              <div className="text-2xl font-black text-emerald-500">{Math.round((stats.w / (stats.played || 1)) * 100)}%</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">{t.winRate}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center flex flex-col justify-center">
              <div className="flex justify-center gap-1 font-mono text-sm font-bold">
                <span className="text-emerald-600">{stats.w}W</span>
                <span className="text-slate-300">-</span>
                <span className="text-slate-600">{stats.d}D</span>
                <span className="text-slate-300">-</span>
                <span className="text-rose-600">{stats.l}L</span>
              </div>
            </div>
          </div>

          {/* [改動 5] Attack stats section */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 pt-3 pb-2 border-b border-slate-50">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <i className="fas fa-crosshairs text-emerald-500"></i> {t.attackInfluence}
              </h3>
            </div>
            <div className="p-4 space-y-3">

              {/* Goals + Assists totals */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-center">
                  <div className="text-2xl font-black text-emerald-600">{stats.arthurGoals}</div>
                  <div className="text-[10px] text-emerald-500 font-bold uppercase">{t.goals}</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">avg {stats.avgGoals} / {t.matchesPlayed.toLowerCase()}</div>
                </div>
                <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100 text-center">
                  <div className="text-2xl font-black text-indigo-600">{stats.arthurAssists}</div>
                  <div className="text-[10px] text-indigo-500 font-bold uppercase">{t.assists}</div>
                  <div className="text-[10px] text-indigo-400 mt-0.5">avg {stats.avgAssists} / {t.matchesPlayed.toLowerCase()}</div>
                </div>
              </div>

              {/* Contribution ring + extra stats */}
              <div className="flex items-center gap-4">
                {/* Mini ring chart */}
                <div className="relative shrink-0 w-20 h-20">
                  <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                    <circle cx="18" cy="18" r="15.9" fill="none"
                      stroke={stats.contributionPct >= 50 ? '#10b981' : stats.contributionPct >= 25 ? '#f59e0b' : '#6366f1'}
                      strokeWidth="4"
                      strokeDasharray={`${stats.contributionPct} ${100 - stats.contributionPct}`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-lg font-black leading-none ${stats.contributionPct >= 50 ? 'text-emerald-600' : stats.contributionPct >= 25 ? 'text-amber-500' : 'text-indigo-500'}`}>
                      {stats.contributionPct}%
                    </span>
                    <span className="text-[8px] text-slate-400 font-bold">G+A</span>
                  </div>
                </div>

                {/* Right side stats */}
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-bold">{t.teamTotalGoals}</span>
                    <span className="text-sm font-black text-slate-800">{stats.gf}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-bold">{profile.name} G+A</span>
                    <span className="text-sm font-black text-emerald-600">{stats.arthurGoals + stats.arthurAssists}</span>
                  </div>
                  {stats.avgRating && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-bold">{t.avgRating}</span>
                      <span className="text-sm font-black text-yellow-600">{stats.avgRating}</span>
                    </div>
                  )}
                  {stats.motmCount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-bold">MOTM</span>
                      <span className="text-sm font-black text-yellow-500 flex items-center gap-1">
                        <i className="fas fa-trophy text-xs"></i> ×{stats.motmCount}
                      </span>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${stats.contributionPct}%`,
                        backgroundColor: stats.contributionPct >= 50 ? '#10b981' : stats.contributionPct >= 25 ? '#f59e0b' : '#6366f1'
                      }} />
                  </div>
                </div>
              </div>

              {/* Goals summary row */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-50 text-xs font-bold text-slate-500">
                <span>{t.goals} (GF / GA)</span>
                <span className="font-mono">
                  {stats.gf} - {stats.ga}
                  <span className={`ml-2 ${stats.gf >= stats.ga ? 'text-emerald-500' : 'text-rose-500'}`}>
                    ({stats.gf - stats.ga > 0 ? '+' : ''}{stats.gf - stats.ga})
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Match History */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 pl-1">{t.matches}</h3>
            <div className="space-y-3">
              {history.map(match => {
                const team = getTeamById(profile.teams, match.teamId);
                const resultColor = match.scoreMyTeam > match.scoreOpponent ? 'border-l-emerald-500' : match.scoreMyTeam < match.scoreOpponent ? 'border-l-rose-500' : 'border-l-slate-400';
                const styles = getTeamColorStyles(team.themeColor);

                return (
                  <div key={match.id} className={`bg-white p-3 rounded-lg border-l-4 shadow-sm ${resultColor}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{match.date}</span>
                      <div className="flex items-center gap-2">
                        {match.isMotm && (
                          <span className="text-[10px] bg-yellow-100 text-yellow-600 font-bold px-1.5 py-0.5 rounded border border-yellow-200">
                            <i className="fas fa-trophy mr-0.5"></i>MOTM
                          </span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${styles.badge}`}>{team.name}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-bold text-slate-700">
                        {match.isHome ? t.home : t.away} <span className="text-slate-300 mx-1">vs</span> {match.opponent}
                      </div>
                      <div className="font-mono font-black text-lg">{match.scoreMyTeam}-{match.scoreOpponent}</div>
                    </div>
                    {/* [改動 5] Player contribution per match */}
                    {(match.arthurGoals > 0 || match.arthurAssists > 0) && (
                      <div className="mt-2 pt-2 border-t border-slate-50 flex gap-3 text-xs">
                        {match.arthurGoals > 0 && (
                          <span className="font-bold text-emerald-600 flex items-center gap-1">
                            <i className="fas fa-futbol"></i>{match.arthurGoals}
                          </span>
                        )}
                        {match.arthurAssists > 0 && (
                          <span className="font-bold text-indigo-600 flex items-center gap-1">
                            <i className="fas fa-shoe-prints"></i>{match.arthurAssists}
                          </span>
                        )}
                        {match.rating && (
                          <span className="ml-auto font-bold text-yellow-600 flex items-center gap-1">
                            <i className="fas fa-star text-[10px]"></i>{match.rating}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OpponentStatsModal;
