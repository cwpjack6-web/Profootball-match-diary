
import React from 'react';
import { MatchData, Team } from '../../types';

interface MatchScoreboardProps {
    formData: any;
    activeTeam: Team;
    styles: any;
    t: any;
    adjustValue: (field: any, delta: number) => void;
    handleAction: (type: 'my_goal' | 'op_goal' | 'kid_goal' | 'kid_assist') => void;
    handleTeammateGoal: (teammateId: string, delta: number) => void;
    isAddingTeammate: boolean;
    setIsAddingTeammate: (v: boolean) => void;
    newTeammateName: string;
    setNewTeammateName: (v: string) => void;
    handleQuickAdd: () => void;
}

const MatchScoreboard: React.FC<MatchScoreboardProps> = ({
    formData, activeTeam, styles, t, adjustValue, handleAction, handleTeammateGoal,
    isAddingTeammate, setIsAddingTeammate, newTeammateName, setNewTeammateName, handleQuickAdd
}) => {
  const btnClass = "flex flex-col items-center justify-center h-20 rounded-xl shadow-sm active:scale-95 transition-all border-2";
  const adjustBtnClass = "w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 flex items-center justify-center transition-colors shadow-sm active:scale-90";

  return (
    <div className="space-y-5 animate-fade-in">
        {/* Scoreboard */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 flex">
                <div className={`h-full w-1/2 ${formData.isHome ? styles.bg : 'bg-slate-200'}`}></div>
                <div className={`h-full w-1/2 ${!formData.isHome ? styles.bg : 'bg-slate-200'}`}></div>
            </div>
            
            <div className="text-center w-5/12 flex flex-col items-center">
                <span className={`text-xs font-bold uppercase truncate block mb-1 ${styles.text}`}>{activeTeam.name}</span>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => adjustValue('scoreMyTeam', -1)} className={adjustBtnClass}><i className="fas fa-minus text-xs"></i></button>
                    <span className="text-4xl font-black text-slate-800 min-w-[1.2em]">{formData.scoreMyTeam}</span>
                    <button type="button" onClick={() => adjustValue('scoreMyTeam', 1)} className={adjustBtnClass}><i className="fas fa-plus text-xs"></i></button>
                </div>
            </div>
            
            <span className="text-slate-300 font-bold text-xl">:</span>
            
            <div className="text-center w-5/12 flex flex-col items-center">
                <span className="text-xs font-bold text-slate-500 uppercase truncate block mb-1">{formData.opponent || t.opponent}</span>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => adjustValue('scoreOpponent', -1)} className={adjustBtnClass}><i className="fas fa-minus text-xs"></i></button>
                    <span className="text-4xl font-black text-slate-800 min-w-[1.2em]">{formData.scoreOpponent}</span>
                    <button type="button" onClick={() => adjustValue('scoreOpponent', 1)} className={adjustBtnClass}><i className="fas fa-plus text-xs"></i></button>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
            <button type="button" onClick={() => handleAction('my_goal')} className={`${btnClass} bg-white border-slate-200 text-slate-600`}>
            <span className="font-bold text-xs">{t.scoreMyTeam}</span>
            <span className="text-[10px] text-slate-400">+1</span>
            </button>
            <button type="button" onClick={() => handleAction('op_goal')} className={`${btnClass} bg-white border-rose-100 text-rose-600`}>
            <span className="font-bold text-xs">{t.scoreOpponent}</span>
            <span className="text-[10px] text-rose-300">-1</span>
            </button>
            <button type="button" onClick={() => handleAction('kid_goal')} className={`${btnClass} ${styles.badge} border-current`}>
            <i className="fas fa-futbol text-lg mb-1"></i>
            <span className="font-bold text-xs">{t.kidGoal}</span>
            </button>
            <button type="button" onClick={() => handleAction('kid_assist')} className={`${btnClass} bg-indigo-50 border-indigo-200 text-indigo-700`}>
            <i className="fas fa-shoe-prints text-lg mb-1"></i>
            <span className="font-bold text-xs">{t.kidAssist}</span>
            </button>
        </div>

        {(formData.arthurGoals > 0 || formData.arthurAssists > 0) && (
            <div className="bg-slate-50 rounded-lg p-2 flex justify-center gap-6 border border-slate-200 border-dashed">
                <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">{t.goals}:</span>
                <button type="button" onClick={() => adjustValue('arthurGoals', -1)} className="w-5 h-5 rounded bg-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-300"><i className="fas fa-minus text-[10px]"></i></button>
                <span className="text-sm font-black text-slate-700 w-4 text-center">{formData.arthurGoals}</span>
                <button type="button" onClick={() => adjustValue('arthurGoals', 1)} className="w-5 h-5 rounded bg-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-300"><i className="fas fa-plus text-[10px]"></i></button>
                </div>
                <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">{t.assists}:</span>
                <button type="button" onClick={() => adjustValue('arthurAssists', -1)} className="w-5 h-5 rounded bg-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-300"><i className="fas fa-minus text-[10px]"></i></button>
                <span className="text-sm font-black text-slate-700 w-4 text-center">{formData.arthurAssists}</span>
                <button type="button" onClick={() => adjustValue('arthurAssists', 1)} className="w-5 h-5 rounded bg-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-300"><i className="fas fa-plus text-[10px]"></i></button>
                </div>
            </div>
        )}

        {activeTeam && (
            <div className="bg-slate-100 rounded-lg p-3 border border-slate-200">
            <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">{t.whoScored}</label>
                    <button type="button" onClick={() => setIsAddingTeammate(!isAddingTeammate)} className="text-[10px] text-blue-500 font-bold hover:underline">
                        {isAddingTeammate ? t.cancel : t.quickAddTeammate}
                    </button>
            </div>

            {isAddingTeammate && (
                <div className="flex gap-2 mb-3 animate-fade-in">
                    <input 
                        type="text" 
                        placeholder={t.namePlaceholder} 
                        value={newTeammateName} 
                        onChange={(e) => setNewTeammateName(e.target.value)} 
                        className="flex-1 text-xs border border-blue-200 rounded px-2 py-1"
                    />
                    <button 
                        type="button" 
                        onClick={handleQuickAdd} 
                        disabled={!newTeammateName}
                        className="bg-blue-600 text-white text-xs px-3 py-1 rounded font-bold disabled:opacity-50"
                    >
                        {t.add}
                    </button>
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {activeTeam.roster.map(tm => {
                    const count = formData.scorers.find((s: any) => s.teammateId === tm.id)?.count || 0;
                    return (
                        <div key={tm.id} className={`flex items-center rounded-full border shadow-sm transition-all ${count > 0 ? 'bg-white border-blue-200 pr-1 pl-0' : 'bg-white border-slate-200 px-0'}`}>
                            <button 
                                type="button" 
                                onClick={() => handleTeammateGoal(tm.id, 1)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium active:bg-slate-50"
                            >
                                {tm.number && <span className="text-[9px] bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center">{tm.number}</span>}
                                <span className="text-slate-700">{tm.name}</span>
                            </button>
                            {count > 0 && (
                                <div className="flex items-center border-l border-slate-100 pl-1">
                                    <span className="font-bold text-emerald-600 text-xs mx-1.5">{count}</span>
                                    <button 
                                    type="button" 
                                    onClick={() => handleTeammateGoal(tm.id, -1)}
                                    className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-500 transition-colors"
                                    >
                                        <i className="fas fa-minus text-[9px]"></i>
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            </div>
        )}
    </div>
  );
};
export default MatchScoreboard;
