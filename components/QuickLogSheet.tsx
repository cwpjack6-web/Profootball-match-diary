import React, { useState, useMemo, useEffect } from 'react';
import { MatchData, UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getTeamById } from '../utils/colors';

interface QuickLogSheetProps {
  isOpen: boolean;
  onClose: () => void;
  matches: MatchData[];
  profile: UserProfile;
  onSave: (matchId: string, update: Partial<MatchData>) => void;
  onCreateMatch: (opponent: string, teamId: string) => string; // returns new match id
}

const QuickLogSheet: React.FC<QuickLogSheetProps> = ({
  isOpen, onClose, matches, profile, onSave, onCreateMatch
}) => {
  const { t, language } = useLanguage();

  // ── State ─────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<'select' | 'log'>('select');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [scoreMyTeam, setScoreMyTeam] = useState(0);
  const [scoreOpponent, setScoreOpponent] = useState(0);
  const [noteText, setNoteText] = useState('');
  const [arthurGoals, setArthurGoals] = useState(0);
  const [arthurAssists, setArthurAssists] = useState(0);
  const [teammateGoals, setTeammateGoals] = useState<Record<string, number>>({});
  const [newOpponent, setNewOpponent] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [showNewMatchForm, setShowNewMatchForm] = useState(false);
  const [ownGoalsFor, setOwnGoalsFor] = useState(0);       // opponent own goal (counts for us)
  const [ownGoalsAgainst, setOwnGoalsAgainst] = useState(0); // our own goal (counts for them)
  type ParticipationStatus = 'full' | 'partial' | 'none';
  const [participation, setParticipation] = useState<ParticipationStatus>('full');
  const [periodPositions, setPeriodPositions] = useState<string[]>([]);
  // Rating modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [pendingRating, setPendingRating] = useState(8);
  // Tournament / Quarter state
  const [currentQuarterNum, setCurrentQuarterNum] = useState(1);

  // ── Derived ───────────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];

  const todayMatches = useMemo(() => {
    return matches.filter(m => m.date === today)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [matches, today]);

  const recentMatch = useMemo(() => {
    if (todayMatches.length > 0) return todayMatches[0];
    // fallback: most recent within 7 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return [...matches]
      .filter(m => m.status !== 'scheduled' && new Date(m.date) >= cutoff)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null;
  }, [matches, todayMatches]);

  const selectedMatch = useMemo(() =>
    matches.find(m => m.id === selectedMatchId) || null,
  [matches, selectedMatchId]);

  // Period count from existing dadComment (count "【節" occurrences)
  const existingPeriodCount = useMemo(() => {
    if (!selectedMatch?.dadComment) return 0;
    return (selectedMatch.dadComment.match(/【節\d+】/g) || []).length;
  }, [selectedMatch]);

  const nextPeriodNum = existingPeriodCount + 1;

  // For league matches, cap at standard period count
  const isLeague = (selectedMatch?.matchType || 'league') === 'league';
  const isTournament = selectedMatch?.matchType === 'tournament';
  const standardPeriods = selectedMatch?.matchStructure === 'halves' ? 2 : 4;
  const periodLimitReached = isLeague && existingPeriodCount >= standardPeriods;

  // Roster for tapping
  const roster = useMemo(() => {
    if (!selectedMatch) return [];
    const team = getTeamById(profile.teams, selectedMatch.teamId);
    return team?.roster || [];
  }, [selectedMatch, profile]);

  // ── Auto-select if only one today match ──────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (todayMatches.length === 1) {
      setSelectedMatchId(todayMatches[0].id);
      prefillFromMatch(todayMatches[0]);
      setStep('log');
    } else if (todayMatches.length === 0 && recentMatch) {
      setSelectedMatchId(recentMatch.id);
      prefillFromMatch(recentMatch);
      setStep('log');
    } else {
      setStep('select');
    }
    setSelectedTeamId(profile.teams[0]?.id || '');
  }, [isOpen]);

  const prefillFromMatch = (m: MatchData) => {
    setScoreMyTeam(m.scoreMyTeam || 0);
    setScoreOpponent(m.scoreOpponent || 0);
    setArthurGoals(0);
    setArthurAssists(0);
    setTeammateGoals({});
    setOwnGoalsFor(0);
    setOwnGoalsAgainst(0);
    setParticipation('full');
    setPeriodPositions([]);
    setNoteText('');
  };

  // ── Reset on close ────────────────────────────────────────────────────────
  const handleClose = () => {
    setStep('select');
    setSelectedMatchId(null);
    setNoteText('');
    setArthurGoals(0);
    setArthurAssists(0);
    setTeammateGoals({});
    setNewOpponent('');
    setShowNewMatchForm(false);
    setOwnGoalsFor(0);
    setOwnGoalsAgainst(0);
    setParticipation('full');
    setCurrentQuarterNum(1);
    setShowRatingModal(false);
    setPendingRating(8);
    onClose();
  };

  // ── Select match ──────────────────────────────────────────────────────────
  const handleSelectMatch = (m: MatchData) => {
    setSelectedMatchId(m.id);
    prefillFromMatch(m);
    setStep('log');
  };

  // ── Create new match then enter log ──────────────────────────────────────
  const handleCreateAndLog = () => {
    if (!newOpponent.trim()) return;
    const teamId = selectedTeamId || profile.teams[0]?.id || '';
    const newId = onCreateMatch(newOpponent.trim(), teamId);
    setSelectedMatchId(newId);
    setScoreMyTeam(0);
    setScoreOpponent(0);
    setArthurGoals(0);
    setArthurAssists(0);
    setTeammateGoals({});
    setNoteText('');
    setShowNewMatchForm(false);
    setNewOpponent('');
    setStep('log');
  };

  // ── Teammate goal tap ─────────────────────────────────────────────────────
  const tapTeammateGoal = (id: string) => {
    setTeammateGoals(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    setScoreMyTeam(s => s + 1);
  };
  const clearTeammateGoal = (id: string) => {
    setTeammateGoals(prev => {
      const next = { ...prev };
      if (next[id] > 0) setScoreMyTeam(s => Math.max(0, s - 1));
      if (next[id] > 1) next[id]--;
      else delete next[id];
      return next;
    });
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!selectedMatchId || !selectedMatch) return;

    // Define participationLabel here (was missing — caused silent crash)
    const participationLabel = participation === 'full'
      ? (language === 'zh' ? '全節' : 'Full')
      : participation === 'partial'
      ? (language === 'zh' ? '部分' : 'Partial')
      : (language === 'zh' ? '未出場' : 'Did Not Play');

    // Build period note block
    const periodHeader = language === 'zh'
      ? `【節${nextPeriodNum}】`
      : `[Period ${nextPeriodNum}]`;

    const goalSummary: string[] = [];
    if (arthurGoals > 0) goalSummary.push(`${profile.name} ⚽×${arthurGoals}`);
    if (arthurAssists > 0) goalSummary.push(`${profile.name} 👟×${arthurAssists}`);
    Object.entries(teammateGoals).forEach(([id, count]) => {
      const player = roster.find(r => r.id === id);
      if (player) goalSummary.push(`${player.name} ⚽×${count}`);
    });

    const goalLine = goalSummary.length > 0
      ? (language === 'zh' ? `入球：${goalSummary.join('、')}\n` : `Goals: ${goalSummary.join(', ')}\n`)
      : '';

    const posLabel = periodPositions.length > 0 ? ` [${periodPositions.join('/')}]` : '';
    const periodBlock = `${periodHeader} [${participationLabel}]${posLabel}\n${goalLine}${noteText.trim()}`;

    // Append to existing dadComment
    const existingComment = selectedMatch.dadComment || '';
    const newComment = existingComment
      ? `${existingComment}\n\n${periodBlock}`
      : periodBlock;

    // Accumulate goals/assists
    const totalArthurGoals = (selectedMatch.arthurGoals || 0) + arthurGoals;
    const totalArthurAssists = (selectedMatch.arthurAssists || 0) + arthurAssists;

    // Build scorers array — using correct {teammateId, count} format from MatchData type
    const existingScorers = selectedMatch.scorers || [];
    const newScorers = [...existingScorers];
    Object.entries(teammateGoals).forEach(([id, count]) => {
      const existing = newScorers.find(s => s.teammateId === id);
      if (existing) {
        existing.count += count;
      } else if (count > 0) {
        newScorers.push({ teammateId: id, count });
      }
    });

    // Accumulate periodsPlayed based on participation
    const periodContribution = participation === 'full' ? 1 : participation === 'partial' ? 0.5 : 0;
    const totalPeriodsPlayed = (selectedMatch.periodsPlayed || 0) + periodContribution;

    // Accumulate positionPlayed (add new position if not already present)
    const existingPositions: string[] = Array.isArray(selectedMatch.positionPlayed)
      ? selectedMatch.positionPlayed
      : (selectedMatch.positionPlayed ? [selectedMatch.positionPlayed as string] : []);
    const updatedPositions = [...new Set([...existingPositions, ...periodPositions])];

    onSave(selectedMatchId, {
      dadComment: newComment,
      scoreMyTeam,
      scoreOpponent,
      arthurGoals: totalArthurGoals,
      arthurAssists: totalArthurAssists,
      scorers: newScorers,
      periodsPlayed: totalPeriodsPlayed,
      positionPlayed: updatedPositions,
      status: 'completed',
    });

    // Reset per-period fields, ready for next period
    setArthurGoals(0);
    setArthurAssists(0);
    setTeammateGoals({});
    setOwnGoalsFor(0);
    setOwnGoalsAgainst(0);
    setNoteText('');
    setPeriodPositions([]);
    // Score carries over (cumulative)
  };

  // ── Tournament: save quarter and auto-advance ─────────────────────────────
  const handleSaveTournamentQuarter = () => {
    if (!selectedMatchId || !selectedMatch) return;

    const qNum = currentQuarterNum;
    const qHeader = language === 'zh' ? `【Q${qNum}】` : `[Q${qNum}]`;
    const goalSummary: string[] = [];
    if (arthurGoals > 0) goalSummary.push(`${profile.name} ⚽×${arthurGoals}`);
    if (arthurAssists > 0) goalSummary.push(`${profile.name} 👟×${arthurAssists}`);
    Object.entries(teammateGoals).forEach(([id, count]) => {
      const player = roster.find(r => r.id === id);
      if (player) goalSummary.push(`${player.name} ⚽×${count}`);
    });
    const goalLine = goalSummary.length > 0
      ? (language === 'zh' ? `入球：${goalSummary.join('、')}\n` : `Goals: ${goalSummary.join(', ')}\n`)
      : '';
    const qBlock = `${qHeader} ${scoreMyTeam}–${scoreOpponent}\n${goalLine}${noteText.trim()}`;
    const existingComment = selectedMatch.dadComment || '';
    const newComment = existingComment ? `${existingComment}\n\n${qBlock}` : qBlock;

    const totalArthurGoals = (selectedMatch.arthurGoals || 0) + arthurGoals;
    const totalArthurAssists = (selectedMatch.arthurAssists || 0) + arthurAssists;

    // Build new quarter entry
    const existingQuarters = selectedMatch.quarters || [];
    const newQuarter = { scoreMyTeam, scoreOpponent, arthurGoals, arthurAssists, comment: noteText.trim() };

    onSave(selectedMatchId, {
      dadComment: newComment,
      scoreMyTeam,
      scoreOpponent,
      arthurGoals: totalArthurGoals,
      arthurAssists: totalArthurAssists,
      quarters: [...existingQuarters, newQuarter],
      status: 'completed',
    });

    // Advance to next quarter
    setCurrentQuarterNum(q => q + 1);
    setArthurGoals(0);
    setArthurAssists(0);
    setTeammateGoals({});
    setNoteText('');
    setOwnGoalsFor(0);
    setOwnGoalsAgainst(0);
  };

  // ── Done: save current period first, then show rating modal ────────────────
  const handleDone = () => {
    // Save the current (final) period's data before showing rating modal
    // Only auto-save if there's actual content to save
    const hasContentToSave = noteText.trim().length > 0
      || arthurGoals > 0
      || arthurAssists > 0
      || Object.keys(teammateGoals).length > 0
      || ownGoalsFor > 0
      || ownGoalsAgainst > 0;

    if (hasContentToSave && selectedMatchId && selectedMatch) {
      handleSave();
    }
    setShowRatingModal(true);
  };

  const handleRatingConfirm = () => {
    if (!selectedMatchId || !selectedMatch) { handleClose(); return; }
    onSave(selectedMatchId, { rating: pendingRating });
    setShowRatingModal(false);
    handleClose();
  };

  const handleRatingSkip = () => {
    setShowRatingModal(false);
    handleClose();
  };

  if (!isOpen) return null;

  // Can save if: any content entered, OR participation explicitly chosen (even 'none')
  const hasContent = noteText.trim().length > 0 || arthurGoals > 0 || arthurAssists > 0 || Object.keys(teammateGoals).length > 0 || ownGoalsFor > 0 || ownGoalsAgainst > 0;
  const scoreChanged = scoreMyTeam !== (selectedMatch?.scoreMyTeam ?? 0) || scoreOpponent !== (selectedMatch?.scoreOpponent ?? 0);
  // Always saveable once participation is set (all 3 options are explicit choices)
  const canSave = true;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end sm:items-center sm:justify-center" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] w-full sm:max-w-lg sm:max-h-[85vh]"
        style={{ animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)' }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            {step === 'log' && (
              <button onClick={() => setStep('select')} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mr-1">
                <i className="fas fa-chevron-left text-xs" />
              </button>
            )}
            <span className="text-sm font-black text-slate-800">
              {step === 'select'
                ? (language === 'zh' ? '⚡ 快速記錄' : '⚡ Quick Log')
                : isTournament
                  ? `⚡ ${selectedMatch?.tournamentName || 'Tournament'} · Q${currentQuarterNum}`
                  : `⚡ ${language === 'zh' ? `節${nextPeriodNum}` : `Period ${nextPeriodNum}`} · vs ${selectedMatch?.opponent}`}
            </span>
          </div>
          <button onClick={handleClose} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <i className="fas fa-times text-xs" />
          </button>
        </div>

        {/* ── STEP 1: Select match ─────────────────────────────────────────── */}
        {step === 'select' && (
          <div className="overflow-y-auto flex-1 p-4 space-y-3">

            {/* Today's matches */}
            {todayMatches.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">
                  {language === 'zh' ? '今日比賽' : "Today's Matches"}
                </p>
                <div className="space-y-2">
                  {todayMatches.map(m => {
                    const team = getTeamById(profile.teams, m.teamId);
                    const periods = (m.dadComment?.match(/【節\d+】|\[Period \d+\]/g) || []).length;
                    return (
                      <button key={m.id} onClick={() => handleSelectMatch(m)}
                        className="w-full flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3 text-left active:scale-[0.98] transition-transform">
                        <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                          <i className="fas fa-futbol text-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-slate-800 text-sm">vs {m.opponent}</div>
                          <div className="text-[10px] text-slate-500 font-bold">{team.name}
                            {periods > 0 && <span className="ml-2 text-blue-500">
                              {language === 'zh' ? `已記${periods}節` : `${periods} periods logged`}
                            </span>}
                          </div>
                        </div>
                        <div className="text-blue-500 font-black text-sm">{m.scoreMyTeam}–{m.scoreOpponent}</div>
                        <i className="fas fa-chevron-right text-blue-300 text-xs" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent match (non-today) */}
            {todayMatches.length === 0 && recentMatch && (
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">
                  {language === 'zh' ? '最近比賽' : 'Recent Match'}
                </p>
                <button onClick={() => handleSelectMatch(recentMatch)}
                  className="w-full flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 text-left active:scale-[0.98] transition-transform">
                  <div className="w-9 h-9 rounded-full bg-slate-400 text-white flex items-center justify-center shrink-0">
                    <i className="fas fa-futbol text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-800 text-sm">vs {recentMatch.opponent}</div>
                    <div className="text-[10px] text-slate-500 font-bold">{recentMatch.date}</div>
                  </div>
                  <i className="fas fa-chevron-right text-slate-300 text-xs" />
                </button>
              </div>
            )}

            {/* New match */}
            {!showNewMatchForm ? (
              <button onClick={() => setShowNewMatchForm(true)}
                className="w-full flex items-center gap-3 border-2 border-dashed border-slate-200 rounded-xl p-3 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
                <i className="fas fa-plus-circle text-lg" />
                <span className="text-sm font-bold">
                  {language === 'zh' ? '新增今日比賽' : 'Add new match'}
                </span>
              </button>
            ) : (
              <div className="border border-blue-200 rounded-xl p-4 space-y-3 bg-blue-50">
                <p className="text-xs font-black text-blue-700">
                  {language === 'zh' ? '新比賽' : 'New Match'}
                </p>
                <input
                  type="text"
                  value={newOpponent}
                  onChange={e => setNewOpponent(e.target.value)}
                  placeholder={language === 'zh' ? '對手名稱' : 'Opponent name'}
                  className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-blue-400"
                  autoFocus
                />
                {profile.teams.length > 1 && (
                  <select value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)}
                    className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm font-bold outline-none">
                    {profile.teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setShowNewMatchForm(false)}
                    className="flex-1 py-2 bg-white text-slate-500 rounded-lg text-sm font-bold border border-slate-200">
                    {language === 'zh' ? '取消' : 'Cancel'}
                  </button>
                  <button onClick={handleCreateAndLog} disabled={!newOpponent.trim()}
                    className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold disabled:opacity-40">
                    {language === 'zh' ? '建立並記錄' : 'Create & Log'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Log ──────────────────────────────────────────────────── */}
        {step === 'log' && (
          <div className="overflow-y-auto flex-1">

            {/* Tournament: Quarter tabs */}
            {isTournament && (
              <div className="px-4 pt-3">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {Array.from({ length: currentQuarterNum }, (_, i) => i + 1).map(q => (
                    <button key={q} onClick={() => setCurrentQuarterNum(q)}
                      className={`px-3 py-1.5 rounded-full text-xs font-black shrink-0 transition-all border-2 ${
                        q === currentQuarterNum
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-slate-400 border-slate-200'
                      }`}>
                      Q{q} {q < currentQuarterNum ? '✓' : ''}
                    </button>
                  ))}
                  <button onClick={() => setCurrentQuarterNum(q => q + 1)}
                    className="px-3 py-1.5 rounded-full text-xs font-black shrink-0 border-2 border-dashed border-purple-300 text-purple-400">
                    + Q{currentQuarterNum + 1}
                  </button>
                </div>
                <p className="text-[10px] text-purple-500 font-bold mt-1">
                  {language === 'zh' ? `正在記錄 Q${currentQuarterNum} 數據` : `Logging Q${currentQuarterNum} data`}
                </p>
              </div>
            )}

            {/* Period summary for non-tournament */}
            {!isTournament && existingPeriodCount > 0 && (
              <div className="mx-4 mt-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-[10px] text-blue-500 font-bold">
                  {language === 'zh' ? `已記 ${existingPeriodCount} 節` : `${existingPeriodCount} period(s) logged`}
                </p>
              </div>
            )}

            <div className="p-4 space-y-4">

              {/* ① Score */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">
                  {isTournament ? (language === 'zh' ? `Q${currentQuarterNum} 比數` : `Q${currentQuarterNum} Score`) : (language === 'zh' ? `Q${nextPeriodNum} 比數` : `Q${nextPeriodNum} Score`)}
                </p>
                <div className="flex items-center justify-center gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
                  {/* My team */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase">{language === 'zh' ? '我方' : 'Us'}</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setScoreMyTeam(Math.max(0, scoreMyTeam - 1))}
                        className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 text-lg font-black active:bg-slate-100 shadow-sm">−</button>
                      <span className="text-4xl font-black text-slate-800 w-10 text-center">{scoreMyTeam}</span>
                      <button onClick={() => setScoreMyTeam(scoreMyTeam + 1)}
                        className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg font-black active:bg-emerald-600 shadow-sm">+</button>
                    </div>
                  </div>
                  <span className="text-2xl font-black text-slate-300 pb-1">–</span>
                  {/* Opponent */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase">{language === 'zh' ? '對方' : 'Them'}</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setScoreOpponent(Math.max(0, scoreOpponent - 1))}
                        className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 text-lg font-black active:bg-slate-100 shadow-sm">−</button>
                      <span className="text-4xl font-black text-slate-800 w-10 text-center">{scoreOpponent}</span>
                      <button onClick={() => setScoreOpponent(scoreOpponent + 1)}
                        className="w-9 h-9 rounded-full bg-rose-400 text-white flex items-center justify-center text-lg font-black active:bg-rose-500 shadow-sm">+</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ② Goals & Assists */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">
                  {isTournament ? (language === 'zh' ? `Q${currentQuarterNum} 入球 / 助攻` : `Q${currentQuarterNum} Goals / Assists`) : (language === 'zh' ? `Q${nextPeriodNum} 入球 / 助攻` : `Q${nextPeriodNum} Goals / Assists`)}
                </p>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-3">

                  {/* Arthur */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-black shrink-0">
                      {profile.name.charAt(0)}
                    </div>
                    <span className="text-xs font-black text-slate-700 flex-1">{profile.name}</span>
                    {/* Goals */}
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { if (arthurGoals > 0) { setArthurGoals(arthurGoals - 1); setScoreMyTeam(s => Math.max(0, s - 1)); } }}
                        className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-400 text-sm font-black flex items-center justify-center active:bg-slate-100">−</button>
                      <span className="text-sm font-black text-emerald-600 w-5 text-center">⚽{arthurGoals}</span>
                      <button onClick={() => { setArthurGoals(arthurGoals + 1); setScoreMyTeam(s => s + 1); }}
                        className="w-6 h-6 rounded-full bg-emerald-500 text-white text-sm font-black flex items-center justify-center active:bg-emerald-600">+</button>
                    </div>
                    {/* Assists */}
                    <div className="flex items-center gap-1.5 ml-2">
                      <button onClick={() => setArthurAssists(Math.max(0, arthurAssists - 1))}
                        className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-400 text-sm font-black flex items-center justify-center active:bg-slate-100">−</button>
                      <span className="text-sm font-black text-indigo-500 w-5 text-center">👟{arthurAssists}</span>
                      <button onClick={() => setArthurAssists(arthurAssists + 1)}
                        className="w-6 h-6 rounded-full bg-indigo-500 text-white text-sm font-black flex items-center justify-center active:bg-indigo-600">+</button>
                    </div>
                  </div>

                  {/* Teammates */}
                  {roster.length > 0 && (
                    <div className="border-t border-slate-200 pt-2 space-y-2">
                      {roster.map(player => {
                        const count = teammateGoals[player.id] || 0;
                        return (
                          <div key={player.id} className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-black shrink-0">
                              {player.name.charAt(0)}
                            </div>
                            <span className="text-xs font-bold text-slate-600 flex-1">{player.name}</span>
                            <div className="flex items-center gap-1.5">
                              {count > 0 && (
                                <button onClick={() => clearTeammateGoal(player.id)}
                                  className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-400 text-sm font-black flex items-center justify-center active:bg-slate-100">−</button>
                              )}
                              {count > 0 && (
                                <span className="text-sm font-black text-emerald-600 w-5 text-center">⚽{count}</span>
                              )}
                              <button onClick={() => tapTeammateGoal(player.id)}
                                className={`w-7 h-7 rounded-full text-white text-xs font-black flex items-center justify-center transition-colors ${count > 0 ? 'bg-emerald-500 active:bg-emerald-600' : 'bg-slate-300 active:bg-slate-400'}`}>
                                {count > 0 ? '+' : '⚽'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ③ Own Goals */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">
                  {language === 'zh' ? '烏龍球' : 'Own Goals'}
                </p>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                  {/* Opponent OG → counts for us */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-xs font-black shrink-0">OG</div>
                    <span className="text-xs font-bold text-slate-600 flex-1">
                      {language === 'zh' ? '對方烏龍球（我方得分）' : 'Opponent OG (counts for us)'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {ownGoalsFor > 0 && (
                        <button onClick={() => { if (ownGoalsFor > 0) { setOwnGoalsFor(ownGoalsFor - 1); setScoreMyTeam(s => Math.max(0, s - 1)); } }}
                          className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-400 text-sm font-black flex items-center justify-center active:bg-slate-100">−</button>
                      )}
                      {ownGoalsFor > 0 && <span className="text-sm font-black text-orange-500 w-5 text-center">×{ownGoalsFor}</span>}
                      <button onClick={() => { setOwnGoalsFor(ownGoalsFor + 1); setScoreMyTeam(s => s + 1); }}
                        className={`w-7 h-7 rounded-full text-white text-xs font-black flex items-center justify-center transition-colors ${ownGoalsFor > 0 ? 'bg-orange-400 active:bg-orange-500' : 'bg-slate-300 active:bg-slate-400'}`}>
                        {ownGoalsFor > 0 ? '+' : 'OG'}
                      </button>
                    </div>
                  </div>
                  {/* Our OG → counts for opponent */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center text-xs font-black shrink-0">OG</div>
                    <span className="text-xs font-bold text-slate-600 flex-1">
                      {language === 'zh' ? '我方烏龍球（對方得分）' : 'Our OG (counts for them)'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {ownGoalsAgainst > 0 && (
                        <button onClick={() => { if (ownGoalsAgainst > 0) { setOwnGoalsAgainst(ownGoalsAgainst - 1); setScoreOpponent(s => Math.max(0, s - 1)); } }}
                          className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-400 text-sm font-black flex items-center justify-center active:bg-slate-100">−</button>
                      )}
                      {ownGoalsAgainst > 0 && <span className="text-sm font-black text-rose-500 w-5 text-center">×{ownGoalsAgainst}</span>}
                      <button onClick={() => { setOwnGoalsAgainst(ownGoalsAgainst + 1); setScoreOpponent(s => s + 1); }}
                        className={`w-7 h-7 rounded-full text-white text-xs font-black flex items-center justify-center transition-colors ${ownGoalsAgainst > 0 ? 'bg-rose-400 active:bg-rose-500' : 'bg-slate-300 active:bg-slate-400'}`}>
                        {ownGoalsAgainst > 0 ? '+' : 'OG'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ④ Participation */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">
                  {language === 'zh' ? `阿仔今節出場？` : `Participation This Period`}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'full',    labelZh: '全節正選', labelEn: 'Full Period',   icon: 'fa-circle',       color: 'emerald' },
                    { key: 'partial', labelZh: '部分上陣', labelEn: 'Partial',        icon: 'fa-adjust',       color: 'amber'   },
                    { key: 'none',    labelZh: '未出場',   labelEn: 'Did Not Play',   icon: 'fa-circle-notch', color: 'slate'   },
                  ] as const).map(opt => (
                    <button key={opt.key} onClick={() => setParticipation(opt.key)}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-black transition-all ${
                        participation === opt.key
                          ? opt.color === 'emerald' ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : opt.color === 'amber'   ? 'border-amber-400 bg-amber-50 text-amber-700'
                          : 'border-slate-400 bg-slate-100 text-slate-600'
                          : 'border-slate-100 bg-white text-slate-400'
                      }`}>
                      <i className={`fas ${opt.icon} text-sm`} />
                      {language === 'zh' ? opt.labelZh : opt.labelEn}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 text-center mt-1.5">
                  {participation === 'full'    ? (language === 'zh' ? '計 1 節' : '+1 period') :
                   participation === 'partial' ? (language === 'zh' ? '計 0.5 節' : '+0.5 period') :
                                                  (language === 'zh' ? '唔計入上陣節數' : 'Not counted')}
                </p>
              </div>

              {/* ⑤ Position */}
              {participation !== 'none' && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">
                    {language === 'zh' ? `阿仔今節打咩位？` : `Position This Period`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(['FW','LW','RW','MF','DF','GK'] as const).map(pos => (
                      <button key={pos} onClick={() => setPeriodPositions(prev =>
                          prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
                        )}
                        className={`px-3 py-1.5 rounded-full text-xs font-black border-2 transition-all ${
                          periodPositions.includes(pos)
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}>
                        {pos}
                      </button>
                    ))}
                  </div>
                  {periodPositions.length > 0 && (
                    <p className="text-[10px] text-blue-500 font-bold mt-1.5">
                      {language === 'zh' ? `✓ 已選：${periodPositions.join(' / ')}` : `✓ Selected: ${periodPositions.join(' / ')}`}
                    </p>
                  )}
                </div>
              )}

              {/* ⑥ Note */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">
                  {isTournament ? (language === 'zh' ? `Q${currentQuarterNum} 筆記` : `Q${currentQuarterNum} Notes`) : (language === 'zh' ? `節${nextPeriodNum} 筆記` : `Period ${nextPeriodNum} Notes`)}
                </p>
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder={language === 'zh' ? '今節重點…' : 'Key moments this period…'}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white transition-colors resize-none"
                />
              </div>

            </div>
          </div>
        )}

        {/* Save button */}
        {step === 'log' && (
          <div className="p-4 border-t border-slate-100 bg-white shrink-0">
            {isTournament ? (
              /* Tournament: two buttons — save quarter + done */
              <div className="space-y-2">
                <button
                  onClick={handleSaveTournamentQuarter}
                  disabled={!canSave}
                  className="w-full py-3 bg-purple-600 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 active:bg-purple-700 disabled:opacity-40 transition-colors shadow-lg"
                >
                  <i className="fas fa-save" />
                  {language === 'zh' ? `儲存 Q${currentQuarterNum} · 繼續 Q${currentQuarterNum + 1}` : `Save Q${currentQuarterNum} · Continue Q${currentQuarterNum + 1}`}
                </button>
                <button
                  onClick={handleDone}
                  className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-sm flex items-center justify-center gap-2 active:bg-slate-200 transition-colors"
                >
                  <i className="fas fa-check" />
                  {language === 'zh' ? '完成今場 Game' : 'Done with this Game'}
                </button>
              </div>
            ) : (
              /* League/Friendly: same two-button design as Tournament */
              <div className="space-y-2">
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 active:bg-blue-700 disabled:opacity-40 transition-colors shadow-lg"
                >
                  <i className="fas fa-save" />
                  {language === 'zh' ? `儲存 Q${nextPeriodNum} · 繼續 Q${nextPeriodNum + 1}` : `Save Q${nextPeriodNum} · Continue Q${nextPeriodNum + 1}`}
                </button>
                <button
                  onClick={handleDone}
                  className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-sm flex items-center justify-center gap-2 active:bg-slate-200 transition-colors"
                >
                  <i className="fas fa-check" />
                  {language === 'zh' ? '完成，評分並關閉' : 'Done & Rate'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Rating Modal ─────────────────────────────────────────────────── */}
      {showRatingModal && <style>{`
        .rating-sheet input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 28px; height: 28px; border-radius: 50%; background: white; border: 3px solid #3b82f6; box-shadow: 0 2px 8px rgba(0,0,0,0.15); cursor: pointer; }
        .rating-sheet input[type=range]::-moz-range-thumb { width: 28px; height: 28px; border-radius: 50%; background: white; border: 3px solid #3b82f6; box-shadow: 0 2px 8px rgba(0,0,0,0.15); cursor: pointer; }
      `}</style>}
      {showRatingModal && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center" onClick={handleRatingSkip}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="rating-sheet relative z-10 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6"
            style={{ animation: 'slideUp 0.25s cubic-bezier(0.32,0.72,0,1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center mb-1">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <h3 className="text-base font-black text-slate-800 text-center mt-3 mb-1">
              {language === 'zh' ? '今場表現如何？' : 'How did it go?'}
            </h3>
            <p className="text-[11px] text-slate-400 text-center mb-5">
              {language === 'zh' ? `vs ${selectedMatch?.opponent}` : `vs ${selectedMatch?.opponent}`}
            </p>

            {/* Rating number display */}
            <div className="text-center mb-4">
              <span className={`text-5xl font-black ${pendingRating >= 8 ? 'text-emerald-500' : pendingRating >= 6 ? 'text-amber-500' : 'text-rose-400'}`}>
                {pendingRating}
              </span>
              <span className="text-slate-400 text-lg font-bold"> / 10</span>
            </div>

            {/* Non-linear slider: 1-5 integers = 30%, 5.5-10 half-steps = 70% */}
            {(() => {
              const ratingToPos = (r: number): number => {
                if (r <= 5) return ((r - 1) / 4) * 30;
                return 30 + ((r - 5.5) / 4.5) * 70;
              };
              const posToRating = (pos: number): number => {
                if (pos <= 30) return Math.min(5, Math.round(1 + (pos / 30) * 4));
                return Math.min(10, Math.round((5.5 + ((pos - 30) / 70) * 4.5) * 2) / 2);
              };
              const pos = ratingToPos(pendingRating);
              const ratingColor = pendingRating >= 8 ? '#10b981' : pendingRating >= 6 ? '#f59e0b' : '#ef4444';
              return (
                <div className="mb-3">
                  <div className="relative mb-2">
                    <div className="absolute top-1/2 left-0 right-0 h-4 -translate-y-1/2 rounded-full bg-slate-100 overflow-hidden pointer-events-none">
                      <div className="h-full rounded-full transition-all duration-100"
                        style={{ width: `${pos}%`, backgroundColor: ratingColor, opacity: 0.85 }} />
                      <div className="absolute top-0 bottom-0 w-0.5 bg-white/60" style={{ left: '30%' }} />
                    </div>
                    <input
                      type="range" min="0" max="100" step="0.5"
                      value={pos}
                      onChange={e => setPendingRating(posToRating(Number(e.target.value)))}
                      className="relative w-full h-4 rounded-full appearance-none cursor-pointer bg-transparent"
                      style={{ WebkitAppearance: 'none' }}
                    />
                  </div>
                  {/* Tick labels */}
                  <div className="flex mb-2 text-[10px] font-bold">
                    <div className="flex justify-between text-slate-300" style={{ width: '30%' }}>
                      <span>1</span><span>3</span><span>5</span>
                    </div>
                    <div className="w-0.5" />
                    <div className="flex justify-between pl-1" style={{ width: '70%' }}>
                      {[5.5,6,6.5,7,7.5,8,8.5,9,9.5,10].map(n => (
                        <button key={n} type="button" onClick={() => setPendingRating(n)}
                          className={`transition-all ${pendingRating === n
                            ? n >= 8 ? 'text-emerald-500 scale-125 font-black'
                              : n >= 6 ? 'text-amber-500 scale-125 font-black'
                              : 'text-rose-400 scale-125 font-black'
                            : 'text-slate-300'}`}>
                          {n % 1 === 0 ? n : '·'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-3">
              <button onClick={handleRatingSkip}
                className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-sm">
                {language === 'zh' ? '跳過' : 'Skip'}
              </button>
              <button onClick={handleRatingConfirm}
                className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg">
                <i className="fas fa-star text-yellow-300" />
                {language === 'zh' ? `確認 ⭐${pendingRating}` : `Confirm ⭐${pendingRating}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickLogSheet;
