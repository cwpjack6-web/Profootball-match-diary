/**
 * ShareCard.tsx
 * Unified share component for both single match and season recap cards.
 * Replaces ShareModal.tsx and SeasonShareModal.tsx.
 *
 * Usage:
 *   <ShareCard mode="match"  match={match}   profile={profile} isOpen={open} onClose={close} />
 *   <ShareCard mode="season" matches={list}  profile={profile} isOpen={open} onClose={close} title="U8 - 2024" />
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { MatchData, UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getTeamById, getTeamColorStyles, COLORS } from '../utils/colors';
import { compressImage } from '../utils/image';

// ─── Props ────────────────────────────────────────────────────────────────────

type ShareCardMode = 'match' | 'season' | 'tournament';

interface ShareCardProps {
  mode: ShareCardMode;
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  // match mode
  match?: MatchData;
  // season mode
  matches?: MatchData[];
  title?: string;
  // tournament mode
  tournamentName?: string;
}

// ─── Background Presets ───────────────────────────────────────────────────────

const BG_PRESETS = [
  { id: 'pitch',    name: 'Pitch',     css: 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-700 via-green-800 to-green-950', icon: 'fa-futbol',      textDark: false },
  { id: 'ucl',      name: 'Champions', css: 'bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900 via-indigo-950 to-slate-900', icon: 'fa-star',      textDark: false },
  { id: 'modern',   name: 'Modern',    css: 'bg-gradient-to-br from-slate-800 via-gray-900 to-black',                                                        icon: 'fa-layer-group',textDark: false },
  { id: 'fire',     name: 'Heat',      css: 'bg-gradient-to-tr from-orange-600 via-red-800 to-slate-900',                                                    icon: 'fa-fire',       textDark: false },
  { id: 'neon',     name: 'Neon',      css: 'bg-black',                                                                                                      icon: 'fa-bolt',       textDark: false },
  { id: 'retro',    name: 'Retro',     css: 'bg-amber-50',                                                                                                   icon: 'fa-newspaper',  textDark: true  },
  { id: 'magazine', name: 'Magazine',  css: 'bg-white',                                                                                                      icon: 'fa-bookmark',   textDark: true  },
  { id: 'ultra',    name: 'Ultra',     css: 'bg-[conic-gradient(from_225deg_at_60%_40%,_#0f0f1a,_#1a0a2e,_#0a1628,_#0f0f1a)]',                             icon: 'fa-gem',        textDark: false },
  { id: 'dawn',     name: 'Dawn',      css: 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-100 via-orange-50 to-rose-100',       icon: 'fa-sun',        textDark: true  },
];

// ─── Visibility toggle config ─────────────────────────────────────────────────

interface VisibilityOptions {
  // match
  showRating: boolean;
  showPersonalStats: boolean; // goals / assists pills
  showScoresheet: boolean;    // scorer names
  showMotm: boolean;
  showLocation: boolean;
  showResult: boolean;        // WIN/DRAW/LOSS badge
  // season
  showWinRate: boolean;
  showHighlights: boolean;
  showStatsFooter: boolean;
  showAvgRating: boolean;
  // tournament
  showGameScore: boolean;
  showGamePersonalStats: boolean;
  showGameRating: boolean;
  showTournamentSummary: boolean;
}

const DEFAULT_VISIBILITY: VisibilityOptions = {
  showRating: true,
  showPersonalStats: true,
  showScoresheet: true,
  showMotm: true,
  showLocation: true,
  showResult: true,
  showWinRate: true,
  showHighlights: true,
  showStatsFooter: true,
  showAvgRating: true,
  showGameScore: true,
  showGamePersonalStats: true,
  showGameRating: true,
  showTournamentSummary: true,
};

// ─── Types ────────────────────────────────────────────────────────────────────

type LayoutPosition = 'top' | 'center' | 'bottom';
type CardTheme = 'broadcast' | 'gradient' | 'minimal';

// ─── Helper: rating colour ────────────────────────────────────────────────────
const ratingColor = (r: number) => r >= 8 ? '#fbbf24' : r >= 6 ? '#34d399' : '#94a3b8';

// ─── Sub-component: Toggle row ────────────────────────────────────────────────
const ToggleRow: React.FC<{
  label: string;
  icon: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, icon, value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
      value
        ? 'bg-white/20 border-white/30 text-white'
        : 'bg-black/20 border-white/10 text-white/40'
    }`}
  >
    <i className={`fas ${icon} text-[10px]`} />
    {label}
    <i className={`fas ${value ? 'fa-eye' : 'fa-eye-slash'} ml-auto text-[10px] opacity-70`} />
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const ShareCard: React.FC<ShareCardProps> = ({
  mode,
  isOpen,
  onClose,
  profile,
  match,
  matches = [],
  title = '',
  tournamentName = '',
}) => {
  const { t, language } = useLanguage();

  // Background
  const [bgImage, setBgImage]               = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(0);
  const [isProcessingImg, setIsProcessingImg] = useState(false);

  // Generation
  const [isGenerating, setIsGenerating] = useState(false);

  // Match-only layout
  const [layoutMode, setLayoutMode]     = useState<'card' | 'poster'>('card');
  const [textPosition, setTextPosition] = useState<LayoutPosition>('center');
  const [cardTheme, setCardTheme]       = useState<CardTheme>('broadcast');

  // Image pan/zoom (match mode)
  const [imgScale, setImgScale] = useState(1);
  const [imgPos, setImgPos]     = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart]   = useState({ x: 0, y: 0 });

  // Visibility
  const [vis, setVis] = useState<VisibilityOptions>(DEFAULT_VISIBILITY);
  const [showVisPanel, setShowVisPanel] = useState(false);
  const [shareView, setShareView] = useState<'personal' | 'team'>('personal');

  const cardRef      = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Reset image transform when image changes
  useEffect(() => { setImgScale(1); setImgPos({ x: 0, y: 0 }); }, [bgImage]);
  // Revoke Object URL when component unmounts
  useEffect(() => {
    return () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); };
  }, []);

  // ── Season stats (must be before early return — React hook rules) ─────────

  const seasonStats = useMemo(() => {
    const done    = matches.filter(m => m.status !== 'scheduled');
    const total   = done.length;
    const wins    = done.filter(m => m.scoreMyTeam > m.scoreOpponent).length;
    const draws   = done.filter(m => m.scoreMyTeam === m.scoreOpponent).length;
    const losses  = total - wins - draws;
    const goals   = done.reduce((a, m) => a + m.arthurGoals, 0);
    const assists = done.reduce((a, m) => a + m.arthurAssists, 0);
    const avgRating = total > 0
      ? parseFloat((done.reduce((a, m) => a + (m.rating || 0), 0) / total).toFixed(1))
      : 0;
    const winRate   = total > 0 ? Math.round((wins / total) * 100) : 0;
    const motmCount = done.filter(m => m.isMotm).length;
    return { total, wins, draws, losses, goals, assists, avgRating, winRate, motmCount };
  }, [matches]);

  const seasonHighlights = useMemo(() => {
    const rated = matches.filter(m => m.status !== 'scheduled' && (m.rating || 0) > 0);
    if (!rated.length) return null;
    const bestMatch      = rated.reduce((b, m) => (m.rating || 0) > (b.rating || 0) ? m : b, rated[0]);
    const highestScoring = rated.reduce((b, m) => m.arthurGoals > b.arthurGoals ? m : b, rated[0]);
    return { bestMatch, highestScoring };
  }, [matches]);

  const ringCircumference = 2 * Math.PI * 45;
  const ringProgress      = (seasonStats.winRate / 100) * ringCircumference;

  if (!isOpen) return null;

  // ── Derived ───────────────────────────────────────────────────────────────

  const currentPreset = selectedPreset !== null ? BG_PRESETS[selectedPreset] : null;
  const isRetro       = currentPreset?.id === 'retro';
  const isNeon        = currentPreset?.id === 'neon';
  const isMagazine    = currentPreset?.id === 'magazine';
  const isUltra       = currentPreset?.id === 'ultra';
  const isDawn        = currentPreset?.id === 'dawn';
  const isDarkText    = (isRetro || isMagazine || isDawn) && !bgImage;
  const textCls       = isDarkText ? 'text-slate-800' : 'text-white';

  const textShadow = isDarkText
    ? { textShadow: 'none' }
    : cardTheme === 'minimal'
      ? { textShadow: '2px 0 0 #000,-2px 0 0 #000,0 2px 0 #000,0 -2px 0 #000,1px 1px 0 #000,-1px -1px 0 #000,0 4px 8px rgba(0,0,0,0.8)' }
      : { textShadow: '0 2px 4px rgba(0,0,0,0.8)' };

  // Match-specific
  const matchTeam  = match ? getTeamById(profile.teams, match.teamId) : null;
  const theme      = matchTeam ? getTeamColorStyles(matchTeam.themeColor) : null;
  const teamHex    = matchTeam ? (COLORS.find(c => c.value === matchTeam.themeColor)?.hex ?? '#3b82f6') : '#3b82f6';
  const isWin      = match ? match.scoreMyTeam > match.scoreOpponent : false;
  const isLoss     = match ? match.scoreMyTeam < match.scoreOpponent : false;
  const resultLabel = isWin ? 'WIN' : isLoss ? 'LOSS' : 'DRAW';
  const resultColor = isWin ? '#10b981' : isLoss ? '#ef4444' : '#94a3b8';

  const getScorersText = () => {
    if (!match || !matchTeam) return '';
    const list: string[] = [];
    if (match.arthurGoals > 0) list.push(`${profile.name} ×${match.arthurGoals}`);
    match.scorers.forEach(s => {
      const tm = matchTeam.roster.find((r: any) => r.id === s.teammateId);
      if (tm) list.push(`${tm.name} ×${s.count}`);
    });
    return list.join(' · ');
  };

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingImg(true);
    try {
      // Compress to canvas then convert to Blob → Object URL
      // Object URL is just a short pointer string, not full base64 in state
      const base64 = await compressImage(file, 800, 0.72);
      // Convert base64 → Blob → Object URL
      const res = await fetch(base64);
      const blob = await res.blob();
      // Revoke previous object URL to free memory
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setBgImage(url);
      setSelectedPreset(null);
    } catch {
      alert('Could not load image. Please try again.');
    } finally {
      setIsProcessingImg(false);
      e.target.value = '';
    }
  };

  const selectPreset = (i: number) => { setSelectedPreset(i); setBgImage(null); };

  // ── Download ───────────────────────────────────────────────────────────────

  // ── Inline DOM-to-PNG via SVG foreignObject (no external library) ──────────
  const domToPng = async (el: HTMLElement, scale = 2): Promise<string> => {
    const w = el.offsetWidth;
    const h = el.offsetHeight;

    // Collect all stylesheets into one string
    const cssText = Array.from(document.styleSheets).map(sheet => {
      try { return Array.from(sheet.cssRules).map(r => r.cssText).join('\n'); }
      catch { return ''; }
    }).join('\n');

    // Clone node and embed all computed styles inline
    const clone = el.cloneNode(true) as HTMLElement;
    const allEls = [clone, ...Array.from(clone.querySelectorAll('*'))] as HTMLElement[];
    const srcEls = [el,   ...Array.from(el.querySelectorAll('*'))]   as HTMLElement[];
    allEls.forEach((clEl, i) => {
      const computed = window.getComputedStyle(srcEls[i]);
      // Copy every computed style property inline
      Array.from(computed).forEach(prop => {
        try { (clEl as HTMLElement).style.setProperty(prop, computed.getPropertyValue(prop)); }
        catch { /* skip read-only */ }
      });
    });

    // Convert images to data URLs
    const imgs = Array.from(clone.querySelectorAll('img')) as HTMLImageElement[];
    const srcImgs = Array.from(el.querySelectorAll('img')) as HTMLImageElement[];
    await Promise.all(imgs.map(async (img, i) => {
      const src = srcImgs[i]?.src;
      if (!src || src.startsWith('data:')) return;
      try {
        const res = await fetch(src);
        const blob = await res.blob();
        img.src = await new Promise<string>(resolve => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result as string);
          fr.readAsDataURL(blob);
        });
      } catch { /* keep original src */ }
    }));

    const serialized = new XMLSerializer().serializeToString(clone);
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs><style>${cssText.replace(/</g, '&lt;')}</style></defs>
      <foreignObject width="${w}" height="${h}">
        <div xmlns="http://www.w3.org/1999/xhtml">${serialized}</div>
      </foreignObject>
    </svg>`;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = w * scale;
        canvas.height = h * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
    });
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);

    const el = cardRef.current;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    el.style.height = `${h}px`;

    const getFilename = () => {
      const viewSuffix = shareView === 'team' ? '-team' : '-personal';
      return mode === 'match'
        ? `match-report-${match?.date ?? 'card'}${viewSuffix}.png`
        : mode === 'tournament'
          ? `tournament-${(tournamentName || 'cup').replace(/\s+/g, '-').toLowerCase()}${viewSuffix}.png`
          : `season-recap-${(title || 'season').replace(/\s+/g, '-').toLowerCase()}.png`;
    };

    const saveDataUrl = (dataUrl: string) => {
      const link = document.createElement('a');
      link.download = getFilename();
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    try {
      await new Promise(r => setTimeout(r, 300));
      // ── Attempt 1: SVG foreignObject (respects all CSS natively) ──
      try {
        const dataUrl = await domToPng(el, 2);
        saveDataUrl(dataUrl);
      } catch {
        // ── Attempt 2: html2canvas fallback ──
        const canvas = await html2canvas(el, {
          useCORS: true, scale: 2, backgroundColor: null, logging: false,
          width: w, height: h,
        });
        saveDataUrl(canvas.toDataURL('image/png'));
      }
    } catch {
      alert('Could not generate image. Please try again.');
    } finally {
      el.style.height = '';
      setIsGenerating(false);
    }
  };

  // ── Drag (match mode) ──────────────────────────────────────────────────────

  const onPtrDown = (e: React.PointerEvent) => {
    if (!bgImage) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - imgPos.x, y: e.clientY - imgPos.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPtrMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setImgPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const onPtrUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // ── Visibility helper ──────────────────────────────────────────────────────

  const setV = (key: keyof VisibilityOptions) => (v: boolean) =>
    setVis(prev => ({ ...prev, [key]: v }));

  // ── Background pattern ─────────────────────────────────────────────────────

  const renderBgPattern = () => {
    if (!currentPreset) return null;
    switch (currentPreset.id) {
      case 'pitch':
        return (
          <div className="absolute inset-0 pointer-events-none opacity-10 z-0">
            <div className="absolute top-4 left-4 right-4 bottom-4 border-2 border-white rounded-lg" />
            <div className="absolute top-1/2 left-1/2 w-48 h-48 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute top-1/2 left-4 right-4 h-px bg-white -translate-y-1/2" />
          </div>
        );
      case 'ucl':
        return (
          <div className="absolute inset-0 pointer-events-none opacity-10 overflow-hidden">
            <i className="fas fa-star absolute -top-10 -right-10 text-[12rem] text-white rotate-12" />
            <i className="fas fa-star absolute top-1/3 -left-16 text-[10rem] text-white -rotate-12" />
          </div>
        );
      case 'modern':
        return (
          <div className="absolute inset-0 pointer-events-none opacity-5 overflow-hidden">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          </div>
        );
      case 'neon':
        return (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/3 left-1/2 w-64 h-64 rounded-full blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2"
              style={{ background: 'radial-gradient(circle, rgba(0,255,200,0.6) 0%, transparent 70%)' }} />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-2xl opacity-15"
              style={{ background: 'radial-gradient(circle, rgba(180,0,255,0.6) 0%, transparent 70%)' }} />
          </div>
        );
      case 'retro':
        return (
          <div className="absolute inset-0 pointer-events-none opacity-30"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 24px,rgba(0,0,0,0.06) 24px,rgba(0,0,0,0.06) 25px)' }} />
        );
      case 'magazine':
        return (
          <>
            {/* Bold diagonal stripe top-left */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-8 -left-8 w-72 h-72 rotate-45 opacity-5"
                style={{ background: 'repeating-linear-gradient(0deg,#000 0px,#000 3px,transparent 3px,transparent 18px)' }} />
              {/* Thick accent bar top */}
              <div className="absolute top-0 left-0 right-0 h-2" style={{ background: 'linear-gradient(90deg,#ef4444,#f97316,#eab308)' }} />
              {/* Thin rule bottom */}
              <div className="absolute bottom-12 left-6 right-6 h-px bg-black opacity-10" />
              {/* Large faded number watermark */}
              <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-[220px] font-black leading-none select-none pointer-events-none opacity-[0.04] text-black tracking-tighter">1</div>
            </div>
          </>
        );
      case 'ultra':
        return (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Purple aurora blobs */}
            <div className="absolute top-0 left-1/4 w-80 h-80 rounded-full blur-3xl opacity-30"
              style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-20"
              style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }} />
            <div className="absolute top-1/2 left-1/2 w-48 h-48 rounded-full blur-2xl opacity-15 -translate-x-1/2 -translate-y-1/2"
              style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }} />
            {/* Fine grid overlay */}
            <div className="absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
            {/* Glowing accent line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 opacity-60"
              style={{ background: 'linear-gradient(90deg,transparent,#7c3aed,#ec4899,transparent)', boxShadow: '0 0 20px 2px rgba(124,58,237,0.5)' }} />
          </div>
        );
      case 'dawn':
        return (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Soft sunrise rays */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] opacity-20"
              style={{ background: 'conic-gradient(from 260deg at 50% 100%, transparent 0deg, rgba(251,146,60,0.6) 10deg, transparent 20deg, transparent 30deg, rgba(234,179,8,0.4) 40deg, transparent 50deg, transparent 340deg, rgba(251,146,60,0.6) 350deg, transparent 360deg)' }} />
            {/* Warm glow bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-48 opacity-30"
              style={{ background: 'linear-gradient(to top, rgba(251,146,60,0.3), transparent)' }} />
            {/* Subtle horizontal lines */}
            <div className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(180,80,0,0.8) 40px,rgba(180,80,0,0.8) 41px)' }} />
            {/* Golden arc */}
            <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full border-2 opacity-10" style={{ borderColor: '#f97316' }} />
          </div>
        );
      default: return null;
    }
  };

  // ── Shared background layer ────────────────────────────────────────────────

  const renderBackground = () => (
    <>
      {bgImage ? (
          <div className="absolute inset-0 overflow-hidden cursor-move"
            onPointerDown={onPtrDown} onPointerMove={onPtrMove}
            onPointerUp={onPtrUp} onPointerLeave={onPtrUp}
            style={{ touchAction: 'none' }}>
            <img src={bgImage} alt=""
              className="absolute left-1/2 top-1/2 max-w-none min-w-full min-h-full pointer-events-none will-change-transform"
              style={{ transform: `translate(-50%,-50%) translate(${imgPos.x}px,${imgPos.y}px) scale(${imgScale})` }} />
          </div>
      ) : currentPreset ? (
        <div className={`absolute inset-0 ${currentPreset.css}`}>{renderBgPattern()}</div>
      ) : (
        <div className={`absolute inset-0 ${theme ? `bg-gradient-to-br ${theme.gradient}` : 'bg-gradient-to-br from-blue-900 to-slate-900'} opacity-50`} />
      )}

      {/* Neon glow border */}
      {isNeon && !bgImage && (
        <div className="absolute inset-0 pointer-events-none z-10 rounded-xl"
          style={{ boxShadow: 'inset 0 0 30px rgba(0,255,200,0.12),inset 0 0 2px rgba(0,255,200,0.5)', border: '1px solid rgba(0,255,200,0.3)' }} />
      )}
      {/* Ultra glow border */}
      {isUltra && !bgImage && (
        <div className="absolute inset-0 pointer-events-none z-10 rounded-xl"
          style={{ boxShadow: 'inset 0 0 40px rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)' }} />
      )}

      {/* Subtle overlay for photos */}
      {bgImage && cardTheme === 'gradient' && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
      )}
      {bgImage && cardTheme === 'broadcast' && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
      )}
      {bgImage && cardTheme === 'minimal' && (
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      )}
    </>
  );

  // ── MATCH CARD content ─────────────────────────────────────────────────────

  const renderMatchCard = () => {
    if (!match || !matchTeam) return null;

    const contentPos = textPosition === 'top'
      ? 'justify-start'
      : textPosition === 'center'
        ? 'justify-center'
        : 'justify-end';

    const cardStyle = cardTheme === 'broadcast'
      ? `${isDarkText ? 'bg-amber-100/80 border-amber-200' : 'bg-black/55 border-white/10'} border-t-2 w-full px-5 py-6`
      : cardTheme === 'gradient'
        ? 'pt-12 p-5'
        : 'p-5';

    return (
      <>
        {/* Gradient fade overlay */}
        {cardTheme === 'gradient' && (
          <div className={`absolute left-0 right-0 pointer-events-none z-[1] ${
            textPosition === 'top' ? 'top-0 h-1/2 bg-gradient-to-b' : 'bottom-0 h-2/3 bg-gradient-to-t'
          } from-black via-black/80 to-transparent`} />
        )}

        {/* Retro header stamp */}
        {isRetro && !bgImage && (
          <div className="absolute top-4 left-0 right-0 flex flex-col items-center pointer-events-none z-10">
            <div className="border-t-2 border-b-2 border-slate-800 px-6 py-0.5 text-slate-800 text-[9px] font-black uppercase tracking-[0.3em]">
              Match Report
            </div>
          </div>
        )}

        <div className={`relative z-10 w-full h-full flex flex-col pointer-events-none ${contentPos}`}>
          <div data-match-panel="true" className={`w-full ${cardStyle} ${textCls}`}>

            {/* Team name + badges */}
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[9px] font-bold tracking-widest uppercase opacity-70 block mb-0.5" style={textShadow}>
                  {t.matchResult}
                </span>
                <div className="flex items-center gap-2">
                  {cardTheme === 'broadcast' && (
                    <div className="h-5 w-1 rounded-full" style={{ backgroundColor: teamHex }} />
                  )}
                  <h2 className="text-base font-black italic uppercase leading-none flex items-center gap-2" style={textShadow}>
                    {matchTeam.name}
                    {matchTeam.logo && <img src={matchTeam.logo} className="h-7 w-7 object-contain drop-shadow-md" alt="" />}
                  </h2>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {vis.showResult && (
                  <div className="px-2 rounded font-black text-[10px] border" style={{ color: resultColor, borderColor: resultColor, backgroundColor: `${resultColor}22`, lineHeight: '20px', display: 'inline-block', whiteSpace: 'nowrap', marginBottom: '3px' }}>
                    {resultLabel}
                  </div>
                )}
                {vis.showMotm && match.isMotm && (
                  <div className="bg-yellow-500 text-black px-2 rounded-full font-black text-[9px] shadow" style={{ lineHeight: '20px', display: 'inline-block', whiteSpace: 'nowrap' }}>
                    <i className="fas fa-trophy" style={{ marginRight: '3px' }} />MOTM
                  </div>
                )}
              </div>
            </div>

            {/* Score row */}
            <div className="flex items-center justify-center gap-2 w-full mb-2">
              <div className="text-center flex-1">
                <span className="text-4xl font-black" style={textShadow}>{match.scoreMyTeam}</span>
                <span className="block text-[9px] font-bold uppercase mt-0.5 opacity-80" style={textShadow}>{t.us}</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.4)', display: 'inline-block', verticalAlign: 'middle' }} />
                {vis.showRating && match.rating > 0 && (
                  <div className="px-2 rounded-full border" style={{ borderColor: ratingColor(match.rating), backgroundColor: `${ratingColor(match.rating)}22`, lineHeight: '22px', display: 'inline-block', whiteSpace: 'nowrap' }}>
                    <i className="fas fa-star text-[8px]" style={{ color: ratingColor(match.rating), marginRight: '2px' }} /><span className="text-[11px] font-black" style={{ color: ratingColor(match.rating), ...textShadow }}>{match.rating}</span>
                  </div>
                )}
              </div>
              <div className="text-center flex-1">
                <span className="text-4xl font-black opacity-90" style={textShadow}>{match.scoreOpponent}</span>
                <span className="block text-[9px] font-bold uppercase mt-0.5 opacity-70" style={textShadow}>{match.opponent}</span>
              </div>
            </div>

            {/* Result bar */}
            {cardTheme === 'broadcast' && vis.showResult && (
              <div className="w-full h-0.5 rounded-full bg-white/10 mb-3 overflow-hidden flex justify-center">
                <div className="h-full w-20 rounded-full" style={{ backgroundColor: resultColor }} />
              </div>
            )}

            {/* Personal stats pills */}
            {vis.showPersonalStats && (match.arthurGoals > 0 || match.arthurAssists > 0) && (
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                {match.arthurGoals > 0 && (
                  <div className="bg-emerald-500/20 border border-emerald-400/40 px-2 rounded-full" style={{ lineHeight: '22px', display: 'inline-block', whiteSpace: 'nowrap', marginRight: '6px' }}>
                    <i className="fas fa-futbol text-emerald-400 text-[9px]" style={{ marginRight: '2px' }} /><span className="text-[10px] font-black text-emerald-400">{match.arthurGoals}G</span>
                  </div>
                )}
                {match.arthurAssists > 0 && (
                  <div className="bg-blue-500/20 border border-blue-400/40 px-2 rounded-full" style={{ lineHeight: '22px', display: 'inline-block', whiteSpace: 'nowrap' }}>
                    <i className="fas fa-hands-helping text-blue-400 text-[9px]" style={{ marginRight: '2px' }} /><span className="text-[10px] font-black text-blue-400">{match.arthurAssists}A</span>
                  </div>
                )}
              </div>
            )}

            {/* Scoresheet */}
            {vis.showScoresheet && getScorersText() && (
              <p style={{ textAlign: 'center', fontSize: '9px', fontWeight: 'bold', opacity: 0.8, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...textShadow }}>
                <i className="fas fa-futbol text-emerald-400" style={{ marginRight: '4px' }} />{getScorersText()}
              </p>
            )}

            {/* Date + location */}
            <div style={{ textAlign: 'center', fontSize: '9px', fontWeight: 'bold', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...textShadow }}>
              {match.date}{vis.showLocation && match.location && <span> · {match.location}</span>}
            </div>
          </div>
        </div>
      </>
    );
  };

  // ── SEASON CARD content ────────────────────────────────────────────────────

  const renderSeasonCard = () => (
    <>
      {/* Header */}
      <div className="relative z-10 p-5 pointer-events-none">
        {isRetro && !bgImage ? (
          <>
            <div className="border-t-2 border-b-2 border-slate-800 text-center py-0.5 mb-3">
              <span className="text-slate-800 text-[9px] font-black uppercase tracking-[0.3em]">Season Report</span>
            </div>
            <h2 className="text-2xl font-black uppercase leading-none text-slate-800 text-center">{title}</h2>
            <div className="text-sm font-bold opacity-70 mt-1 text-center text-slate-700">{profile.name}</div>
          </>
        ) : (
          <>
            <div className="inline-block border border-white/30 px-3 py-0.5 rounded text-[9px] font-black tracking-widest uppercase mb-2 backdrop-blur-sm text-white">
              {t.seasonRecap}
            </div>
            <h2 className="text-2xl font-black italic uppercase leading-none drop-shadow-md text-white">{title}</h2>
            {shareView === 'personal' && <div className="text-sm font-bold opacity-80 mt-1 text-white">{profile.name}</div>}
          </>
        )}
      </div>

      {/* Win rate ring */}
      {vis.showWinRate && (
        <div className="relative z-10 flex flex-col items-center justify-center py-2 pointer-events-none">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="#fbbf24" strokeWidth="8"
                strokeDasharray={`${ringProgress} ${ringCircumference}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-black drop-shadow-lg ${textCls}`}>{seasonStats.winRate}%</span>
              <span className={`text-[9px] uppercase font-bold tracking-wide opacity-80 ${textCls}`}>{t.winRate}</span>
            </div>
          </div>
          <div className={`flex gap-4 mt-1 text-[10px] font-black uppercase tracking-wide ${textCls}`}>
            <span className="text-emerald-400">{seasonStats.wins}W</span>
            <span className="opacity-50">{seasonStats.draws}D</span>
            <span className="text-red-400">{seasonStats.losses}L</span>
          </div>
        </div>
      )}

      {/* Highlights */}
      {vis.showHighlights && seasonHighlights && (
        <div className="relative z-10 mx-4 mb-2 rounded-lg overflow-hidden pointer-events-none">
          <div className={`px-3 py-2 ${isDarkText ? 'bg-amber-200/60 border border-amber-300' : 'bg-white/10 backdrop-blur-sm border border-white/10'}`}>
            <div className={`text-[8px] font-black uppercase tracking-widest mb-1.5 ${isDarkText ? 'text-slate-600' : 'text-white/60'}`}>
              Season Highlights
            </div>
            <div className="flex flex-col gap-1">
              {seasonHighlights.bestMatch && (
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold ${isDarkText ? 'text-slate-600' : 'text-white/70'}`}>
                    <i className="fas fa-star mr-1" style={{ color: ratingColor(seasonHighlights.bestMatch.rating) }} />Best Rating
                  </span>
                  <span className={`text-[10px] font-black ${textCls}`}>
                    {seasonHighlights.bestMatch.rating} vs {seasonHighlights.bestMatch.opponent}
                  </span>
                </div>
              )}
              {seasonHighlights.highestScoring.arthurGoals > 0 && (
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold ${isDarkText ? 'text-slate-600' : 'text-white/70'}`}>
                    <i className="fas fa-futbol mr-1 text-emerald-400" />Top Scoring
                  </span>
                  <span className={`text-[10px] font-black ${textCls}`}>
                    {seasonHighlights.highestScoring.arthurGoals}G vs {seasonHighlights.highestScoring.opponent}
                  </span>
                </div>
              )}
              {seasonStats.motmCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold ${isDarkText ? 'text-slate-600' : 'text-white/70'}`}>
                    <i className="fas fa-trophy mr-1 text-yellow-400" />MOTM
                  </span>
                  <span className={`text-[10px] font-black ${textCls}`}>×{seasonStats.motmCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats footer */}
      {vis.showStatsFooter && (
        <div className={`relative z-10 mt-auto grid divide-x ${
          vis.showAvgRating ? 'grid-cols-5' : 'grid-cols-4'
        } ${isDarkText
          ? 'bg-amber-200/60 border-t border-amber-300 divide-amber-300'
          : 'bg-white/10 backdrop-blur-md border-t border-white/10 divide-white/10'
        } pointer-events-none`}>
          {[
            { value: seasonStats.total,   label: t.played,  color: '' },
            { value: seasonStats.wins,    label: t.won,     color: 'text-emerald-400' },
            { value: seasonStats.goals,   label: t.goals,   color: 'text-blue-400' },
            { value: seasonStats.assists, label: t.assists, color: 'text-purple-400' },
            ...(vis.showAvgRating ? [{ value: seasonStats.avgRating > 0 ? seasonStats.avgRating : '–', label: 'Avg ★', color: 'text-yellow-400' }] : []),
          ].map(({ value, label, color }) => (
            <div key={label} className="py-3 flex flex-col items-center">
              <span className={`text-base font-black ${color || textCls}`}>{value}</span>
              <span className={`text-[7px] uppercase font-bold ${isDarkText ? 'text-slate-500' : 'opacity-60 text-white'}`}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );


  // ── TOURNAMENT CARD content ───────────────────────────────────────────────

  const renderTournamentCard = () => {
    const done = matches.filter(m => m.status !== 'scheduled');
    let tw = 0, td = 0, tl = 0, tGoals = 0, tAssists = 0, tTeamGoals = 0, tTeamConceded = 0;
    done.forEach(m => {
      if (m.scoreMyTeam > m.scoreOpponent) tw++;
      else if (m.scoreMyTeam < m.scoreOpponent) tl++;
      else td++;
      tGoals += m.arthurGoals;
      tAssists += m.arthurAssists;
      tTeamGoals += m.scoreMyTeam;
      tTeamConceded += m.scoreOpponent;
    });
    const firstMatch = done[0];

    const getPitchLabel = (type?: string) => {
      switch (type) {
        case 'turf': return t.pitchTurf || 'Turf';
        case 'artificial': return t.pitchArtificial || 'Astroturf';
        case 'hard': return t.pitchHard || 'Hard Court';
        case 'indoor': return t.pitchIndoor || 'Indoor';
        default: return type || '';
      }
    };
    const getWeatherIcon = (type?: string) => {
      switch (type) {
        case 'sunny': return 'fa-sun'; case 'rain': return 'fa-cloud-rain';
        case 'cloudy': return 'fa-cloud'; case 'night': return 'fa-moon';
        case 'hot': return 'fa-temperature-high'; case 'windy': return 'fa-wind';
        default: return 'fa-cloud';
      }
    };

    return (
      <div className="relative z-10 h-full flex flex-col justify-center gap-3 pointer-events-none">
        {/* Header */}
        <div className="px-5">
          {isRetro && !bgImage ? (
            <>
              <div className="border-t-2 border-b-2 border-slate-800 text-center py-0.5 mb-3">
                <span className="text-slate-800 text-[9px] font-black uppercase tracking-[0.3em]">Tournament Report</span>
              </div>
              <h2 className="text-2xl font-black uppercase leading-none text-slate-800 text-center">{tournamentName}</h2>
              {shareView === 'personal' && <div className="text-sm font-bold opacity-70 mt-1 text-center text-slate-700">{profile.name}</div>}
            </>
          ) : (
            <>
              <div className="border border-white/30 px-3 rounded text-[9px] font-black tracking-widest uppercase mb-2 text-white" style={{ display: 'inline-block', lineHeight: '20px', whiteSpace: 'nowrap' }}>
                <i className="fas fa-trophy text-amber-400" style={{ marginRight: '4px' }} />{language === 'zh' ? '杯賽報告' : 'Tournament Report'}
              </div>
              <h2 className="text-2xl font-black italic uppercase leading-none drop-shadow-md text-white">{tournamentName}</h2>
              <div className="text-sm font-bold opacity-80 mt-1 text-white">{profile.name}</div>
            </>
          )}

          {/* Meta: pitch, weather, time, date, location — two tidy rows */}
          {firstMatch && (
            <div className="mt-2" style={{ fontSize: '9px', lineHeight: '1.4' }}>
              {/* Row 1: pitch + weather + time */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', marginBottom: '4px', overflow: 'hidden' }}>
                {firstMatch.pitchType && (
                  <span className={`font-bold px-2 rounded ${isDarkText ? 'bg-amber-200/60 text-slate-600' : 'bg-white/10 text-white/70'}`} style={{ lineHeight: '18px', display: 'inline-block', whiteSpace: 'nowrap' }}>
                    <i className="fas fa-layer-group" /> {getPitchLabel(firstMatch.pitchType)}
                  </span>
                )}
                {firstMatch.weather && (
                  <span className={`font-bold px-2 rounded ${isDarkText ? 'bg-amber-200/60 text-slate-600' : 'bg-white/10 text-white/70'}`} style={{ lineHeight: '18px', display: 'inline-block' }}>
                    <i className={`fas ${getWeatherIcon(firstMatch.weather)}`} />
                  </span>
                )}
                {(firstMatch.tournamentStartTime || firstMatch.matchTime) && (
                  <span className={`font-bold px-2 rounded ${isDarkText ? 'bg-amber-200/60 text-blue-600' : 'bg-white/10 text-blue-300'}`} style={{ lineHeight: '18px', display: 'inline-block', whiteSpace: 'nowrap' }}>
                    <i className="far fa-clock" /> {firstMatch.tournamentStartTime || firstMatch.matchTime}{firstMatch.tournamentEndTime ? ` → ${firstMatch.tournamentEndTime}` : ''}
                  </span>
                )}
                {firstMatch.date && (
                  <span className={`font-bold px-2 rounded ${isDarkText ? 'bg-amber-200/60 text-slate-600' : 'bg-white/10 text-white/70'}`} style={{ lineHeight: '18px', display: 'inline-block', whiteSpace: 'nowrap' }}>
                    <i className="far fa-calendar" /> {firstMatch.date}
                  </span>
                )}
              </div>
              {/* Row 2: location (full width) */}
              {firstMatch.location && (
                <div style={{ overflow: 'hidden' }}>
                  <span className={`font-bold px-2 rounded ${isDarkText ? 'bg-amber-200/60 text-emerald-700' : 'bg-white/10 text-emerald-300'}`} style={{ lineHeight: '18px', display: 'inline-block', whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <i className="fas fa-map-marker-alt" /> {firstMatch.location}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Game list */}
        <div className="mx-4">
          <div className={`rounded-lg overflow-hidden ${isDarkText ? 'bg-amber-100/60 border border-amber-200' : 'bg-white/10 backdrop-blur-sm border border-white/10'}`}>
            {done.map((m, idx) => {
              const isW = m.scoreMyTeam > m.scoreOpponent;
              const isL = m.scoreMyTeam < m.scoreOpponent;
              const resultColor = isW ? 'text-emerald-400' : isL ? 'text-rose-400' : 'text-slate-400';
              const resultBg = isW
                ? (isDarkText ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-300')
                : isL
                  ? (isDarkText ? 'bg-rose-100 text-rose-700' : 'bg-rose-500/20 text-rose-300')
                  : (isDarkText ? 'bg-slate-100 text-slate-600' : 'bg-white/10 text-white/60');

              return (
                <div key={m.id} style={{ display: 'table', width: '100%', borderCollapse: 'collapse' }} className={`px-3 ${idx > 0 ? (isDarkText ? 'border-t border-amber-200' : 'border-t border-white/10') : ''}`}>
                  <div style={{ display: 'table-row' }}>
                  {/* Game number */}
                  <span style={{ display: 'table-cell', verticalAlign: 'middle', width: '32px', padding: '6px 0' }} className={`text-[9px] font-black ${isDarkText ? 'text-slate-400' : 'text-white/40'}`}>
                    G{idx + 1}
                  </span>
                  {/* Result badge */}
                  <span style={{ display: 'table-cell', verticalAlign: 'middle', width: '24px', padding: '6px 2px' }}>
                    <span className={`text-[9px] font-black px-1.5 rounded ${resultBg}`} style={{ lineHeight: '18px', display: 'inline-block' }}>
                      {isW ? 'W' : isL ? 'L' : 'D'}
                    </span>
                  </span>
                  {/* Opponent */}
                  <span style={{ display: 'table-cell', verticalAlign: 'middle', padding: '6px 4px' }} className={`text-[10px] font-bold leading-tight ${isDarkText ? 'text-slate-700' : 'text-white/90'}`}>
                    {m.opponent}
                  </span>
                  {/* Score */}
                  {vis.showGameScore && (
                    <span style={{ display: 'table-cell', verticalAlign: 'middle', width: '1px', whiteSpace: 'nowrap', paddingLeft: '4px' }} className={`text-[11px] font-black font-mono ${isDarkText ? 'text-slate-800' : 'text-white'}`}>
                      {m.scoreMyTeam}–{m.scoreOpponent}
                    </span>
                  )}
                  {/* Personal stats */}
                  {vis.showGamePersonalStats && (m.arthurGoals > 0 || m.arthurAssists > 0) && (
                    <span style={{ display: 'table-cell', verticalAlign: 'middle', width: '1px', whiteSpace: 'nowrap', paddingLeft: '4px' }} className={`text-[9px] font-bold ${isDarkText ? 'text-slate-500' : 'text-white/50'}`}>
                      {m.arthurGoals > 0 && `⚽${m.arthurGoals}`}{m.arthurAssists > 0 && ` 👟${m.arthurAssists}`}
                    </span>
                  )}
                  {/* Rating */}
                  {vis.showGameRating && m.rating > 0 && (
                    <span style={{ display: 'table-cell', verticalAlign: 'middle', width: '1px', whiteSpace: 'nowrap', paddingLeft: '4px' }} className="text-[9px] font-black text-amber-400">★{m.rating}</span>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary footer */}
        {vis.showTournamentSummary && (
          <div className={`grid ${shareView === 'personal' ? 'grid-cols-5' : 'grid-cols-4'} divide-x ${
            isDarkText
              ? 'bg-amber-200/60 border-t border-amber-300 divide-amber-300'
              : 'bg-black/40 border-t border-white/10 divide-white/10'
          } pointer-events-none`}>
            {(shareView === 'personal' ? [
              { value: done.length,  label: language === 'zh' ? '場數' : 'Games',   color: '' },
              { value: `${tw}W ${td}D ${tl}L`, label: language === 'zh' ? '戰績' : 'Record', color: '' },
              { value: tGoals,       label: language === 'zh' ? '入球' : 'Goals',   color: 'text-emerald-400' },
              { value: tAssists,     label: language === 'zh' ? '助攻' : 'Assists', color: 'text-purple-400' },
              { value: done.filter(m => m.isMotm).length > 0 ? `×${done.filter(m => m.isMotm).length}` : '–',
                label: 'MOTM', color: 'text-amber-400' },
            ] : [
              { value: done.length,       label: language === 'zh' ? '場數' : 'Games',    color: '' },
              { value: `${tw}W ${td}D ${tl}L`, label: language === 'zh' ? '戰績' : 'Record', color: '' },
              { value: tTeamGoals,        label: language === 'zh' ? '入球' : 'Goals',    color: 'text-emerald-400' },
              { value: tTeamConceded,     label: language === 'zh' ? '失球' : 'Conceded', color: 'text-rose-400' },
            ]).map(({ value, label, color }) => (
              <div key={label} className={`flex flex-col items-center justify-center ${shareView === 'team' ? 'py-4' : 'py-2.5'}`}>
                <span className={`font-black whitespace-nowrap ${shareView === 'team' ? 'text-lg' : 'text-xs'} ${color || textCls}`}>{value}</span>
                <span className={`text-[7px] uppercase font-bold mt-0.5 ${isDarkText ? 'text-slate-500' : 'opacity-60 text-white'}`}>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Visibility panel config ────────────────────────────────────────────────

  const matchVisToggles: Array<{ key: keyof VisibilityOptions; label: string; icon: string }> = [
    { key: 'showResult',       label: 'WIN/LOSS',      icon: 'fa-medal' },
    { key: 'showRating',       label: t.rating,        icon: 'fa-star' },
    { key: 'showMotm',         label: 'MOTM',          icon: 'fa-trophy' },
    { key: 'showPersonalStats',label: 'Goals/Assists',  icon: 'fa-futbol' },
    { key: 'showScoresheet',   label: 'Scoresheet',    icon: 'fa-list' },
    { key: 'showLocation',     label: t.location,      icon: 'fa-map-marker-alt' },
  ];

  const seasonVisToggles: Array<{ key: keyof VisibilityOptions; label: string; icon: string }> = [
    { key: 'showWinRate',    label: 'Win Rate',    icon: 'fa-chart-pie' },
    { key: 'showHighlights', label: 'Highlights',  icon: 'fa-bolt' },
    { key: 'showStatsFooter',label: 'Stats Bar',   icon: 'fa-table' },
    { key: 'showAvgRating',  label: 'Avg Rating',  icon: 'fa-star' },
  ];

  const tournamentVisToggles: Array<{ key: keyof VisibilityOptions; label: string; icon: string }> = [
    { key: 'showGameScore',          label: language === 'zh' ? '比數' : 'Scores',    icon: 'fa-futbol' },
    { key: 'showGamePersonalStats',  label: language === 'zh' ? '入球助攻' : 'Goals/Ast', icon: 'fa-shoe-prints' },
    { key: 'showGameRating',         label: language === 'zh' ? '評分' : 'Rating',    icon: 'fa-star' },
    { key: 'showTournamentSummary',  label: language === 'zh' ? '總結欄' : 'Summary',  icon: 'fa-table' },
  ];

  const visToggles = mode === 'match' ? matchVisToggles : mode === 'tournament' ? tournamentVisToggles : seasonVisToggles;

  // ── Render ─────────────────────────────────────────────────────────────────

  const aspectRatio = mode === 'season' || mode === 'tournament'
    ? 'aspect-[4/5]'
    : layoutMode === 'poster' ? 'aspect-[9/16]' : 'aspect-[4/5]';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col gap-3 my-auto">

        {/* ── Header ── */}
        <div className="flex justify-between items-center text-white">
          <h3 className="font-bold text-lg">
            <i className={`fas ${mode === 'match' ? 'fa-share-alt' : 'fa-trophy'} mr-2`} />
            {mode === 'match' ? t.shareMatch : mode === 'tournament' ? (language === 'zh' ? '分享杯賽' : 'Share Tournament') : t.shareSeason}
          </h3>
          <div className="flex items-center gap-2">
            {/* Visibility toggle button */}
            <button
              onClick={() => setShowVisPanel(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                showVisPanel ? 'bg-white text-slate-900 border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              <i className="fas fa-sliders-h text-[10px]" />
              顯示
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
              <i className="fas fa-times" />
            </button>
          </div>
        </div>

        {/* ── Personal / Team toggle ── */}
        {(mode === 'match' || mode === 'tournament') && (
          <div className="flex bg-white/10 rounded-xl p-1 gap-1">
            <button onClick={() => { setShareView('personal'); setVis(v => ({ ...v, showPersonalStats: true, showMotm: true, showRating: true })); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black transition-all ${shareView === 'personal' ? 'bg-white text-slate-900 shadow' : 'text-white/60 hover:text-white'}`}>
              <i className="fas fa-user text-[10px]" />{language === 'zh' ? '個人版' : 'Personal'}
            </button>
            <button onClick={() => { setShareView('team'); setVis(v => ({ ...v, showPersonalStats: false, showMotm: false, showRating: false })); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black transition-all ${shareView === 'team' ? 'bg-white text-slate-900 shadow' : 'text-white/60 hover:text-white'}`}>
              <i className="fas fa-users text-[10px]" />{language === 'zh' ? '球隊版' : 'Team'}
            </button>
          </div>
        )}

        {/* ── Visibility Panel ── */}
        {showVisPanel && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 animate-fade-in">
            <p className="text-white/50 text-[9px] uppercase font-black tracking-widest mb-2">選擇顯示資料</p>
            <div className="flex flex-wrap gap-2">
              {visToggles.map(({ key, label, icon }) => (
                <ToggleRow key={key} label={label} icon={icon} value={vis[key]} onChange={setV(key)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Match-only layout/theme controls ── */}
        {mode === 'match' && (
          <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm grid grid-cols-2 gap-2">
            <div className="flex bg-black/20 rounded-lg p-1 gap-1">
              {(['top', 'center', 'bottom'] as LayoutPosition[]).map((pos, i) => (
                <button key={pos} onClick={() => setTextPosition(pos)}
                  className={`flex-1 rounded py-1 text-[10px] font-bold transition-all ${textPosition === pos ? 'bg-white text-black shadow' : 'text-white/60 hover:text-white'}`}>
                  <i className={`fas ${i === 0 ? 'fa-arrow-up' : i === 1 ? 'fa-arrows-alt-v' : 'fa-arrow-down'}`} />
                </button>
              ))}
            </div>
            <div className="flex bg-black/20 rounded-lg p-1 gap-1">
              {(['broadcast', 'gradient', 'minimal'] as CardTheme[]).map(th => (
                <button key={th} onClick={() => setCardTheme(th)}
                  className={`flex-1 rounded py-1 text-[10px] font-bold transition-all ${cardTheme === th ? 'bg-white text-black shadow' : 'text-white/60 hover:text-white'}`}>
                  {th === 'broadcast' ? 'Bar' : th === 'gradient' ? 'Fade' : 'Mini'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Card Preview ── */}
        <div className={`relative w-full ${aspectRatio} shadow-2xl overflow-hidden rounded-xl bg-slate-900 select-none`}>

          {isProcessingImg && (
            <div className="absolute inset-0 z-50 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm">
              <i className="fas fa-compress-arrows-alt text-white text-2xl mb-3 animate-pulse" />
              <span className="text-white text-sm font-black mb-1">
                {language === 'zh' ? '壓縮相片中…' : 'Compressing…'}
              </span>
              <span className="text-white/60 text-xs">
                {language === 'zh' ? '大相自動縮細，唔影響質素' : 'Optimising for best performance'}
              </span>
            </div>
          )}

          {!bgImage && selectedPreset === null && (
            <div onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-800 cursor-pointer border-2 border-dashed border-slate-600 hover:bg-slate-700 transition-colors">
              <i className="fas fa-camera text-4xl text-slate-400 mb-2" />
              <span className="text-slate-300 font-bold">{t.uploadPhoto}</span>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          {/* RENDER AREA */}
          <div ref={cardRef} className={`relative w-full h-full overflow-hidden flex flex-col ${isDarkText ? 'bg-amber-50' : 'bg-slate-900'}`}>
            {renderBackground()}
            {mode === 'match' ? renderMatchCard() : mode === 'tournament' ? renderTournamentCard() : renderSeasonCard()}
          </div>

          {(bgImage || selectedPreset !== null) && (
            <button onClick={() => fileInputRef.current?.click()}
              className="absolute top-3 right-3 z-30 bg-black/50 text-white px-2.5 py-1 rounded-full text-xs backdrop-blur-sm border border-white/20 hover:bg-black/70">
              <i className="fas fa-camera" />
            </button>
          )}
        </div>

        {/* ── Match/Tournament layout toggle ── */}
        {(mode === 'match' || mode === 'tournament') && (
          <div className="flex bg-white/10 p-1 rounded-lg backdrop-blur-sm self-center gap-1">
            {(['card', 'poster'] as const).map(m => (
              <button key={m} onClick={() => setLayoutMode(m)}
                className={`px-4 py-1.5 rounded text-xs font-bold capitalize transition-all ${layoutMode === m ? 'bg-white text-slate-900' : 'text-white/60 hover:text-white'}`}>
                {m}
              </button>
            ))}
          </div>
        )}

        {/* ── Zoom slider (match + custom image) ── */}
        {bgImage && (
          <div className="bg-white/10 rounded-xl p-3 flex items-center gap-3 backdrop-blur-sm">
            <i className="fas fa-search-minus text-white/50 text-xs" />
            <input type="range" min="0.2" max="3" step="0.1" value={imgScale}
              onChange={e => setImgScale(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white" />
            <i className="fas fa-search-plus text-white/50 text-xs" />
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button onClick={() => { setImgScale(1); setImgPos({ x: 0, y: 0 }); }}
              className="text-xs font-bold text-white/80 hover:text-white uppercase">Reset</button>
          </div>
        )}

        {/* ── Preset selector ── */}
        <div className="flex gap-2 justify-center flex-wrap">
          {BG_PRESETS.map((p, i) => (
            <button key={i} onClick={() => selectPreset(i)} title={p.name}
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                selectedPreset === i ? `border-white scale-110 shadow-lg ${p.css}` : `border-transparent opacity-60 hover:opacity-100 ${p.css}`
              }`}>
              <i className={`fas ${p.icon} text-sm ${p.textDark ? 'text-slate-700' : 'text-white/90'}`} />
            </button>
          ))}
          <button onClick={() => fileInputRef.current?.click()} title="Upload Image"
            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center bg-slate-700 transition-all ${
              bgImage ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
            }`}>
            <i className="fas fa-image text-white text-sm" />
          </button>
        </div>

        {/* ── Download ── */}
        <button onClick={handleDownload} disabled={isGenerating}
          className="w-full bg-white text-slate-900 font-bold py-4 rounded-xl shadow-xl hover:bg-slate-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mb-2">
          {isGenerating
            ? <><i className="fas fa-spinner fa-spin" /> {t.generating}</>
            : <><i className="fas fa-download" /> {t.downloadImage}</>}
        </button>

      </div>
    </div>
  );
};

export default ShareCard;
