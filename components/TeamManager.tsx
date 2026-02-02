
import React, { useState } from 'react';
import { TeamManagerProps, Team, Teammate } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, getTeamColorStyles } from '../utils/colors';

const TeamManager: React.FC<TeamManagerProps> = ({ profile, onUpdateProfile }) => {
  const { t } = useLanguage();
  const [activeTeamId, setActiveTeamId] = useState<string>(profile.teams[0]?.id || '');

  const activeTeam = profile.teams.find(team => team.id === activeTeamId) || profile.teams[0];
  const styles = getTeamColorStyles(activeTeam?.themeColor || 'blue');

  const updateTeam = (updatedTeam: Team) => {
      const updatedTeams = profile.teams.map(t => t.id === updatedTeam.id ? updatedTeam : t);
      onUpdateProfile({ ...profile, teams: updatedTeams });
  };

  const addTeammate = () => {
      if (!activeTeam) return;
      const newTeammate: Teammate = {
          id: Date.now().toString(),
          name: '',
          number: ''
      };
      const updatedTeam = { ...activeTeam, roster: [...activeTeam.roster, newTeammate] };
      updateTeam(updatedTeam);
  };

  const updateTeammate = (id: string, field: keyof Teammate, value: string) => {
      if (!activeTeam) return;
      const updatedRoster = activeTeam.roster.map(tm => tm.id === id ? { ...tm, [field]: value } : tm);
      updateTeam({ ...activeTeam, roster: updatedRoster });
  };

  const removeTeammate = (id: string) => {
      if (!activeTeam) return;
      const updatedRoster = activeTeam.roster.filter(tm => tm.id !== id);
      updateTeam({ ...activeTeam, roster: updatedRoster });
  };

  const toggleArchive = () => {
      if (!activeTeam) return;
      const updatedTeam = { ...activeTeam, isArchived: !activeTeam.isArchived };
      updateTeam(updatedTeam);
  };

  if (!activeTeam) return <div className="p-4 text-center">No teams found.</div>;

  return (
    <div className="pb-24 animate-fade-in bg-slate-50 min-h-screen">
      <div className="bg-white sticky top-0 z-20 shadow-sm px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {profile.teams.map(team => {
               const teamStyles = getTeamColorStyles(team.themeColor);
               return (
                  <button 
                      key={team.id}
                      onClick={() => setActiveTeamId(team.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold whitespace-nowrap transition-all ${activeTeamId === team.id ? `${teamStyles.bg} ${teamStyles.activeText} border-transparent` : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                      {team.isArchived && <i className="fas fa-archive text-xs opacity-50"></i>}
                      {team.name}
                  </button>
               );
          })}
      </div>

      <div className="p-4 space-y-6 max-w-lg mx-auto">
          
          {/* Archive Status Panel */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex justify-between items-center">
             <div>
                 <h3 className="font-bold text-slate-800">{activeTeam.name}</h3>
                 <p className="text-xs text-slate-400">
                     {activeTeam.isArchived ? t.teamArchivedDesc : t.teamActiveDesc}
                 </p>
             </div>
             <button 
                onClick={toggleArchive}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${activeTeam.isArchived ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}
             >
                 <i className="fas fa-archive mr-1"></i>
                 {activeTeam.isArchived ? t.unarchive : t.archive}
             </button>
          </div>

          {/* Roster Editor */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className={`${styles.headerBg} p-3 flex justify-between items-center`}>
                 <h3 className={`font-bold text-sm ${styles.headerText}`}><i className="fas fa-users mr-2"></i>{t.manageRoster}</h3>
                 <button onClick={addTeammate} className="bg-white/20 hover:bg-white/30 text-white text-xs px-2 py-1 rounded transition-colors">
                     <i className="fas fa-plus"></i>
                 </button>
             </div>
             
             <div className="p-2 space-y-2">
                 {activeTeam.roster.map(tm => (
                     <div key={tm.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                         <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-200 text-xs font-bold text-slate-400">
                             {tm.number || '#'}
                         </div>
                         <input 
                            type="text" 
                            value={tm.name} 
                            placeholder={t.namePlaceholder}
                            onChange={(e) => updateTeammate(tm.id, 'name', e.target.value)}
                            className="flex-1 bg-transparent border-b border-transparent focus:border-blue-300 outline-none text-sm font-bold text-slate-700"
                         />
                         <input 
                            type="text" 
                            value={tm.number || ''} 
                            placeholder="#"
                            onChange={(e) => updateTeammate(tm.id, 'number', e.target.value)}
                            className="w-10 text-center bg-white border border-slate-200 rounded text-xs py-1"
                         />
                         <button onClick={() => removeTeammate(tm.id)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500">
                             <i className="fas fa-times"></i>
                         </button>
                     </div>
                 ))}
                 {activeTeam.roster.length === 0 && (
                     <div className="text-center py-8 text-slate-400 text-xs italic">
                         No teammates yet. Add one to start tracking assists!
                     </div>
                 )}
             </div>
          </div>
      </div>
    </div>
  );
};

export default TeamManager;
