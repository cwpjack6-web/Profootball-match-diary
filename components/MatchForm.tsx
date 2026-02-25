import React, { useState, useEffect, useMemo } from 'react';
import { MatchFormProps, MatchData, MatchType, PitchType, WeatherType, MatchFormat, MatchStructure, VideoLink } from '../types';
import { getTeamColorStyles, getTeamById } from '../utils/colors';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

interface ExtendedMatchFormProps extends MatchFormProps {
  previousMatches: MatchData[];
}

type FormState = Omit<MatchData, 'id' | 'profileId' | 'pitchType' | 'weather' | 'matchFormat' | 'matchStructure' | 'periodsPlayed'> & {
  id?: string;
  profileId?: string;
  tournamentName?: string;
  matchLabel?: string;
  pitchType: PitchType | '';
  weather: WeatherType | '';
  matchFormat: MatchFormat | '';
  matchStructure: MatchStructure | 'quarters';
  periodsPlayed: number;
};

const DRAFT_KEY = 'match_form_draft';
const AVAILABLE_FORMATS: MatchFormat[] = ['5v5', '6v6', '7v7', '8v8', '9v9', '11v11'];
const POSITIONS = ['FW', 'LW', 'RW', 'MF', 'DF', 'GK'];

// ── Page config ────────────────────────────────────────────────────────────────
const PAGE_ICONS = ['fa-calendar-alt', 'fa-futbol', 'fa-pen'];

