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
      .filter(m => m.opponent.trim().toLowerCase() === opponentName.trim().toLowerCase())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allMatches, opponentName]);

  const stats = useMemo(() => {
      let w = 0, d = 0, l = 0;
      let gf = 0, ga = 0;
      let arthurGoals = 0;
      let arthurAssists = 0;

      history.forEach(m => {
          if (m.scoreMyTeam > m.scoreOpponent) w++;
          else if (m.scoreMyTeam < m.scoreOpponent) l++;
          else d++;

          gf += m.scoreMyTeam;
          ga += m.scoreOpponent;
          arthurGoals += m.arthurGoals;
          arthurAssists += m.arthurAssists;
      });

      return { w, d, l, gf, ga, arthurGoals, arthurAssists, played: history.length };
  }, [history]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl h-[85vh] sm:h-auto flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 p-4 rounded-t-2xl flex justify-between items-center text-white">
          <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.h2h}</div>
              <h2 className="text-xl font-bold">{opponentName}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
            
            {/* Overview Cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
                    <div className="text-2xl font-black text-slate-800">{stats.played}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{t.played}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
                    <div className="text-2xl font-black text-emerald-500">{Math.round((stats.w / stats.played) * 100) || 0}%</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{t.winRate}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center flex flex-col justify-center">
                    <div className="flex justify-center gap-1 font-mono text-sm font-bold">
                        <span className="text-emerald-600">{stats.w}W</span>
                        <span className="text-slate-400">-</span>
                        <span className="text-slate-600">{stats.d}D</span>
                        <span className="text-slate-400">-</span>
                        <span className="text-rose-600">{stats.l}L</span>
                    </div>
                </div>
            </div>

            {/* Goals Analysis */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-4">
                 <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 border-b border-slate-50 pb-2">{t.navStats}</h3>
                 <div className="space-y-3">
                     <div className="flex justify-between items-center">
                         <span className="text-xs font-bold text-slate-600">{t.goals} (GF/GA)</span>
                         <span className="text-sm font-bold">{stats.gf} - {stats.ga} <span className={`text-xs ml-1 ${stats.gf >= stats.ga ? 'text-emerald-500' : 'text-rose-500'}`}>({stats.gf - stats.ga > 0 ? '+' : ''}{stats.gf - stats.ga})</span></span>
                     </div>
                     <div className="flex justify-between items-center">
                         <span className="text-xs font-bold text-slate-600">{profile.name} {t.goals}</span>
                         <span className="text-sm font-bold text-emerald-600">{stats.arthurGoals}</span>
                     </div>
                     <div className="flex justify-between items-center">
                         <span className="text-xs font-bold text-slate-600">{profile.name} {t.assists}</span>
                         <span className="text-sm font-bold text-indigo-600">{stats.arthurAssists}</span>
                     </div>
                 </div>
            </div>

            {/* Match History List */}
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
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${styles.badge}`}>{team.name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="text-sm font-bold text-slate-700">
                                    {match.isHome ? t.home : t.away} <span className="text-slate-300 mx-1">vs</span> {match.opponent}
                                </div>
                                <div className="font-mono font-black text-lg">
                                    {match.scoreMyTeam}-{match.scoreOpponent}
                                </div>
                            </div>
                            {(match.arthurGoals > 0 || match.arthurAssists > 0) && (
                                <div className="mt-2 pt-2 border-t border-slate-50 flex gap-3 text-xs">
                                     {match.arthurGoals > 0 && <span className="font-bold text-emerald-600"><i className="fas fa-futbol mr-1"></i>{match.arthurGoals}</span>}
                                     {match.arthurAssists > 0 && <span className="font-bold text-indigo-600"><i className="fas fa-shoe-prints mr-1"></i>{match.arthurAssists}</span>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

        </div>
      </div>
    </div>
  );
};

export default OpponentStatsModal;