import React, { useState, useEffect, useMemo } from 'react';
import { MatchData, UserProfile, Team, migrateMatchType } from './types';
import JournalSheet, { JournalEntry } from './components/JournalSheet';
import { 
  getMatches, 
  addMatchToStorage, 
  updateMatchInStorage,
  deleteMatchFromStorage,
  getAllProfiles,
  saveUserProfile,
  deleteUserProfile,
  isBackupNeeded
} from './services/storage';
import { getTeamById, getTeamColorStyles, COLORS } from './utils/colors';
import { extractYoutubeId } from './utils/youtube';
import { useLanguage } from './context/LanguageContext';
import { useToast } from './context/ToastContext';
import MatchForm from './components/MatchForm';
import ProfileSetup from './components/ProfileSetup';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import CoverPage from './components/CoverPage';
import SyncModal from './components/SyncModal';
import ShareCard from './components/ShareCard';
import TournamentEditModal from './components/TournamentEditModal';           // ← 換成統一組件
import OpponentStatsModal from './components/OpponentStatsModal';
import MatchTimeline from './components/MatchTimeline';
import VideoModal from './components/VideoModal';
import TeamManager from './components/TeamManager';
import CoachReport from './components/CoachReport';
import WhatsNewModal from './components/WhatsNewModal';
import QuickLogSheet from './components/QuickLogSheet';
import OnboardingModal from './components/OnboardingModal';

type AppView = 'cover' | 'setup' | 'dashboard';
type Tab = 'matches' | 'stats' | 'teams' | 'coach' | 'journal';

const APP_VERSION = '1.2.0';