const MatchForm: React.FC<ExtendedMatchFormProps> = ({
  isOpen, onClose, onSubmit, profile, initialData, previousMatches, onAddTeammate
}) => {
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [isAddingTeammate, setIsAddingTeammate] = useState(false);
  const [newTeammateName, setNewTeammateName] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTag, setNewVideoTag] = useState<VideoLink['tag']>('highlight');
  const [newVideoNote, setNewVideoNote] = useState('');
  const [hasDraft, setHasDraft] = useState(false);

  // ── Initial state builder ────────────────────────────────────────────────────
  const getInitialState = (): FormState => {
    const firstTeam = profile.teams[0];
    const defaultFormat = firstTeam?.defaultMatchFormat || '7v7';
    const defaultStructure = firstTeam?.defaultMatchStructure || 'quarters';
    const defaultPeriods = defaultStructure === 'halves' ? 2 : 4;

    const defaultState: FormState = {
      date: new Date().toISOString().split('T')[0],
      assemblyTime: '', matchTime: '', matchEndTime: initialData?.matchEndTime || '',
      teamId: firstTeam?.id || '',
      location: '', isHome: true,
      matchType: 'league', tournamentName: '', matchLabel: '',
      matchFormat: defaultFormat, matchStructure: defaultStructure, periodsPlayed: defaultPeriods,
      pitchType: '', weather: '', positionPlayed: [],
      opponent: '',
      scoreMyTeam: 0, scoreOpponent: 0,
      scorers: [], arthurGoals: 0, arthurAssists: 0,
      rating: 8, isMotm: false,
      dadComment: '', commenterIdentity: 'Dad', kidInterview: '',
      videos: [], status: 'completed',
    };

    if (initialData) {
      let loadedPositions: string[] = [];
      if (Array.isArray(initialData.positionPlayed)) loadedPositions = initialData.positionPlayed;
      else if (typeof initialData.positionPlayed === 'string' && initialData.positionPlayed) loadedPositions = [initialData.positionPlayed];
      return {
        ...defaultState, ...initialData,
        matchType: initialData.matchType || 'league',
        tournamentName: initialData.tournamentName || '', matchLabel: initialData.matchLabel || '',
        matchFormat: initialData.matchFormat || '7v7',
        matchStructure: initialData.matchStructure || 'quarters',
        periodsPlayed: initialData.periodsPlayed !== undefined ? initialData.periodsPlayed : 4,
        pitchType: initialData.pitchType || '', weather: initialData.weather || '',
        positionPlayed: loadedPositions, scorers: initialData.scorers || [],
        videos: initialData.videos || [], commenterIdentity: initialData.commenterIdentity || 'Dad',
        isMotm: !!initialData.isMotm, status: initialData.status || 'completed',
      };
    }

    if (previousMatches.length > 0) {
      const sorted = [...previousMatches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastMatch = sorted[0];
      const diffDays = Math.ceil(Math.abs(new Date().getTime() - new Date(lastMatch.date).getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 3 && lastMatch.tournamentName) {
        defaultState.tournamentName = lastMatch.tournamentName;
        defaultState.matchType = lastMatch.matchType;
        defaultState.location = lastMatch.location;
      }
    }
    return defaultState;
  };

  const [formData, setFormData] = useState<FormState>(getInitialState());

  // ── Draft logic ──────────────────────────────────────────────────────────────
  // On mount: check for draft (only for new matches, not edits)
  useEffect(() => {
    if (!isOpen) return;
    if (initialData?.id) {
      // Editing existing — ignore draft
      setFormData(getInitialState());
      setCurrentPage(1);
      return;
    }
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setHasDraft(true);
        setFormData(parsed);
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    } else {
      setFormData(getInitialState());
    }
    setCurrentPage(1);
    setIsAddingTeammate(false);
    setNewTeammateName('');
  }, [isOpen]);

  // Auto-save draft on every formData change (new matches only)
  useEffect(() => {
    if (!isOpen || initialData?.id) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
  }, [formData, isOpen]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  };

  const discardDraft = () => {
    clearDraft();
    setFormData(getInitialState());
    showToast(t.draftCleared, 'info');
  };

  // ── Team change effect ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialData && formData.teamId) {
      const team = getTeamById(profile.teams, formData.teamId);
      if (team) {
        const newStructure = team.defaultMatchStructure || 'quarters';
        setFormData(prev => ({
          ...prev,
          matchFormat: team.defaultMatchFormat || '7v7',
          matchStructure: newStructure,
          periodsPlayed: formData.periodsPlayed || (newStructure === 'halves' ? 2 : 4),
        }));
      }
    }
  }, [formData.teamId]);

  // ── Smart date detection ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!formData.date) return;
    const sel = new Date(formData.date); sel.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const isScheduled = sel > today;
    setFormData(prev => prev.status === (isScheduled ? 'scheduled' : 'completed') ? prev : {
      ...prev, status: isScheduled ? 'scheduled' : 'completed'
    });
  }, [formData.date]);

  // ── Autocomplete ─────────────────────────────────────────────────────────────
  const opponentOptions = useMemo(() => {
    const set = new Set(previousMatches.map(m => m.opponent));
    return Array.from(set).sort();
  }, [previousMatches]);

  const h2hStats = useMemo(() => {
    if (!formData.opponent) return null;
    const history = previousMatches.filter(m =>
      m.opponent.toLowerCase().trim() === formData.opponent.toLowerCase().trim() &&
      m.id !== initialData?.id && m.status !== 'scheduled'
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
    const matched = previousMatches.filter(m =>
      m.opponent.toLowerCase().trim() === formData.opponent.toLowerCase().trim()
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (matched.length > 0) {
      const last = matched[0];
      setFormData(prev => ({
        ...prev,
        location: prev.location || last.location,
        matchType: last.matchType,
        pitchType: (last.pitchType || prev.pitchType || '') as PitchType | '',
      }));
      if (!formData.location && last.location) showToast(t.autoFilled, 'info');
    }
  }, [formData.opponent]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'number' || name === 'rating' ? Number(value) : value }));
    }
  };

  const togglePosition = (pos: string) => {
    setFormData(prev => {
      const cur = prev.positionPlayed || [];
      return { ...prev, positionPlayed: cur.includes(pos) ? cur.filter(p => p !== pos) : [...cur, pos] };
    });
  };

  const adjustValue = (field: keyof FormState, delta: number) => {
    setFormData(prev => ({ ...prev, [field]: Math.max(0, (prev[field] as number) + delta) }));
  };

  const adjustPeriods = (delta: number) => {
    setFormData(prev => {
      const isLeague = (prev.matchType || 'league') === 'league';
      const max = isLeague ? (prev.matchStructure === 'halves' ? 2 : 4) : 99;
      return { ...prev, periodsPlayed: Math.min(max, Math.max(0, prev.periodsPlayed + delta)) };
    });
  };

  const setMatchStructure = (structure: MatchStructure) => {
    setFormData(prev => {
      const isLeague = (prev.matchType || 'league') === 'league';
      const defaultPeriods = structure === 'halves' ? 2 : 4;
      const newPeriods = isLeague
        ? defaultPeriods  // reset to standard for league
        : (prev.periodsPlayed || defaultPeriods); // keep existing for cup/friendly
      return { ...prev, matchStructure: structure, periodsPlayed: newPeriods };
    });
  };

  const handleAction = (type: 'my_goal' | 'op_goal' | 'kid_goal' | 'kid_assist' | 'og_for' | 'og_against') => {
    setFormData(prev => {
      const s = { ...prev };
      if (type === 'my_goal') s.scoreMyTeam += 1;
      else if (type === 'op_goal') s.scoreOpponent += 1;
      else if (type === 'kid_goal') { s.scoreMyTeam += 1; s.arthurGoals += 1; }
      else if (type === 'kid_assist') s.arthurAssists += 1;
      else if (type === 'og_for') {
        // Opponent own goal — counts for us
        s.scoreMyTeam += 1;
        s.scorers = [...(s.scorers || []), { playerId: 'og_for', name: 'OG', type: 'own_goal_for' }];
      } else if (type === 'og_against') {
        // Our own goal — counts for them
        s.scoreOpponent += 1;
        s.scorers = [...(s.scorers || []), { playerId: 'og_against', name: 'OG', type: 'own_goal_against' }];
      }
      return s;
    });
  };

  const handleTeammateGoal = (teammateId: string, delta: number) => {
    setFormData(prev => {
      const newScore = Math.max(0, prev.scoreMyTeam + delta);
      const existing = prev.scorers.find(s => s.teammateId === teammateId);
      let newScorers;
      if (existing) {
        const nc = Math.max(0, existing.count + delta);
        newScorers = nc === 0 ? prev.scorers.filter(s => s.teammateId !== teammateId)
          : prev.scorers.map(s => s.teammateId === teammateId ? { ...s, count: nc } : s);
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

  const handleAddVideo = () => {
    if (!newVideoUrl) return;
    setFormData(prev => ({
      ...prev,
      videos: [...prev.videos, { id: Date.now().toString(), url: newVideoUrl, tag: newVideoTag, note: newVideoNote }],
    }));
    setNewVideoUrl(''); setNewVideoNote(''); setNewVideoTag('highlight');
  };

  const handleRemoveVideo = (id: string) => {
    setFormData(prev => ({ ...prev, videos: prev.videos.filter(v => v.id !== id) }));
  };

  const handleSubmit = () => {
    if (!formData.opponent && formData.matchType !== 'tournament') { showToast(t.alertOpponent, 'error'); return; }
    if (formData.matchType === 'tournament' && !formData.tournamentName) { showToast('Please enter a tournament name', 'error'); return; }
    const { id, ...rest } = formData;
    const submitData: Omit<MatchData, 'id'> = {
      ...rest, profileId: profile.id,
      pitchType: formData.pitchType === '' ? undefined : formData.pitchType,
      weather: formData.weather === '' ? undefined : formData.weather,
      matchFormat: formData.matchFormat === '' ? undefined : formData.matchFormat,
      updatedAt: Date.now(),
    };
    clearDraft();
    onSubmit(submitData);
  };

  if (!isOpen) return null;

  const isFixtureMode = formData.status === 'scheduled';
  const activeTeam = getTeamById(profile.teams, formData.teamId);
  const styles = getTeamColorStyles(activeTeam.themeColor);
  const adjustBtnClass = "w-9 h-9 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 flex items-center justify-center transition-colors active:scale-90";

  // ── Page 1: Basic Info ────────────────────────────────────────────────────────
  const page1 = (
    <div className="space-y-4">
      {/* Fixture toggle */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-sm font-bold text-slate-700">{t.fixtureOnly}</span>
          <p className="text-[10px] text-slate-400 font-bold uppercase">{t.fixtureDesc}</p>
        </div>
        <div className="relative inline-block w-12 h-6 select-none">
          <input type="checkbox" id="fixture-toggle" checked={isFixtureMode}
            onChange={e => setFormData(prev => ({ ...prev, status: e.target.checked ? 'scheduled' : 'completed' }))}
            className="hidden" />
          <label htmlFor="fixture-toggle"
            className={`block h-6 rounded-full cursor-pointer transition-colors ${isFixtureMode ? 'bg-blue-500' : 'bg-slate-300'}`}>
            <span className={`block w-4 h-4 mt-1 rounded-full bg-white shadow transition-all ${isFixtureMode ? 'ml-7' : 'ml-1'}`} />
          </label>
        </div>
      </div>

      {/* Date + Home/Away */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.date}</label>
          <input type="date" name="date" value={formData.date} onChange={handleChange}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none focus:border-blue-300" />
        </div>
        <div className="w-1/3">
          <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.home}/{t.away}</label>
          <div className="flex bg-white rounded-xl border border-slate-200 p-1 h-[46px]">
            <button type="button" onClick={() => setFormData(p => ({ ...p, isHome: true }))}
              className={`flex-1 text-xs rounded-lg font-bold transition-all ${formData.isHome ? styles.badge : 'text-slate-400'}`}>{t.homeShort}</button>
            <button type="button" onClick={() => setFormData(p => ({ ...p, isHome: false }))}
              className={`flex-1 text-xs rounded-lg font-bold transition-all ${!formData.isHome ? 'bg-slate-200 text-slate-700' : 'text-slate-400'}`}>{t.awayShort}</button>
          </div>
        </div>
      </div>

      {/* Times */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.assemblyTime}</label>
          <input type="time" name="assemblyTime" value={formData.assemblyTime} onChange={handleChange}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none" />
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.matchTime}</label>
          <input type="time" name="matchTime" value={formData.matchTime} onChange={handleChange}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none" />
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
            {language === 'zh' ? '結束時間' : 'End Time'}
          </label>
          <input type="time" name="matchEndTime" value={formData.matchEndTime || ''} onChange={handleChange}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none" />
        </div>
      </div>

      {/* Opponent + Location */}
      {/* Opponent — hidden for tournament (opponent set per Game in Quick Log) */}
      {formData.matchType !== 'tournament' && (
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-bold text-slate-400 uppercase">{t.opponentName}</label>
          {h2hStats && !isFixtureMode && (
            <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded font-bold border border-blue-100 flex gap-2">
              {t.h2h}: <span className="text-emerald-600">{h2hStats.w}{t.win}</span>
              <span className="text-slate-500">{h2hStats.d}{t.draw}</span>
              <span className="text-rose-600">{h2hStats.l}{t.loss}</span>
            </span>
          )}
        </div>
        <input required type="text" name="opponent" list="opp-list" placeholder={t.opponentPlaceholder}
          value={formData.opponent} onChange={handleChange}
          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none focus:border-blue-300" />
        <datalist id="opp-list">{opponentOptions.map(op => <option key={op} value={op} />)}</datalist>
      </div>
      )}

      <div>
        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.location}</label>
        <input type="text" name="location" placeholder={t.locationPlaceholder} value={formData.location} onChange={handleChange}
          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none" />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.pitchType}</label>
          <select name="pitchType" value={formData.pitchType} onChange={handleChange}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none">
            <option value="">-</option>
            <option value="turf">{t.pitchTurf}</option>
            <option value="artificial">{t.pitchArtificial}</option>
            <option value="hard">{t.pitchHard}</option>
            <option value="indoor">{t.pitchIndoor}</option>
            <option value="other">{t.pitchOther}</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.weather}</label>
          <select name="weather" value={formData.weather} onChange={handleChange}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none">
            <option value="">-</option>
            <option value="sunny">{t.weatherSunny}</option>
            <option value="rain">{t.weatherRain}</option>
            <option value="cloudy">{t.weatherCloudy}</option>
            <option value="night">{t.weatherNight}</option>
            <option value="hot">{t.weatherHot}</option>
            <option value="windy">{t.weatherWindy}</option>
          </select>
        </div>
      </div>

      {/* Match Type */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.matchType}</label>
        <div className="flex bg-white rounded-xl border border-slate-200 p-1">
          {(['league', 'tournament', 'friendly'] as MatchType[]).map(mt => {
            const isSelected = formData.matchType === mt;
            const selectedStyle = mt === 'league'
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : mt === 'tournament'
              ? 'bg-purple-100 text-purple-700 border border-purple-300'
              : 'bg-emerald-100 text-emerald-700 border border-emerald-300';
            const label = mt === 'league' ? t.typeLeague : mt === 'tournament' ? (t.typeTournament || 'Tournament') : t.typeFriendly;
            return (
              <button key={mt} type="button" onClick={() => setFormData(p => ({ ...p, matchType: mt }))}
                className={`flex-1 text-xs py-2 rounded-lg font-bold transition-all border ${
                  isSelected ? selectedStyle : 'text-slate-400 border-transparent'}`}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tournament */}
      {/* Tournament name + label — only shown when Tournament is selected */}
      {formData.matchType === 'tournament' && <div className="flex gap-3 p-3 bg-purple-50 rounded-xl border border-purple-200">
        <div className="flex-[3]">
          <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
            Tournament{formData.matchType === 'tournament' && <span className="text-rose-400 ml-1">*</span>}
          </label>
          <input type="text" name="tournamentName"
            placeholder={formData.matchType === 'tournament' ? 'e.g. Forest Festival' : 'e.g. Easter Cup'}
            value={formData.tournamentName || ''} onChange={handleChange}
            className={`w-full bg-white border rounded-xl p-3 text-sm text-slate-900 outline-none ${
              formData.matchType === 'tournament' ? 'border-purple-300 focus:border-purple-500' : 'border-slate-200'
            }`} />
        </div>
        <div className="flex-[2]">
          <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Label</label>
          <input type="text" name="matchLabel"
            placeholder={formData.matchType === 'tournament' ? 'G1 / QF / Final' : 'e.g. Game 1'}
            value={formData.matchLabel || ''} onChange={handleChange}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none" />
        </div>
      </div>}

      {/* Format */}
      <div className="pt-2 border-t border-slate-100 space-y-3">
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.matchFormat}</label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {AVAILABLE_FORMATS.map(fmt => (
              <button key={fmt} type="button" onClick={() => setFormData(p => ({ ...p, matchFormat: fmt }))}
                className={`px-3 py-2 rounded-xl text-xs font-bold border whitespace-nowrap transition-all ${
                  formData.matchFormat === fmt ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-500 border-slate-200'}`}>
                {fmt}
              </button>
            ))}
          </div>
        </div>
        {formData.matchType !== 'tournament' && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.matchStructure}</label>
            <div className="flex bg-white rounded-xl border border-slate-200 p-1">
              <button type="button" onClick={() => setMatchStructure('quarters')}
                className={`flex-1 text-[10px] py-2 rounded-lg font-bold ${formData.matchStructure === 'quarters' ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>
                {t.structQuarters}
              </button>
              <button type="button" onClick={() => setMatchStructure('halves')}
                className={`flex-1 text-[10px] py-2 rounded-lg font-bold ${formData.matchStructure === 'halves' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400'}`}>
                {t.structHalves}
              </button>
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.periodsPlayed}</label>
            <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-3 py-2">
              <button type="button" onClick={() => adjustPeriods(-0.5)} className="w-6 h-6 bg-slate-100 rounded text-slate-500 flex items-center justify-center">
                <i className="fas fa-minus text-[10px]" />
              </button>
              <span className="font-black text-slate-800 text-sm">{formData.periodsPlayed} <span className="text-[9px] text-slate-400 font-normal">{t.unitPeriod}</span></span>
              <button type="button" onClick={() => adjustPeriods(0.5)} className="w-6 h-6 bg-slate-100 rounded text-slate-500 flex items-center justify-center">
                <i className="fas fa-plus text-[10px]" />
              </button>
            </div>
          </div>
        </div>
        )}
      </div>


    </div>
  );

  // ── Page 2: Scoreboard ────────────────────────────────────────────────────────
  const page2 = (
    <div className="space-y-5">
      {/* Big scoreboard */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className={`${styles.headerBg} p-3 flex justify-between items-center`}>
          <span className={`text-xs font-bold ${styles.headerText} opacity-80 uppercase`}>{activeTeam.name}</span>
          <span className={`text-xs font-bold ${styles.headerText} opacity-80 uppercase`}>{formData.opponent || t.opponent}</span>
        </div>
        <div className="flex justify-between items-center p-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => adjustValue('scoreMyTeam', -1)} className={adjustBtnClass}>
              <i className="fas fa-minus text-xs" />
            </button>
            <span className="text-6xl font-black text-slate-900 min-w-[1.2em] text-center">{formData.scoreMyTeam}</span>
            <button type="button" onClick={() => adjustValue('scoreMyTeam', 1)} className={adjustBtnClass}>
              <i className="fas fa-plus text-xs" />
            </button>
          </div>
          <span className="text-2xl font-bold text-slate-300">:</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => adjustValue('scoreOpponent', -1)} className={adjustBtnClass}>
              <i className="fas fa-minus text-xs" />
            </button>
            <span className="text-6xl font-black text-slate-900 min-w-[1.2em] text-center">{formData.scoreOpponent}</span>
            <button type="button" onClick={() => adjustValue('scoreOpponent', 1)} className={adjustBtnClass}>
              <i className="fas fa-plus text-xs" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => handleAction('kid_goal')}
          className={`flex items-center justify-center gap-2 h-16 rounded-2xl shadow-sm border-2 active:scale-95 transition-all ${styles.badge} border-current`}>
          <i className="fas fa-futbol text-xl" />
          <span className="font-bold text-sm">{t.kidGoal}</span>
        </button>
        <button type="button" onClick={() => handleAction('kid_assist')}
          className="flex items-center justify-center gap-2 h-16 rounded-2xl shadow-sm border-2 border-indigo-200 bg-indigo-50 text-indigo-700 active:scale-95 transition-all">
          <i className="fas fa-shoe-prints text-xl" />
          <span className="font-bold text-sm">{t.kidAssist}</span>
        </button>
        <button type="button" onClick={() => handleAction('my_goal')}
          className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-white border-2 border-slate-200 text-slate-600 active:scale-95 transition-all">
          <span className="font-bold text-xs">{t.scoreMyTeam} +1</span>
        </button>
        <button type="button" onClick={() => handleAction('op_goal')}
          className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-rose-50 border-2 border-rose-100 text-rose-600 active:scale-95 transition-all">
          <span className="font-bold text-xs">{t.scoreOpponent} +1</span>
        </button>
        {/* Own goal buttons */}
        <button type="button" onClick={() => handleAction('og_for')}
          className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-orange-50 border-2 border-orange-200 text-orange-600 active:scale-95 transition-all">
          <span className="font-bold text-xs">OG {language === 'zh' ? '對方' : 'Opp'} +1</span>
        </button>
        <button type="button" onClick={() => handleAction('og_against')}
          className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-slate-50 border-2 border-slate-200 text-slate-500 active:scale-95 transition-all">
          <span className="font-bold text-xs">OG {language === 'zh' ? '我方' : 'Ours'} +1</span>
        </button>
      </div>

      {/* Position */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.positionPlayed}</label>
        <div className="flex flex-wrap gap-2">
          {POSITIONS.map(pos => (
            <button key={pos} type="button" onClick={() => togglePosition(pos)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                formData.positionPlayed?.includes(pos) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Player stats counter */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
        <label className="text-xs font-bold text-slate-400 uppercase block mb-3">{t.personalStats}</label>
        <div className="flex justify-around">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-slate-500">{t.goals}</span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => adjustValue('arthurGoals', -1)} className={adjustBtnClass}>
                <i className="fas fa-minus text-xs" />
              </button>
              <span className="text-3xl font-black text-emerald-600 min-w-[1.5em] text-center">{formData.arthurGoals}</span>
              <button type="button" onClick={() => adjustValue('arthurGoals', 1)} className={adjustBtnClass}>
                <i className="fas fa-plus text-xs" />
              </button>
            </div>
          </div>
          <div className="w-px bg-slate-100" />
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-slate-500">{t.assists}</span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => adjustValue('arthurAssists', -1)} className={adjustBtnClass}>
                <i className="fas fa-minus text-xs" />
              </button>
              <span className="text-3xl font-black text-indigo-600 min-w-[1.5em] text-center">{formData.arthurAssists}</span>
              <button type="button" onClick={() => adjustValue('arthurAssists', 1)} className={adjustBtnClass}>
                <i className="fas fa-plus text-xs" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Who scored */}
      {activeTeam && (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <label className="text-xs font-bold text-slate-400 uppercase">{t.whoScored}</label>
            <button type="button" onClick={() => setIsAddingTeammate(!isAddingTeammate)}
              className="text-[10px] text-blue-500 font-bold">
              {isAddingTeammate ? t.cancel : t.quickAddTeammate}
            </button>
          </div>
          {isAddingTeammate && (
            <div className="flex gap-2 mb-3">
              <input type="text" placeholder={t.namePlaceholder} value={newTeammateName}
                onChange={e => setNewTeammateName(e.target.value)}
                className="flex-1 text-xs border border-blue-200 rounded-xl px-3 py-2" />
              <button type="button" onClick={handleQuickAdd} disabled={!newTeammateName}
                className="bg-blue-600 text-white text-xs px-3 py-2 rounded-xl font-bold disabled:opacity-50">{t.add}</button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {activeTeam.roster.map(tm => {
              const count = formData.scorers.find((s: any) => s.teammateId === tm.id)?.count || 0;
              return (
                <div key={tm.id} className={`flex items-center rounded-full border shadow-sm ${count > 0 ? 'bg-white border-blue-200 pr-1 pl-0' : 'bg-white border-slate-200 px-0'}`}>
                  <button type="button" onClick={() => handleTeammateGoal(tm.id, 1)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium">
                    {tm.number && <span className="text-[9px] bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center">{tm.number}</span>}
                    <span className="text-slate-700">{tm.name}</span>
                  </button>
                  {count > 0 && (
                    <div className="flex items-center border-l border-slate-100 pl-1">
                      <span className="font-bold text-emerald-600 text-xs mx-1.5">{count}</span>
                      <button type="button" onClick={() => handleTeammateGoal(tm.id, -1)}
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-500">
                        <i className="fas fa-minus text-[9px]" />
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

  // ── Page 3: Report + Media ─────────────────────────────────────────────────────
  const page3 = (
    <div className="space-y-5">
      {/* Rating */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <label className="text-xs font-bold text-slate-400 uppercase">{t.performanceRating}</label>
          <span className={`text-4xl font-black ${styles.text}`}>
            {formData.rating}<span className="text-sm text-slate-300 font-normal ml-1">/ 10</span>
          </span>
        </div>
        <input type="range" name="rating" min="1" max="10" step="0.5" value={formData.rating} onChange={handleChange}
          className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-4" />
        {/* MOTM */}
        <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
          <div className="relative w-10 h-6">
            <input type="checkbox" name="isMotm" id="motm-toggle" checked={formData.isMotm} onChange={handleChange} className="hidden" />
            <label htmlFor="motm-toggle"
              className={`block h-6 rounded-full cursor-pointer transition-colors ${formData.isMotm ? 'bg-yellow-400' : 'bg-slate-300'}`}>
              <span className={`block w-4 h-4 mt-1 rounded-full bg-white shadow transition-all ${formData.isMotm ? 'ml-5' : 'ml-1'}`} />
            </label>
          </div>
          <label htmlFor="motm-toggle" className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1 cursor-pointer">
            <i className="fas fa-trophy text-yellow-500" /> {t.manOfTheMatch}
          </label>
        </div>
      </div>

      {/* Dad comment — enlarged */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center px-4 pt-4 pb-2">
          <label className="text-sm font-bold text-slate-700">{t.dadCommentLabel}</label>
          <select name="commenterIdentity" value={formData.commenterIdentity} onChange={handleChange}
            className="bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs px-2 py-1 font-bold outline-none">
            <option value="Dad">{t.roleDad}</option>
            <option value="Coach">{t.roleCoach}</option>
            <option value="Mom">{t.roleMom}</option>
            <option value="Other">{t.roleOther}</option>
          </select>
        </div>
        <textarea name="dadComment" rows={6} value={formData.dadComment} onChange={handleChange}
          placeholder={t.dadCommentPlaceholder}
          className="w-full px-4 pb-4 text-slate-900 text-base resize-none outline-none leading-relaxed placeholder:text-slate-300" />
        <div className="px-4 pb-2 text-right">
          <span className="text-[10px] text-slate-300">{formData.dadComment.length} 字</span>
        </div>
      </div>

      {/* Kid interview — enlarged */}
      <div className="bg-indigo-50 rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <i className="fas fa-microphone text-indigo-400 text-sm" />
          <label className="text-sm font-bold text-indigo-700">{t.interviewLabel}</label>
        </div>
        <textarea name="kidInterview" rows={5} value={formData.kidInterview} onChange={handleChange}
          placeholder={t.interviewPlaceholder}
          className="w-full px-4 pb-4 bg-transparent text-slate-900 text-base resize-none outline-none leading-relaxed placeholder:text-indigo-200" />
        <div className="px-4 pb-2 text-right">
          <span className="text-[10px] text-indigo-300">{formData.kidInterview.length} 字</span>
        </div>
      </div>

      {/* Video */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <label className="text-xs font-bold text-slate-400 uppercase block mb-3">{t.youtubeLabel}</label>
        <div className="space-y-2 mb-3">
          <input type="url" value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)}
            placeholder={t.youtubePlaceholder}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none" />
          <div className="flex gap-2">
            <select value={newVideoTag} onChange={e => setNewVideoTag(e.target.value as VideoLink['tag'])}
              className="w-1/3 bg-white border border-slate-200 rounded-xl p-2 text-sm text-slate-900 outline-none">
              <option value="highlight">{t.tagHighlight}</option>
              <option value="goal">{t.tagGoal}</option>
              <option value="assist">{t.tagAssist}</option>
              <option value="full">{t.tagFull}</option>
              <option value="other">{t.tagOther}</option>
            </select>
            <input type="text" value={newVideoNote} onChange={e => setNewVideoNote(e.target.value)}
              placeholder={t.videoNote}
              className="flex-1 bg-white border border-slate-200 rounded-xl p-2 text-sm text-slate-900 outline-none" />
          </div>
          <button type="button" onClick={handleAddVideo} disabled={!newVideoUrl}
            className="w-full bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl disabled:opacity-40">
            <i className="fas fa-plus mr-1" /> {t.addVideo}
          </button>
        </div>
        {formData.videos.length > 0 && (
          <div className="space-y-2">
            {formData.videos.map((v: VideoLink) => (
              <div key={v.id} className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-xl">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                    v.tag === 'goal' ? 'bg-emerald-100 text-emerald-700' :
                    v.tag === 'assist' ? 'bg-indigo-100 text-indigo-700' :
                    'bg-red-100 text-red-700'}`}>{v.tag}</span>
                  <a href={v.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 truncate">{v.url}</a>
                </div>
                <button type="button" onClick={() => handleRemoveVideo(v.id)} className="text-slate-300 hover:text-red-500 px-2">
                  <i className="fas fa-times" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className={`${styles.headerBg} p-4 rounded-t-2xl flex-none`}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <h2 className={`text-base font-bold ${styles.headerText}`}>
                {initialData?.id ? t.editMatchReport : t.matchReport}
              </h2>
              {profile.teams.length > 1 ? (
                <select name="teamId" value={formData.teamId} onChange={handleChange}
                  className="bg-white/20 text-white text-xs rounded-lg px-2 py-1 font-bold outline-none border border-white/20">
                  {profile.teams.map(team => <option key={team.id} value={team.id} className="text-slate-800">{team.name}</option>)}
                </select>
              ) : (
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-lg">{activeTeam.name}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Draft indicator */}
              {hasDraft && !initialData?.id && (
                <span className="text-[10px] bg-amber-400 text-amber-900 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <i className="fas fa-pen text-[8px]" /> {t.draft}
                </span>
              )}
              <button onClick={onClose} className={`w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10 ${styles.headerText}`}>
                <i className="fas fa-times" />
              </button>
            </div>
          </div>

          {/* Page tabs */}
          <div className="flex gap-1">
            {([t.formPage1, t.formPage2, t.formPage3] as string[]).map((label, idx) => (
              <button key={idx + 1} type="button" onClick={() => setCurrentPage(idx + 1)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  currentPage === idx + 1
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'bg-black/10 text-slate-800'}`}>
                <i className={`fas ${PAGE_ICONS[idx]} text-[9px]`} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Draft restore banner */}
        {hasDraft && !initialData?.id && currentPage === 1 && (
          <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-between flex-none">
            <span className="text-xs text-amber-700 font-bold flex items-center gap-1">
              <i className="fas fa-history text-amber-500" /> {t.draftRestored}
            </span>
            <button onClick={discardDraft} className="text-[10px] text-amber-600 font-bold underline">
              {t.draftClear}
            </button>
          </div>
        )}

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 min-h-0">
          {currentPage === 1 && page1}
          {currentPage === 2 && !isFixtureMode && page2}
          {currentPage === 2 && isFixtureMode && (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <i className="fas fa-calendar-check text-4xl mb-3 opacity-30" />
              <p className="text-sm font-bold">{t.fixtureMode}</p>
              <p className="text-xs mt-1 opacity-60">{t.fixtureModeStatsHint}</p>
            </div>
          )}
          {currentPage === 3 && !isFixtureMode && page3}
          {currentPage === 3 && isFixtureMode && (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <i className="fas fa-calendar-check text-4xl mb-3 opacity-30" />
              <p className="text-sm font-bold">{t.fixtureMode}</p>
              <p className="text-xs mt-1 opacity-60">{t.fixtureModeReportHint}</p>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="p-4 border-t border-slate-100 bg-white rounded-b-2xl flex-none">
          <div className="flex gap-3">
            {currentPage > 1 && (
              <button type="button" onClick={() => setCurrentPage(p => p - 1)}
                className="flex-none px-5 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-200 transition-colors">
                <i className="fas fa-chevron-left text-xs" /> {t.prevPage}
              </button>
            )}

            {currentPage < PAGE_ICONS.length ? (
              <button type="button" onClick={() => setCurrentPage(p => p + 1)}
                className={`flex-1 ${styles.button} font-bold py-3 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all`}>
                {t.nextPage} <i className="fas fa-chevron-right text-xs" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit}
                className={`flex-1 ${styles.button} font-bold py-3 rounded-xl shadow-md flex items-center justify-center gap-2`}>
                <i className={`fas ${isFixtureMode ? 'fa-calendar-plus' : 'fa-save'}`} /> {t.save}
              </button>
            )}
          </div>

          {/* Page dots */}
          <div className="flex justify-center gap-2 mt-3">
            {[1, 2, 3].map(p => (
              <div key={p}
                className={`rounded-full transition-all ${currentPage === p ? 'w-4 h-2 bg-blue-500' : 'w-2 h-2 bg-slate-200'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchForm;
