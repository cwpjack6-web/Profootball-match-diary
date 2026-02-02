
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, ProfileSetupProps, Team, Teammate, MatchFormat, MatchStructure, TeamPattern } from '../types';
import { COLORS, generateJerseyGradient } from '../utils/colors';
import { useLanguage } from '../context/LanguageContext';
import { compressImage } from '../utils/image';

const ProfileSetup: React.FC<ProfileSetupProps> = ({ initialProfile, onSave, onCancel }) => {
  const { t, language, toggleLanguage } = useLanguage();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([
    { id: '1', name: '', jerseyNumber: '', themeColor: 'blue', themePattern: 'solid', defaultMatchFormat: '7v7', defaultMatchStructure: 'quarters', roster: [] }
  ]);
  const [isCompressing, setIsCompressing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const teamLogoInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (initialProfile) {
      setName(initialProfile.name);
      setAvatar(initialProfile.avatar);
      if (initialProfile.teams && initialProfile.teams.length > 0) {
        setTeams(initialProfile.teams.map(t => ({
            ...t, 
            roster: t.roster || [],
            themePattern: t.themePattern || 'solid', // Migration default
            secondaryColor: t.secondaryColor || 'white',
            defaultMatchFormat: t.defaultMatchFormat || '7v7',
            defaultMatchStructure: t.defaultMatchStructure || 'quarters'
        })));
      } else if (initialProfile.teamName) {
        setTeams([{
            id: 'legacy_1', 
            name: initialProfile.teamName, 
            jerseyNumber: initialProfile.jerseyNumber || '', 
            themeColor: initialProfile.themeColor || 'blue',
            themePattern: 'solid',
            defaultMatchFormat: '7v7',
            defaultMatchStructure: 'quarters',
            roster: []
        }]);
      }
    }
  }, [initialProfile]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
          const compressedBase64 = await compressImage(file, 300, 0.8);
          setAvatar(compressedBase64);
      } catch (err) {
          console.error("Image compression failed", err);
          alert("Could not process image. Please try another.");
      } finally {
          setIsCompressing(false);
      }
    }
  };

  const handleTeamLogoChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
          // Extremely compressed for icon usage
          const compressedBase64 = await compressImage(file, 150, 0.7); 
          const newTeams = [...teams];
          newTeams[index] = { ...newTeams[index], logo: compressedBase64 };
          setTeams(newTeams);
      } catch (err) {
          console.error("Logo compression failed", err);
      }
    }
  };

  const handleTeamChange = (index: number, field: keyof Team, value: any) => {
    const newTeams = [...teams];
    newTeams[index] = { ...newTeams[index], [field]: value };
    setTeams(newTeams);
  };

  const addTeam = () => {
    setTeams([...teams, { 
        id: Date.now().toString(), 
        name: '', 
        jerseyNumber: '', 
        themeColor: 'blue',
        themePattern: 'solid',
        secondaryColor: 'white',
        defaultMatchFormat: '7v7',
        defaultMatchStructure: 'quarters',
        roster: [] 
    }]);
  };

  const removeTeam = (index: number) => {
    if (teams.length > 1) {
      const newTeams = teams.filter((_, i) => i !== index);
      setTeams(newTeams);
    }
  };

  // --- Roster Management ---
  const addTeammate = (teamIndex: number) => {
      const newTeams = [...teams];
      newTeams[teamIndex].roster.push({
          id: Date.now().toString() + Math.random().toString().slice(2,5),
          name: '',
          number: ''
      });
      setTeams(newTeams);
  };

  const updateTeammate = (teamIndex: number, tmIndex: number, field: keyof Teammate, value: string) => {
      const newTeams = [...teams];
      newTeams[teamIndex].roster[tmIndex] = { ...newTeams[teamIndex].roster[tmIndex], [field]: value };
      setTeams(newTeams);
  };

  const removeTeammate = (teamIndex: number, tmIndex: number) => {
      const newTeams = [...teams];
      newTeams[teamIndex].roster = newTeams[teamIndex].roster.filter((_, i) => i !== tmIndex);
      setTeams(newTeams);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || teams.some(t => !t.name)) return;
    
    const profileToSave: UserProfile = {
      id: initialProfile?.id || '', 
      name,
      avatar,
      teams
    };
    onSave(profileToSave);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
            <div>
                <h1 className="text-xl font-bold mb-1">{t.profileSetup}</h1>
                <p className="text-white/60 text-xs">{t.profileSubtitle}</p>
            </div>
            <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={toggleLanguage}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors border border-white/10"
                >
                  {language === 'zh' ? 'EN' : '中'}
                </button>
                {onCancel && (
                    <button onClick={onCancel} className="text-white/70 hover:text-white text-sm font-bold bg-white/10 px-3 py-1.5 rounded-lg transition-colors">
                        {t.cancelProfile}
                    </button>
                )}
            </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto no-scrollbar">
          
          {/* Avatar & Name */}
          <div className="flex flex-col items-center gap-3">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden cursor-pointer group"
            >
              {isCompressing ? (
                 <div className="w-full h-full flex items-center justify-center bg-slate-200">
                    <i className="fas fa-spinner fa-spin text-slate-400"></i>
                 </div>
              ) : avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <i className="fas fa-camera text-2xl"></i>
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-[10px] font-bold">{t.changePhoto}</span>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <input 
              required
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              className="text-center w-full bg-transparent border-b border-slate-200 pb-1 text-lg font-bold outline-none focus:border-blue-500 text-slate-900"
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex justify-between items-center mb-3">
               <label className="text-xs font-bold text-slate-500 uppercase">{t.myTeams}</label>
               <button type="button" onClick={addTeam} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold hover:bg-blue-100">
                 <i className="fas fa-plus mr-1"></i>{t.addTeam}
               </button>
            </div>
            
            <div className="space-y-6">
              {teams.map((team, index) => (
                <div key={team.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative">
                  {teams.length > 1 && (
                    <button type="button" onClick={() => removeTeam(index)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 z-10">
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                  
                  {/* Basic Info */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="col-span-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t.teamName}</label>
                      <input 
                        required
                        type="text" 
                        value={team.name}
                        onChange={(e) => handleTeamChange(index, 'name', e.target.value)}
                        placeholder={t.teamNamePlaceholder}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 outline-none focus:ring-1 focus:ring-blue-500 text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t.jerseyNumber}</label>
                      <input 
                        type="text" 
                        value={team.jerseyNumber}
                        onChange={(e) => handleTeamChange(index, 'jerseyNumber', e.target.value)}
                        placeholder="#"
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-center outline-none focus:ring-1 focus:ring-blue-500 text-sm text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Logo & Default Settings */}
                  <div className="flex gap-4 mb-4">
                      {/* Logo Upload */}
                      <div className="flex flex-col items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t.teamLogo}</label>
                          <div 
                            onClick={() => teamLogoInputRefs.current[index]?.click()}
                            className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center cursor-pointer overflow-hidden hover:border-blue-400 transition-colors"
                          >
                             {team.logo ? (
                                 <img src={team.logo} alt="Logo" className="w-full h-full object-contain p-1" />
                             ) : (
                                 <i className="fas fa-shield-alt text-slate-300 text-xl"></i>
                             )}
                          </div>
                          <input 
                            ref={el => teamLogoInputRefs.current[index] = el}
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleTeamLogoChange(index, e)}
                          />
                      </div>
                      
                      {/* Defaults */}
                      <div className="flex-1 space-y-2">
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t.defaultFormat}</label>
                              <select 
                                value={team.defaultMatchFormat || '7v7'}
                                onChange={(e) => handleTeamChange(index, 'defaultMatchFormat', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs outline-none"
                              >
                                  {['5v5', '6v6', '7v7', '8v8', '9v9', '11v11'].map(f => <option key={f} value={f}>{f}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t.defaultStructure}</label>
                              <div className="flex bg-white rounded-lg border border-slate-200 p-0.5">
                                  <button type="button" onClick={() => handleTeamChange(index, 'defaultMatchStructure', 'quarters')} className={`flex-1 text-[10px] py-1 rounded ${team.defaultMatchStructure === 'quarters' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-400'}`}>{t.structQuarters}</button>
                                  <button type="button" onClick={() => handleTeamChange(index, 'defaultMatchStructure', 'halves')} className={`flex-1 text-[10px] py-1 rounded ${team.defaultMatchStructure === 'halves' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-400'}`}>{t.structHalves}</button>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Jersey Design */}
                  <div className="mb-4">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">{t.jerseyDesign}</label>
                    
                    {/* Pattern Selector */}
                    <div className="flex gap-2 mb-3">
                        {(['solid', 'vertical', 'horizontal'] as TeamPattern[]).map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => handleTeamChange(index, 'themePattern', p)}
                                className={`flex-1 py-1.5 rounded-lg border text-xs font-bold capitalize transition-all ${team.themePattern === p ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
                            >
                                {p === 'solid' ? t.patternSolid : p === 'vertical' ? t.patternVertical : t.patternHorizontal}
                            </button>
                        ))}
                    </div>

                    {/* Color Pickers */}
                    <div className="flex flex-col gap-3 bg-white p-3 rounded-xl border border-slate-200">
                        {/* Primary Color */}
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{t.primaryColor}</span>
                            <div className="flex flex-wrap gap-2">
                                {COLORS.map((c) => (
                                    <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => handleTeamChange(index, 'themeColor', c.value)}
                                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${team.themeColor === c.value ? 'border-slate-800 scale-110 shadow-md ring-1 ring-slate-800' : 'border-slate-200 opacity-70'}`}
                                    style={{ backgroundColor: c.hex }}
                                    >
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Secondary Color (Only if not solid) */}
                        {team.themePattern !== 'solid' && (
                            <div className="animate-fade-in">
                                <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{t.secondaryColor}</span>
                                <div className="flex flex-wrap gap-2">
                                    {COLORS.map((c) => (
                                        <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => handleTeamChange(index, 'secondaryColor', c.value)}
                                        className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${team.secondaryColor === c.value ? 'border-slate-800 scale-110 shadow-md ring-1 ring-slate-800' : 'border-slate-200 opacity-70'}`}
                                        style={{ backgroundColor: c.hex }}
                                        >
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Live Preview */}
                        <div className="mt-2 flex items-center gap-3 bg-slate-50 p-2 rounded-lg">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{t.preview}:</span>
                            <div 
                                className="w-16 h-10 rounded shadow-sm border border-black/10"
                                style={{ background: generateJerseyGradient(team.themePattern || 'solid', team.themeColor, team.secondaryColor) }}
                            ></div>
                        </div>
                    </div>
                  </div>

                  {/* Roster Section */}
                  <div className="mb-2 bg-white/50 rounded-lg p-2 border border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">{t.manageRoster}</label>
                          <button type="button" onClick={() => addTeammate(index)} className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-600 hover:bg-slate-300">
                              + {t.addTeammate}
                          </button>
                      </div>
                      <div className="space-y-2">
                          {team.roster.map((tm, tmIndex) => (
                              <div key={tm.id} className="flex gap-2 items-center">
                                  <input 
                                    type="text" 
                                    placeholder={t.teammateName} 
                                    value={tm.name}
                                    onChange={(e) => updateTeammate(index, tmIndex, 'name', e.target.value)}
                                    className="flex-1 text-xs border border-slate-200 rounded p-1 text-slate-900 bg-white"
                                  />
                                  <input 
                                    type="text" 
                                    placeholder="#" 
                                    value={tm.number || ''}
                                    onChange={(e) => updateTeammate(index, tmIndex, 'number', e.target.value)}
                                    className="w-10 text-xs border border-slate-200 rounded p-1 text-center text-slate-900 bg-white"
                                  />
                                  <button type="button" onClick={() => removeTeammate(index, tmIndex)} className="text-slate-300 hover:text-red-500">
                                      <i className="fas fa-times"></i>
                                  </button>
                              </div>
                          ))}
                          {team.roster.length === 0 && (
                              <div className="text-center text-[10px] text-slate-400 py-1">-</div>
                          )}
                      </div>
                  </div>

                </div>
              ))}
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 transition-colors"
          >
            {t.saveProfile}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