const App: React.FC = () => {
  const { t, language, toggleLanguage } = useLanguage();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  
  // App State
  const [currentView, setCurrentView] = useState<AppView>('cover');
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  
  // Dashboard Data
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [journals, setJournals] = useState<JournalEntry[]>(() => {
    try { const r = localStorage.getItem('journal_entries'); return r ? JSON.parse(r) : []; }
    catch { return []; }
  });
  const [editingMatch, setEditingMatch] = useState<MatchData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('matches');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showBackupAlert, setShowBackupAlert] = useState(false);
  
  // Update Modal State
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Filter & Search State
  const [quickTeamFilter, setQuickTeamFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
  const [syncSubset, setSyncSubset] = useState<MatchData[] | null>(null);

  // UI State
  const [expandedMatchIds, setExpandedMatchIds] = useState<Set<string>>(new Set());
  const [scrollToMatchId, setScrollToMatchId] = useState<string | null>(null);
  const [shareMatch, setShareMatch] = useState<MatchData | null>(null);
  const [shareTournament, setShareTournament] = useState<{ name: string; matches: MatchData[] } | null>(null);
  const [editingTournament, setEditingTournament] = useState<{ name: string; matches: MatchData[] } | null>(null);
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null);
  const [viewingVideoId, setViewingVideoId] = useState<string | null>(null);

  // ── 新增：賽季分享 state ──────────────────────────────────────────────────
  const [showSeasonShare, setShowSeasonShare] = useState(false);

  useEffect(() => {
    const profiles = getAllProfiles();
    setAllProfiles(profiles);
    setCurrentView('cover');
    setLoading(false);
    
    const lastVersion = localStorage.getItem('arthur_app_version');
    if (lastVersion !== APP_VERSION) {
        setShowWhatsNew(true);
    }

    // Show onboarding for first-time users (no profiles, never seen onboarding)
    const hasSeenOnboarding = localStorage.getItem('arthur_onboarding_done');
    if (!hasSeenOnboarding && profiles.length === 0) {
        setShowOnboarding(true);
    }
  }, []);
  
  const handleCloseWhatsNew = () => {
      localStorage.setItem('arthur_app_version', APP_VERSION);
      setShowWhatsNew(false);
  };

  const handleOnboardingComplete = () => {
      localStorage.setItem('arthur_onboarding_done', '1');
      setShowOnboarding(false);
  };

  useEffect(() => {
    if (activeProfile) {
        const userMatches = getMatches(activeProfile.id).map(migrateMatchType);
        setMatches(userMatches);
        setIsSelectionMode(false);
        setSelectedMatchIds(new Set());
        setDeleteConfirmId(null);
        setExpandedMatchIds(new Set());
        setQuickTeamFilter('all'); 
        setSearchQuery('');
        setShowArchived(false);
        checkBackupStatus();
    }
  }, [activeProfile]);

  const checkBackupStatus = () => {
      setShowBackupAlert(isBackupNeeded());
  };

  const transitionView = (view: AppView) => {
    if ((document as any).startViewTransition) {
      (document as any).startViewTransition(() => { setCurrentView(view); });
    } else {
      setCurrentView(view);
    }
  };

  const transitionTab = (tab: Tab) => {
    if ((document as any).startViewTransition) {
      (document as any).startViewTransition(() => { setActiveTab(tab); });
    } else {
      setActiveTab(tab);
    }
  };

  const filteredMatches = useMemo(() => {
    let result = matches;

    if (!showArchived && activeProfile) {
        result = result.filter(m => {
            const team = getTeamById(activeProfile.teams, m.teamId);
            return !team.isArchived;
        });
    }

    if (quickTeamFilter !== 'all') {
        result = result.filter(m => m.teamId === quickTeamFilter);
    }

    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        result = result.filter(m => 
            m.opponent.toLowerCase().includes(q) ||
            (m.location && m.location.toLowerCase().includes(q))
        );
    }

    return result;
  }, [matches, quickTeamFilter, searchQuery, showArchived, activeProfile]);

  const formGuide = useMemo(() => {
      if (!activeProfile || matches.length === 0) return null;
      
      let relevantMatches = matches.filter(m => m.status !== 'scheduled');
      
      if (quickTeamFilter !== 'all') {
          relevantMatches = relevantMatches.filter(m => m.teamId === quickTeamFilter);
      }
      
      relevantMatches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const last5 = relevantMatches.slice(0, 5).reverse();
      if (last5.length === 0) return null;

      return last5.map(m => {
          if (m.scoreMyTeam > m.scoreOpponent) return 'W';
          if (m.scoreMyTeam < m.scoreOpponent) return 'L';
          return 'D';
      });
  }, [matches, quickTeamFilter, activeProfile]);

  // --- Handlers ---

  const handleSelectProfile = (profile: UserProfile) => {
    setActiveProfile(profile);
    transitionView('dashboard');
    setActiveTab('matches');
  };

  const handleAddNewProfile = () => { setActiveProfile(null); transitionView('setup'); };
  const handleEditProfile = () => { transitionView('setup'); };
  const handleSwitchUser = () => { setActiveProfile(null); transitionView('cover'); };

  const handleSaveProfile = (newProfile: UserProfile) => {
    saveUserProfile(newProfile);
    const updatedProfiles = getAllProfiles();
    setAllProfiles(updatedProfiles);
    if (activeProfile && activeProfile.id === newProfile.id) {
         setActiveProfile(newProfile);
         transitionView('dashboard');
    } else {
        transitionView('cover');
    }
    showToast(t.saveProfile + ' ' + t.done, 'success');
  };
  
  const handleDeleteProfile = (id: string) => {
      const updatedList = deleteUserProfile(id);
      setAllProfiles(updatedList);
      showToast(t.deleteSuccess, 'success');
  };

  const handleUpdateProfileFromManager = (updated: UserProfile) => {
      saveUserProfile(updated);
      setAllProfiles(getAllProfiles());
      setActiveProfile(updated);
      showToast(t.save + ' ' + t.done, 'success');
  };

  const handleSyncComplete = () => {
      const profiles = getAllProfiles();
      setAllProfiles(profiles);
      if (activeProfile) {
          const userMatches = getMatches(activeProfile.id).map(migrateMatchType);
          setMatches(userMatches);
          const updatedProfile = profiles.find(p => p.id === activeProfile.id);
          if (updatedProfile) setActiveProfile(updatedProfile);
      }
      checkBackupStatus();
      showToast(t.syncSuccess, 'success');
  };

  const handleFormSubmit = (data: Omit<MatchData, 'id'>) => {
    if (!activeProfile) return;
    
    if (editingMatch && editingMatch.id) {
      const updatedList = updateMatchInStorage({ ...data, id: editingMatch.id, profileId: activeProfile.id });
      setMatches(updatedList);
      showToast(t.save + ' ' + t.done, 'success');
    } else {
      const updatedList = addMatchToStorage({ ...data, id: Date.now().toString(), profileId: activeProfile.id });
      setMatches(updatedList);
      showToast(t.addFirstMatch + ' ' + t.done, 'success');
    }
    setIsFormOpen(false);
    setEditingMatch(null);
  };

  const handleDuplicateLast = () => {
    if (matches.length === 0) { setIsFormOpen(true); return; }
    const sorted = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setEditingMatch({ ...sorted[0], id: '', scoreMyTeam: 0, scoreOpponent: 0, scorers: [], arthurGoals: 0, arthurAssists: 0, dadComment: '', kidInterview: '', videos: [], rating: 8, isMotm: false });
    setIsFormOpen(true);
  };
  const openEditForm = (e: React.MouseEvent, match: MatchData) => { e.stopPropagation(); setEditingMatch(match); setIsFormOpen(true); };
  const handleShare = (e: React.MouseEvent, match: MatchData) => { e.stopPropagation(); setShareMatch(match); };
  const handleTournamentSave = (name: string, tMatches: MatchData[], updates: Partial<MatchData>) => {
    if (!activeProfile) return;
    let updatedList = [...matches];
    tMatches.forEach(m => {
      updatedList = updateMatchInStorage({ ...m, ...updates, id: m.id, profileId: activeProfile.id });
    });
    setMatches(updatedList);
    setEditingTournament(null);
    showToast(language === 'zh' ? `已同步到 ${tMatches.length} 場比賽` : `Synced to ${tMatches.length} games`, 'success');
  };
  const handleTrashClick = (e: React.MouseEvent, id: string) => { e.stopPropagation(); setDeleteConfirmId(id); };
  const handleConfirmDelete = (e: React.MouseEvent, id: string) => { e.stopPropagation(); if(activeProfile) setMatches(deleteMatchFromStorage(id, activeProfile.id)); setDeleteConfirmId(null); showToast(t.deleteSuccess, 'info'); };
  const handleCancelDelete = (e: React.MouseEvent) => { e.stopPropagation(); setDeleteConfirmId(null); };
  const toggleMatchExpansion = (e: React.MouseEvent, id: string) => { e.stopPropagation(); setExpandedMatchIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const handleOpenVideo = (e: React.MouseEvent, url: string) => { e.stopPropagation(); const vid = extractYoutubeId(url); if(vid) setViewingVideoId(vid); else window.open(url, '_blank'); };
  const handleOpponentClick = (e: React.MouseEvent, op: string) => { e.stopPropagation(); if(!isSelectionMode) setSelectedOpponent(op); };
  const toggleSelectionMode = () => { setIsSelectionMode(!isSelectionMode); setSelectedMatchIds(new Set()); };
  const handleSelectMatch = (id: string) => { const n = new Set(selectedMatchIds); if(n.has(id)) n.delete(id); else n.add(id); setSelectedMatchIds(n); };
  
  const handleSelectAllFiltered = () => {
      const allIds = new Set(filteredMatches.map(m => m.id));
      setSelectedMatchIds(allIds);
  };

  const generateTextReport = (ids: Set<string>): string => {
    if (!activeProfile) return '';
    const selected = matches.filter(m => ids.has(m.id)).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return selected.map(m => {
        const team = getTeamById(activeProfile.teams, m.teamId);
        const homeAway = m.isHome ? t.home : t.away;
        const matchType = m.matchType ? (m.matchType === 'league' ? t.typeLeague : (m.matchType === 'cup' || m.matchType === 'tournament') ? (t.typeTournament || t.typeCup || 'Tournament') : t.typeFriendly) : '';
        const locationStr = m.location ? `@ ${m.location}` : '';
        const contextLine = [matchType, homeAway, locationStr].filter(Boolean).join(' | ');
        const isScheduled = m.status === 'scheduled';
        const resultSymbol = isScheduled ? '⏳' : (m.scoreMyTeam > m.scoreOpponent ? '✅' : m.scoreMyTeam < m.scoreOpponent ? '❌' : '🤝');
        
        let statsParts = [];
        if (!isScheduled) {
            if (m.arthurGoals > 0) statsParts.push(`⚽ ${m.arthurGoals} ${t.goals}`);
            if (m.arthurAssists > 0) statsParts.push(`👟 ${m.arthurAssists} ${t.assists}`);
            if (m.rating) statsParts.push(`⭐ ${m.rating}/10`);
            if (m.isMotm) statsParts.push(`🏆 MOTM`);
        }
        const statsLine = statsParts.join('  ');

        let timeParts = [];
        if (m.matchTime) timeParts.push(`⏰ ${t.matchTime}: ${m.matchTime}`);
        if (m.assemblyTime) timeParts.push(`👥 ${t.assemblyTime}: ${m.assemblyTime}`);
        const timeLine = timeParts.join(' | ');

        let extraLine = '';
        const positions = Array.isArray(m.positionPlayed) ? m.positionPlayed.join(', ') : typeof m.positionPlayed === 'string' ? m.positionPlayed : '';
        if (m.pitchType || m.weather || positions) {
            extraLine = [m.pitchType, m.weather, positions].filter(Boolean).join(' • ');
        }

        let block = `📅 ${m.date} (${team.name})\n`;
        if (timeLine) block += `${timeLine}\n`;
        block += `${contextLine}\n`;
        block += `⚔️ VS ${m.opponent} \n`;
        
        if (!isScheduled) {
            block += `${resultSymbol} ${m.scoreMyTeam} - ${m.scoreOpponent}\n`;
            if (statsLine) block += `${statsLine}\n`;
        } else {
            block += `${resultSymbol} ${t.upcomingMatches}\n`;
        }
        
        if (extraLine) block += `📌 ${extraLine}\n`;
        
        if (!isScheduled) {
            if (m.dadComment) block += `💬 ${m.commenterIdentity || 'Dad'}: ${m.dadComment}\n`;
            if (m.kidInterview) block += `🎙️ ${activeProfile.name}: ${m.kidInterview}\n`;
        }

        return block;
    }).join('\n-----------------------\n');
  };

  const handleCopyReport = async () => {
      try {
        const text = generateTextReport(selectedMatchIds);
        await navigator.clipboard.writeText(text);
        showToast(t.reportCopied, 'success');
        setIsSelectionMode(false);
      } catch (err) {
        console.error('Copy failed', err);
        showToast('Copy failed', 'error');
      }
  };

  const handleAddTeammate = (teamId: string, name: string) => {
      if (!activeProfile) return;
      const updatedTeams = activeProfile.teams.map(team => team.id === teamId ? { ...team, roster: [...team.roster, { id: Date.now().toString(), name, number: '' }] } : team);
      const updated = { ...activeProfile, teams: updatedTeams };
      handleUpdateProfileFromManager(updated);
  };

  // Navigate from Analytics drill-down to a specific match in the matches tab
  const handleNavigateToMatch = (matchId: string) => {
    setScrollToMatchId(matchId);
    transitionTab('matches');
  };

  // Quick Log save handler
  const handleQuickLogSave = (matchId: string, update: Partial<MatchData>) => {
    if (!activeProfile) return;
    const existing = matches.find(m => m.id === matchId);
    if (!existing) return;
    const updated = updateMatchInStorage({ ...existing, ...update, id: matchId, profileId: activeProfile.id });
    setMatches(updated);
    showToast(language === 'zh' ? '已儲存 ✓' : 'Saved ✓', 'success');
  };

  // Quick Log create new match handler — returns new match id
  const handleQuickLogCreate = (opponent: string, teamId: string): string => {
    if (!activeProfile) return '';
    const newId = Date.now().toString();
    const today = new Date().toISOString().split('T')[0];
    const updated = addMatchToStorage({
      profileId: activeProfile.id,
      teamId,
      opponent,
      date: today,
      isHome: true,
      matchType: 'friendly', // default for new
      matchFormat: '',
      scoreMyTeam: 0,
      scoreOpponent: 0,
      arthurGoals: 0,
      arthurAssists: 0,
      scorers: [],
      rating: 0,
      isMotm: false,
      dadComment: '',
      kidInterview: '',
      videos: [],
      status: 'completed',
      id: newId,
    });
    setMatches(updated);
    return newId;
  };

  const activeTeam = quickTeamFilter !== 'all' 
      ? getTeamById(activeProfile?.teams || [], quickTeamFilter)
      : activeProfile?.teams?.[0];

  const mainTheme = activeTeam ? getTeamColorStyles(activeTeam.themeColor) : getTeamColorStyles('blue');
  const teamHex = activeTeam ? (COLORS.find((c: {value: string; hex: string}) => c.value === activeTeam.themeColor)?.hex ?? '#3b82f6') : '#3b82f6';

  // ── 賽季分享 title ─────────────────────────────────────────────────────────
  const seasonShareTitle = useMemo(() => {
    if (!activeProfile) return '';
    const teamName = quickTeamFilter !== 'all'
      ? getTeamById(activeProfile.teams, quickTeamFilter)?.name ?? ''
      : activeProfile.teams[0]?.name ?? '';
    const year = new Date().getFullYear();
    return teamName ? `${teamName} · ${year}` : `${year}`;
  }, [activeProfile, quickTeamFilter]);

  if (loading) return null;
  // ── Journal handlers ──────────────────────────────────────────────────────
  const handleSaveJournal = (data: Omit<JournalEntry, 'id' | 'createdAt'>) => {
    setJournals(prev => {
      const next = [...prev, { ...data, id: `j_${Date.now()}`, createdAt: Date.now() }];
      localStorage.setItem('journal_entries', JSON.stringify(next));
      return next;
    });
  };
  const handleDeleteJournal = (id: string) => {
    setJournals(prev => {
      const next = prev.filter(e => e.id !== id);
      localStorage.setItem('journal_entries', JSON.stringify(next));
      return next;
    });
  };

  if (currentView === 'setup') return <ProfileSetup initialProfile={activeProfile} onSave={handleSaveProfile} onCancel={() => setCurrentView('cover')} />;
  if (currentView === 'cover' || !activeProfile) return <><CoverPage profiles={allProfiles} onSelectProfile={handleSelectProfile} onAddProfile={handleAddNewProfile} onImportData={() => { setSyncSubset(null); setIsSyncOpen(true); }} onDeleteProfile={handleDeleteProfile} /><SyncModal isOpen={isSyncOpen} onClose={() => setIsSyncOpen(false)} matches={[]} profile={null} onSyncComplete={handleSyncComplete} syncOnlyMatches={null} /></>;

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden" style={{ background: `linear-gradient(180deg, ${teamHex}12 0%, ${teamHex}06 120px, #f1f5f9 300px)` }}>
      {/* HEADER */}
      <header className={`${mainTheme.headerBg} flex-none z-30 shadow-md transition-colors duration-300 safe-area-top`}>
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 shrink-0 rounded-full bg-white border-2 border-white/30 overflow-hidden shadow-sm relative">
                {activeProfile.avatar ? <img src={activeProfile.avatar} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400"><i className="fas fa-user"></i></div>}
              </div>

              {activeTab === 'matches' && !isSelectionMode ? (
                  <div className="flex-1 min-w-0 transition-all"><div className="relative"><i className="fas fa-search absolute left-2 top-1/2 -translate-y-1/2 text-white/50 text-xs"></i><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t.searchPlaceholder} className="w-full bg-black/10 border border-white/20 rounded-full py-1.5 pl-8 pr-3 text-xs text-white placeholder-white/50 outline-none focus:bg-black/20" /></div></div>
              ) : (
                  <div><h1 className={`text-lg font-bold leading-tight ${mainTheme.headerText}`}>{activeProfile.name}{language === 'zh' ? t.matchDiary : "'s Diary"}</h1></div>
              )}
            </div>
            <div className="flex items-center gap-2 pl-2">
                <button 
                    onClick={toggleLanguage}
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20 text-white text-xs font-bold transition-colors"
                >
                    {language === 'zh' ? 'EN' : '中'}
                </button>

                {activeTab === 'matches' && <button onClick={toggleSelectionMode} className={`${isSelectionMode ? 'bg-white text-slate-800' : 'bg-black/20 text-white hover:bg-black/30'} w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors`}><i className={`fas ${isSelectionMode ? 'fa-check-square' : 'fa-list-ul'} text-sm`}></i></button>}
                {!isSelectionMode && (
                    <button onClick={() => setShowSettings(true)} className="relative bg-black/20 hover:bg-black/30 text-white w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors">
                        <i className="fas fa-cog text-sm"></i>
                        {showBackupAlert && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
                    </button>
                )}
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 overflow-y-auto pb-40 relative w-full min-h-0">
        <div className="max-w-2xl mx-auto min-h-full">
            {activeTab === 'stats' && <AnalyticsDashboard matches={matches} profile={activeProfile} onNavigateToMatch={handleNavigateToMatch} />}
            {activeTab === 'teams' && <TeamManager profile={activeProfile} onUpdateProfile={handleUpdateProfileFromManager} />}
            {activeTab === 'coach' && <CoachReport profile={activeProfile} matches={matches} />}
            
            {activeTab === 'matches' && (
            <div className="animate-fade-in relative">
                {activeProfile.teams.length > 0 && matches.length > 0 && (
                  <div className="sticky top-0 z-20 backdrop-blur-md border-b border-slate-200/50 shadow-sm" style={{ backgroundColor: `${teamHex}15` }}>
                      <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar items-center">
                          <button onClick={() => setQuickTeamFilter('all')} className={`flex-none px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${quickTeamFilter === 'all' ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{t.allTeams}</button>
                          {activeProfile.teams.filter(t => showArchived || !t.isArchived).map(team => {
                             const styles = getTeamColorStyles(team.themeColor);
                             return <button key={team.id} onClick={() => setQuickTeamFilter(team.id)} className={`flex-none px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${quickTeamFilter === team.id ? `${styles.bg} ${styles.activeText} border-transparent shadow-md` : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{team.name}</button>;
                          })}
                          <div className="w-px h-6 bg-slate-300 mx-1"></div>
                          <button onClick={() => setShowArchived(!showArchived)} className={`flex-none w-8 h-8 rounded-full flex items-center justify-center border transition-all ${showArchived ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-white text-slate-400 border-slate-200'}`} title="Toggle Archives"><i className="fas fa-archive text-xs"></i></button>
                          
                          {/* ── 賽季分享按鈕 ── */}
                          {filteredMatches.filter(m => m.status !== 'scheduled').length > 0 && (
                            <button
                              onClick={() => setShowSeasonShare(true)}
                              className="flex-none w-8 h-8 rounded-full flex items-center justify-center border bg-white text-slate-400 border-slate-200 hover:text-yellow-500 hover:border-yellow-300 transition-all"
                              title={t.shareSeason}
                            >
                              <i className="fas fa-trophy text-xs"></i>
                            </button>
                          )}
                      </div>
                      
                      {formGuide && (
                          <div className="px-4 pb-2 pt-0 flex justify-end items-center gap-2 text-[10px] animate-fade-in">
                              <span className="font-bold text-slate-400 uppercase">{t.last5}:</span>
                              <div className="flex gap-1">
                                  {formGuide.map((result, idx) => (
                                      <div 
                                        key={idx} 
                                        className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] shadow-sm
                                            ${result === 'W' ? 'bg-emerald-500' : result === 'L' ? 'bg-rose-500' : 'bg-slate-400'}`}
                                      >
                                          {result === 'W' ? <i className="fas fa-check"></i> : result === 'L' ? <i className="fas fa-times"></i> : <i className="fas fa-minus"></i>}
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
                )}
                <MatchTimeline matches={filteredMatches} profile={activeProfile} isSelectionMode={isSelectionMode} selectedMatchIds={selectedMatchIds} deleteConfirmId={deleteConfirmId} expandedMatchIds={expandedMatchIds} onSelectMatch={handleSelectMatch} onShare={handleShare} onShareTournament={(name, tMatches) => setShareTournament({ name, matches: tMatches })} onEditTournament={(name, tMatches) => setEditingTournament({ name, matches: tMatches })} onEdit={openEditForm} onTrashClick={handleTrashClick} onConfirmDelete={handleConfirmDelete} onCancelDelete={handleCancelDelete} onToggleExpansion={toggleMatchExpansion} onOpenVideo={handleOpenVideo} onOpponentClick={handleOpponentClick} scrollToMatchId={scrollToMatchId} onScrollToMatchDone={() => setScrollToMatchId(null)} isFiltered={!!(searchQuery.trim() || quickTeamFilter !== "all")} />
            </div>
            )}
            
            {activeTab === 'journal' && (
              <JournalSheet
                entries={journals}
                matches={matches.map(m => ({ id: m.id, opponent: m.opponent, date: m.date, tournamentName: m.tournamentName, matchType: m.matchType }))}
                onSave={handleSaveJournal}
                onDelete={handleDeleteJournal}
                teamHex={teamHex}
              />
            )}

            {!isSelectionMode && activeTab === 'matches' && (
                <div className="fixed bottom-24 right-6 sm:right-[calc(50%-336px)] z-40 flex flex-col gap-3 items-end">
                    <button onClick={() => setShowQuickLog(true)}
                        className="bg-amber-400 hover:bg-amber-500 text-white font-black px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-xs transition-transform hover:scale-105 active:scale-95">
                        <i className="fas fa-bolt"></i>{language === 'zh' ? '快速記錄' : 'Quick Log'}
                    </button>
                    <button onClick={() => { setEditingMatch(null); setIsFormOpen(true); }} className={`w-14 h-14 ${mainTheme.button} rounded-full shadow-lg flex items-center justify-center text-xl transition-transform hover:scale-110 active:scale-95`}><i className="fas fa-plus"></i></button>
                </div>
            )}

            {isSelectionMode && (
                <div className="fixed bottom-24 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 flex items-center justify-between animate-fade-in flex-col gap-3">
                    <div className="flex items-center justify-between w-full px-2">
                        <button onClick={toggleSelectionMode} className="w-10 h-10 flex flex-col items-center justify-center text-slate-400 hover:text-slate-600"><i className="fas fa-times text-lg"></i></button>
                        <span className="font-bold text-slate-800">{selectedMatchIds.size} {t.selected}</span>
                        <button onClick={handleSelectAllFiltered} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded">
                            {t.selectAll} ({filteredMatches.length})
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 w-full">
                         <button onClick={handleCopyReport} disabled={selectedMatchIds.size === 0} className="py-3 bg-slate-100 text-slate-600 rounded-xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-slate-200 disabled:opacity-50">
                             <i className="fas fa-copy text-lg"></i><span className="text-[10px]">{t.copyText}</span>
                         </button>
                         <button onClick={() => { setSyncSubset(matches.filter(m => selectedMatchIds.has(m.id))); setIsSyncOpen(true); setIsSelectionMode(false); }} disabled={selectedMatchIds.size === 0} className="py-3 bg-blue-600 text-white rounded-xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-blue-500 disabled:opacity-50">
                             <i className="fas fa-file-export text-lg"></i><span className="text-[10px]">{t.exportData}</span>
                         </button>
                    </div>
                </div>
            )}
        </div>
      </main>

      {/* NAVBAR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-bottom">
        <div className="max-w-2xl mx-auto grid grid-cols-5 h-16">
            <button onClick={() => transitionTab('matches')} className={`flex flex-col items-center justify-center space-y-1 ${activeTab === 'matches' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><i className={`fas fa-list-ul text-lg ${activeTab === 'matches' ? 'scale-110' : ''} transition-transform`}></i><span className="text-[10px] font-bold">{t.navMatches}</span></button>
            <button onClick={() => transitionTab('stats')} className={`flex flex-col items-center justify-center space-y-1 ${activeTab === 'stats' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><i className={`fas fa-chart-pie text-lg ${activeTab === 'stats' ? 'scale-110' : ''} transition-transform`}></i><span className="text-[10px] font-bold">{t.navStats}</span></button>
            <button onClick={() => transitionTab('journal')} className={`flex flex-col items-center justify-center space-y-1 ${activeTab === 'journal' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><i className={`fas fa-book-open text-lg ${activeTab === 'journal' ? 'scale-110' : ''} transition-transform`}></i><span className="text-[10px] font-bold">{language === 'zh' ? '日誌' : 'Journal'}</span></button>
            <button onClick={() => transitionTab('coach')} className={`flex flex-col items-center justify-center space-y-1 ${activeTab === 'coach' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><i className={`fas fa-magic text-lg ${activeTab === 'coach' ? 'scale-110' : ''} transition-transform`}></i><span className="text-[10px] font-bold">{t.navCoach}</span></button>
            <button onClick={() => transitionTab('teams')} className={`flex flex-col items-center justify-center space-y-1 ${activeTab === 'teams' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><i className={`fas fa-users-cog text-lg ${activeTab === 'teams' ? 'scale-110' : ''} transition-transform`}></i><span className="text-[10px] font-bold">{t.manageTeams}</span></button>
        </div>
      </nav>

      {/* ── Settings Drawer ── */}
      {showSettings && (
        <div className="fixed inset-0 z-[80] flex justify-end" onClick={() => setShowSettings(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative z-10 bg-white w-80 h-full shadow-2xl flex flex-col"
            style={{ animation: 'slideInRight 0.25s cubic-bezier(0.32,0.72,0,1)' }}
            onClick={e => e.stopPropagation()}
          >
            <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

            {/* Header */}
            <div className={`${mainTheme.headerBg} p-4 flex items-center justify-between flex-none`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 overflow-hidden flex items-center justify-center">
                  {activeProfile.avatar
                    ? <img src={activeProfile.avatar} className="w-full h-full object-cover" />
                    : <i className="fas fa-user text-white" />}
                </div>
                <div>
                  <p className={`font-black text-sm ${mainTheme.headerText}`}>{activeProfile.name}</p>
                  <p className="text-white/60 text-[10px]">{activeProfile.teams?.length ?? 0} {language === 'zh' ? '支球隊' : 'teams'}</p>
                </div>
              </div>
              <button onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                <i className="fas fa-times text-sm" />
              </button>
            </div>

            {/* Menu items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">

              <p className="text-[10px] font-black text-slate-400 uppercase px-2 mb-1">{language === 'zh' ? '帳戶' : 'Account'}</p>

              <button onClick={() => { setShowSettings(false); handleEditProfile(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-left">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                  <i className="fas fa-user-edit text-blue-600 text-sm" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">{language === 'zh' ? '編輯檔案' : 'Edit Profile'}</p>
                  <p className="text-[11px] text-slate-400">{language === 'zh' ? '修改名稱、頭像' : 'Name, avatar'}</p>
                </div>
                <i className="fas fa-chevron-right text-slate-300 text-xs ml-auto" />
              </button>

              <button onClick={() => { setShowSettings(false); handleSwitchUser(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-left">
                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
                  <i className="fas fa-exchange-alt text-purple-600 text-sm" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">{language === 'zh' ? '切換用戶' : 'Switch User'}</p>
                  <p className="text-[11px] text-slate-400">{language === 'zh' ? '返回選擇頁面' : 'Go to profile select'}</p>
                </div>
                <i className="fas fa-chevron-right text-slate-300 text-xs ml-auto" />
              </button>

              <div className="pt-2">
                <p className="text-[10px] font-black text-slate-400 uppercase px-2 mb-1">{language === 'zh' ? '數據' : 'Data'}</p>
              </div>

              <button onClick={() => { setShowSettings(false); setSyncSubset(null); setIsSyncOpen(true); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-left relative">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <i className="fas fa-sync-alt text-emerald-600 text-sm" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">{language === 'zh' ? '備份 / 匯出 / 匯入' : 'Backup / Export / Import'}</p>
                  <p className="text-[11px] text-slate-400">{language === 'zh' ? '保護你嘅數據' : 'Protect your data'}</p>
                </div>
                {showBackupAlert && <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full" />}
                <i className="fas fa-chevron-right text-slate-300 text-xs ml-auto" />
              </button>

              <div className="pt-2">
                <p className="text-[10px] font-black text-slate-400 uppercase px-2 mb-1">{language === 'zh' ? '支持開發' : 'Support'}</p>
              </div>

              <a href="https://buymeacoffee.com/jcfromhk" target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                  <span className="text-lg">☕</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">{t.buyCoffeeBtn}</p>
                  <p className="text-[11px] text-slate-400">{t.supportDevDesc}</p>
                </div>
                <i className="fas fa-external-link-alt text-slate-300 text-xs ml-auto" />
              </a>

            </div>

            {/* Version */}
            <div className="p-4 border-t border-slate-100 flex-none">
              <p className="text-[10px] text-slate-400 text-center">ProFootball Match Diary</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <MatchForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleFormSubmit} profile={activeProfile} initialData={editingMatch} previousMatches={matches} onAddTeammate={handleAddTeammate} />
      <SyncModal isOpen={isSyncOpen} onClose={() => setIsSyncOpen(false)} matches={matches} profile={activeProfile} onSyncComplete={handleSyncComplete} syncOnlyMatches={syncSubset} />
      <VideoModal isOpen={!!viewingVideoId} videoId={viewingVideoId} onClose={() => setViewingVideoId(null)} />
      
      {/* 單場分享 — mode="match" */}
      {shareMatch && (
        <ShareCard
          mode="match"
          isOpen={!!shareMatch}
          onClose={() => setShareMatch(null)}
          match={shareMatch}
          profile={activeProfile}
        />
      )}

      {/* 賽季分享 — mode="season" */}
      {showSeasonShare && (
        <ShareCard
          mode="season"
          isOpen={showSeasonShare}
          onClose={() => setShowSeasonShare(false)}
          matches={filteredMatches}
          profile={activeProfile}
          title={seasonShareTitle}
        />
      )}

      {/* 杯賽分享 — mode="tournament" */}
      {shareTournament && (
        <ShareCard
          mode="tournament"
          isOpen={!!shareTournament}
          onClose={() => setShareTournament(null)}
          matches={shareTournament.matches}
          profile={activeProfile}
          tournamentName={shareTournament.name}
        />
      )}

      {/* 杯賽編輯 — TournamentEditModal */}
      {editingTournament && (
        <TournamentEditModal
          isOpen={!!editingTournament}
          onClose={() => setEditingTournament(null)}
          tournamentName={editingTournament.name}
          matches={editingTournament.matches}
          onSave={updates => handleTournamentSave(editingTournament.name, editingTournament.matches, updates)}
        />
      )}

      {selectedOpponent && <OpponentStatsModal isOpen={!!selectedOpponent} onClose={() => setSelectedOpponent(null)} opponentName={selectedOpponent} allMatches={matches} profile={activeProfile} />}
      <OnboardingModal isOpen={showOnboarding} onComplete={handleOnboardingComplete} />
      <WhatsNewModal isOpen={showWhatsNew} onClose={handleCloseWhatsNew} />

      {activeProfile && (
        <QuickLogSheet
          isOpen={showQuickLog}
          onClose={() => setShowQuickLog(false)}
          matches={matches}
          profile={activeProfile}
          onSave={handleQuickLogSave}
          onCreateMatch={handleQuickLogCreate}
        />
      )}
    </div>
  );
};

export default App;
