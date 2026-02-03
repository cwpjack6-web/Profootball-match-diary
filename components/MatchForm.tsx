
import React, { useState, useEffect, useMemo } from 'react';
import { MatchFormProps, MatchData, MatchType, PitchType, WeatherType, MatchFormat, MatchStructure } from '../types';
import { getTeamColorStyles, getTeamById } from '../utils/colors';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import MatchInfoFields from './match/MatchInfoFields';
import MatchScoreboard from './match/MatchScoreboard';
import MatchMedia from './match/MatchMedia';

// Add previousMatches prop to calculate H2H
interface ExtendedMatchFormProps extends MatchFormProps {
    previousMatches: MatchData[];
}

// Internal state type
type FormState = Omit<MatchData, 'id' | 'profileId' | 'pitchType' | 'weather' | 'matchFormat' | 'matchStructure' | 'periodsPlayed'> & {
  id?: string;
  profileId?: string;
  pitchType: PitchType | '';
  weather: WeatherType | '';
  matchFormat: MatchFormat | '';
  matchStructure: MatchStructure | 'quarters';
  periodsPlayed: number;
};

const MatchForm: React.FC<ExtendedMatchFormProps> = ({ isOpen, onClose, onSubmit, profile, initialData, previousMatches, onAddTeammate }) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  
  // Helper to init state
  const getInitialState = (): FormState => {
      const firstTeam = profile.teams[0];
      // Use Team Defaults
      const defaultFormat = firstTeam?.defaultMatchFormat || '7v7';
      const defaultStructure = firstTeam?.defaultMatchStructure || 'quarters';
      const defaultPeriods = defaultStructure === 'halves' ? 2 : 4;

      const defaultState: FormState = {
        date: new Date().toISOString().split('T')[0],
        assemblyTime: '',
        matchTime: '',
        teamId: firstTeam?.id || '',
        location: '',
        isHome: true,
        matchType: 'league',
        matchFormat: defaultFormat, 
        matchStructure: defaultStructure, 
        periodsPlayed: defaultPeriods, 
        pitchType: '',
        weather: '',
        positionPlayed: [],
        opponent: '',
        scoreMyTeam: 0,
        scoreOpponent: 0,
        scorers: [],
        arthurGoals: 0,
        arthurAssists: 0,
        rating: 8,
        isMotm: false, 
        dadComment: '',
        commenterIdentity: 'Dad',
        kidInterview: '',
        videos: [],
        status: 'completed' 
      };

      if (initialData) {
          let loadedPositions: string[] = [];
          if (Array.isArray(initialData.positionPlayed)) {
              loadedPositions = initialData.positionPlayed;
          } else if (typeof initialData.positionPlayed === 'string' && initialData.positionPlayed) {
              loadedPositions = [initialData.positionPlayed];
          }

          return {
              ...defaultState,
              ...initialData,
              matchType: initialData.matchType || 'league', 
              matchFormat: initialData.matchFormat || '7v7',
              matchStructure: initialData.matchStructure || 'quarters',
              periodsPlayed: initialData.periodsPlayed !== undefined ? initialData.periodsPlayed : 4,
              pitchType: initialData.pitchType || '', 
              weather: initialData.weather || '', 
              positionPlayed: loadedPositions,
              scorers: initialData.scorers || [],
              videos: initialData.videos || [], 
              commenterIdentity: initialData.commenterIdentity || 'Dad',
              isMotm: !!initialData.isMotm,
              status: initialData.status || 'completed'
          };
      }
      return defaultState;
  };

  const [formData, setFormData] = useState<FormState>(getInitialState());

  // Quick Add Teammate State
  const [isAddingTeammate, setIsAddingTeammate] = useState(false);
  const [newTeammateName, setNewTeammateName] = useState('');

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
        setFormData(getInitialState());
        setIsAddingTeammate(false);
        setNewTeammateName('');
    }
  }, [isOpen, initialData, profile.teams]);

  // Effect: When Team ID changes, auto-update Format/Structure if it's a NEW match
  useEffect(() => {
      if (!initialData && formData.teamId) {
          const team = getTeamById(profile.teams, formData.teamId);
          if (team) {
              const newFormat = team.defaultMatchFormat || '7v7';
              const newStructure = team.defaultMatchStructure || 'quarters';
              const newPeriods = newStructure === 'halves' ? 2 : 4;
              
              setFormData(prev => ({ 
                  ...prev, 
                  matchFormat: newFormat,
                  matchStructure: newStructure,
                  periodsPlayed: newPeriods
              }));
          }
      }
  }, [formData.teamId]);

  const activeTeam = getTeamById(profile.teams, formData.teamId);
  const styles = getTeamColorStyles(activeTeam.themeColor);

  // --- AUTOCOMPLETE & SMART FILL ---
  const opponentOptions = useMemo(() => {
      const set = new Set(previousMatches.map(m => m.opponent));
      return Array.from(set).sort();
  }, [previousMatches]);

  const h2hStats = useMemo(() => {
      if (!formData.opponent) return null;
      const history = previousMatches.filter(m => 
          m.opponent.toLowerCase().trim() === formData.opponent.toLowerCase().trim() && 
          m.id !== initialData?.id &&
          m.status !== 'scheduled'
      );
      if (history.length === 0) return null;
      let w = 0, d = 0, l = 0;
      history.forEach(m => {
          if (m.scoreMyTeam > m.scoreOpponent) w++;
          else if (m.scoreMyTeam < m.scoreOpponent) l++;
          else d++;
      });
      return { w, d, l, total: history.length };
  }, [formData.opponent, previousMatches, initialData]);

  useEffect(() => {
      if (initialData || !formData.opponent) return;
      const matchedHistory = previousMatches.filter(m => 
        m.opponent.toLowerCase().trim() === formData.opponent.toLowerCase().trim()
      ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (matchedHistory.length > 0) {
          const lastMatch = matchedHistory[0];
          setFormData(prev => ({
              ...prev,
              location: prev.location || lastMatch.location,
              matchType: lastMatch.matchType,
              // We prioritize Team Defaults over historical opponent data for structure, 
              // but pitch type is usually tied to opponent location
              pitchType: (lastMatch.pitchType || prev.pitchType || '') as PitchType | ''
          }));
          if (!formData.location && lastMatch.location) {
              showToast(t.autoFilled, 'info');
          }
      }
  }, [formData.opponent, initialData, previousMatches, formData.location, t, showToast]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (e.target.type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormData(prev => ({
            ...prev,
            [name]: e.target.type === 'number' || name === 'rating' ? Number(value) : value
        }));
    }
  };

  const togglePosition = (pos: string) => {
      setFormData(prev => {
          const current = prev.positionPlayed || [];
          if (current.includes(pos)) {
              return { ...prev, positionPlayed: current.filter(p => p !== pos) };
          } else {
              return { ...prev, positionPlayed: [...current, pos] };
          }
      });
  };

  const adjustValue = (field: keyof FormState, delta: number) => {
    setFormData(prev => {
        const val = prev[field] as number;
        const newVal = Math.max(0, val + delta);
        return { ...prev, [field]: newVal };
    });
  };

  // Special handler for periods played (steps of 0.5)
  const adjustPeriods = (delta: number) => {
      setFormData(prev => {
          const maxPeriods = prev.matchStructure === 'halves' ? 2 : 4;
          const newVal = Math.min(maxPeriods, Math.max(0, prev.periodsPlayed + delta));
          return { ...prev, periodsPlayed: newVal };
      });
  };

  // Logic to switch structure and cap periods
  const setMatchStructure = (structure: MatchStructure) => {
      setFormData(prev => {
          const max = structure === 'halves' ? 2 : 4;
          const newPeriods = Math.min(prev.periodsPlayed, max); // Cap if switching from 4 quarters to halves
          return { ...prev, matchStructure: structure, periodsPlayed: newPeriods };
      });
  };

  const handleAction = (type: 'my_goal' | 'op_goal' | 'kid_goal' | 'kid_assist') => {
    setFormData(prev => {
      const newState = { ...prev };
      switch (type) {
        case 'my_goal': newState.scoreMyTeam += 1; break;
        case 'op_goal': newState.scoreOpponent += 1; break;
        case 'kid_goal': newState.scoreMyTeam += 1; newState.arthurGoals += 1; break;
        case 'kid_assist': newState.arthurAssists += 1; break;
      }
      return newState;
    });
  };

  const handleTeammateGoal = (teammateId: string, delta: number) => {
      setFormData(prev => {
          const newScore = Math.max(0, prev.scoreMyTeam + delta);
          const existingScorer = prev.scorers.find(s => s.teammateId === teammateId);
          let newScorers;
          if (existingScorer) {
              const newCount = Math.max(0, existingScorer.count + delta);
              if (newCount === 0) {
                   newScorers = prev.scorers.filter(s => s.teammateId !== teammateId);
              } else {
                   newScorers = prev.scorers.map(s => 
                      s.teammateId === teammateId ? { ...s, count: newCount } : s
                   );
              }
          } else if (delta > 0) {
              newScorers = [...prev.scorers, { teammateId, count: 1 }];
          } else {
              newScorers = prev.scorers;
          }
          return { ...prev, scoreMyTeam: newScore, scorers: newScorers };
      });
  };

  const handleQuickAdd = () => {
      if (newTeammateName && onAddTeammate && formData.teamId) {
          onAddTeammate(formData.teamId, newTeammateName);
          setNewTeammateName('');
          setIsAddingTeammate(false);
          showToast('Teammate added!', 'success');
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.opponent) return alert(t.alertOpponent);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = formData;
    
    const submitData: Omit<MatchData, 'id'> = {
        ...rest,
        profileId: profile.id,
        pitchType: formData.pitchType === '' ? undefined : formData.pitchType,
        weather: formData.weather === '' ? undefined : formData.weather,
        matchFormat: formData.matchFormat === '' ? undefined : formData.matchFormat,
        updatedAt: Date.now() // Always update timestamp on save
    };

    onSubmit(submitData);
  };

  if (!isOpen) return null;

  const isFixtureMode = formData.status === 'scheduled';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-fade-in">
      {/* Added sm:max-h-[90vh] to constrain height on desktop and enable scrolling */}
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col transition-all">
        
        {/* Header */}
        <div className={`${styles.headerBg} p-4 rounded-t-2xl flex justify-between items-center transition-colors duration-300 flex-none`}>
          <div className="flex items-center gap-2">
            <h2 className={`text-lg font-bold ${styles.headerText}`}>
              <i className="fas fa-edit mr-2"></i>{initialData ? t.editMatchReport : t.matchReport}
            </h2>
            {profile.teams.length > 1 && (
              <select 
                name="teamId" 
                value={formData.teamId} 
                onChange={handleChange}
                className="bg-white/20 text-xs text-slate-900 border border-white/30 rounded px-2 py-1 outline-none font-bold appearance-none"
                style={{ color: activeTeam.themeColor === 'white' ? '#334155' : 'white', borderColor: activeTeam.themeColor === 'white' ? '#cbd5e1' : 'rgba(255,255,255,0.3)', backgroundColor: activeTeam.themeColor === 'white' ? 'white' : 'rgba(255,255,255,0.2)' }}
              >
                {profile.teams.map(t => (
                  <option key={t.id} value={t.id} className="text-slate-800">{t.name}</option>
                ))}
              </select>
            )}
            {profile.teams.length === 1 && (
               <span className={`text-xs opacity-80 ${styles.headerText} border border-white/30 px-2 py-1 rounded`}>{activeTeam.name}</span>
            )}
          </div>
          <button onClick={onClose} className={`w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10 ${styles.headerText}`}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 space-y-5 flex-1 bg-slate-50 min-h-0">
          
          {/* Fixture Mode Toggle */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700">{t.fixtureOnly}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{t.fixtureDesc}</span>
              </div>
              <div className="relative inline-block w-12 h-6 align-middle select-none transition duration-200 ease-in">
                <input 
                  type="checkbox" 
                  name="status" 
                  id="fixture-toggle" 
                  checked={isFixtureMode}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.checked ? 'scheduled' : 'completed' }))}
                  className="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-4 appearance-none cursor-pointer peer checked:right-0 checked:border-blue-500"
                  style={{ top: '4px', left: isFixtureMode ? '24px' : '4px', transition: 'all 0.2s' }}
                />
                <label htmlFor="fixture-toggle" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors ${isFixtureMode ? 'bg-blue-500' : 'bg-slate-300'}`}></label>
              </div>
          </div>

          {/* Components */}
          <MatchInfoFields 
            formData={formData} 
            setFormData={setFormData}
            handleChange={handleChange} 
            t={t} 
            styles={styles} 
            isFixtureMode={isFixtureMode}
            opponentOptions={opponentOptions}
            h2hStats={h2hStats}
            adjustPeriods={adjustPeriods}
            setMatchStructure={setMatchStructure}
            togglePosition={togglePosition}
          />

          {!isFixtureMode && (
            <>
                <MatchScoreboard 
                    formData={formData}
                    activeTeam={activeTeam}
                    styles={styles}
                    t={t}
                    adjustValue={adjustValue}
                    handleAction={handleAction}
                    handleTeammateGoal={handleTeammateGoal}
                    isAddingTeammate={isAddingTeammate}
                    setIsAddingTeammate={setIsAddingTeammate}
                    newTeammateName={newTeammateName}
                    setNewTeammateName={setNewTeammateName}
                    handleQuickAdd={handleQuickAdd}
                />
                <MatchMedia 
                    formData={formData}
                    setFormData={setFormData}
                    handleChange={handleChange}
                    t={t}
                    styles={styles}
                />
            </>
          )}

        </form>

        <div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl flex-none">
          <button onClick={handleSubmit} className={`w-full ${styles.button} font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2`}>
            <i className={`fas ${isFixtureMode ? 'fa-calendar-plus' : 'fa-save'}`}></i> {isFixtureMode ? t.save : t.save}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchForm;
