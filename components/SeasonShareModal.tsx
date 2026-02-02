
import React, { useState, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { MatchData, UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getTeamById, getTeamColorStyles } from '../utils/colors';
import { compressImage } from '../utils/image';

interface SeasonShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: MatchData[];
  profile: UserProfile;
  title: string; // e.g. "U8 - 2024" or "2024 Season"
}

// Updated presets with IDs
const BG_PRESETS = [
    { id: 'pitch', name: 'Pitch', css: 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-700 via-green-800 to-green-950', icon: 'fa-futbol' },
    { id: 'ucl', name: 'Champions', css: 'bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900 via-indigo-950 to-slate-900', icon: 'fa-star' },
    { id: 'modern', name: 'Modern', css: 'bg-gradient-to-br from-slate-800 via-gray-900 to-black', icon: 'fa-layer-group' },
    { id: 'fire', name: 'Heat', css: 'bg-gradient-to-tr from-orange-600 via-red-800 to-slate-900', icon: 'fa-fire' },
];

const SeasonShareModal: React.FC<SeasonShareModalProps> = ({ isOpen, onClose, matches, profile, title }) => {
  const { t } = useLanguage();
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(0); // Default to Pitch
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate Aggregated Stats
  const stats = useMemo(() => {
    const total = matches.length;
    const wins = matches.filter(m => m.scoreMyTeam > m.scoreOpponent).length;
    const goals = matches.reduce((acc, m) => acc + m.arthurGoals, 0);
    const assists = matches.reduce((acc, m) => acc + m.arthurAssists, 0);
    const avgRating = total > 0 
        ? (matches.reduce((acc, m) => acc + (m.rating || 0), 0) / total).toFixed(1)
        : '0.0';
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    return { total, wins, goals, assists, avgRating, winRate };
  }, [matches]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingImg(true);
      try {
        const compressed = await compressImage(file, 1200, 0.85);
        setBgImage(compressed);
        setSelectedPreset(null);
      } catch (err) {
        console.error("Image processing failed", err);
        alert("Could not load image.");
      } finally {
        setIsProcessingImg(false);
      }
    }
  };

  const selectPreset = (index: number) => {
      setSelectedPreset(index);
      setBgImage(null); // Clear custom image
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    
    try {
      await new Promise(r => setTimeout(r, 100));
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
      });

      const link = document.createElement('a');
      link.download = `season-recap-${title.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Generation failed', e);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- BACKGROUND PATTERN RENDERER ---
  const renderBackgroundPattern = () => {
      if (selectedPreset === null) return null;
      const presetId = BG_PRESETS[selectedPreset].id;

      if (presetId === 'pitch') {
          return (
              <div className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                  <div className="absolute top-4 left-4 right-4 bottom-4 border-2 border-white rounded-lg"></div>
                  <div className="absolute top-1/2 left-1/2 w-56 h-56 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                  <div className="absolute top-1/2 left-4 right-4 h-px bg-white -translate-y-1/2"></div>
              </div>
          );
      }

      if (presetId === 'ucl') {
          return (
              <div className="absolute inset-0 w-full h-full pointer-events-none opacity-10 overflow-hidden">
                  <i className="fas fa-star absolute -top-20 -right-20 text-[14rem] text-white rotate-12"></i>
                  <i className="fas fa-star absolute bottom-0 -left-16 text-[12rem] text-white -rotate-12"></i>
              </div>
          );
      }
      
      // Modern geometric pattern for season stats
      if (presetId === 'modern') {
           return (
              <div className="absolute inset-0 w-full h-full pointer-events-none opacity-10 overflow-hidden">
                   <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] border-[50px] border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                   <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] border-[30px] border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
              </div>
          );
      }

      return null;
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-sm flex flex-col gap-4 max-h-[95vh]">
        
        {/* Controls */}
        <div className="flex justify-between items-center text-white mb-2">
            <h3 className="font-bold text-lg"><i className="fas fa-trophy mr-2"></i>{t.shareSeason}</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                <i className="fas fa-times"></i>
            </button>
        </div>

        {/* The Card */}
        <div className="relative w-full aspect-[4/5] shadow-2xl overflow-hidden rounded-xl bg-slate-900 group">
            
            {/* Loading Overlay */}
            {isProcessingImg && (
                <div className="absolute inset-0 z-50 bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm">
                    <i className="fas fa-spinner fa-spin text-white text-3xl mb-2"></i>
                    <span className="text-white text-xs font-bold">Optimizing...</span>
                </div>
            )}

            {!bgImage && selectedPreset === null && (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-800 cursor-pointer border-2 border-dashed border-slate-600 hover:bg-slate-700 transition-colors"
                >
                    <i className="fas fa-camera text-4xl text-slate-400 mb-2"></i>
                    <span className="text-slate-300 font-bold">{t.uploadPhoto}</span>
                </div>
            )}
            
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            {/* RENDER AREA */}
            <div ref={cardRef} className="relative w-full h-full bg-slate-900 text-white overflow-hidden flex flex-col">
                
                {/* Background */}
                {bgImage ? (
                    <img src={bgImage} alt="Season" className="absolute inset-0 w-full h-full object-cover will-change-transform" />
                ) : selectedPreset !== null ? (
                    <div className={`absolute inset-0 w-full h-full ${BG_PRESETS[selectedPreset].css}`}>
                        {renderBackgroundPattern()}
                    </div>
                ) : (
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-900 to-slate-900 opacity-50"></div>
                )}
                
                {/* Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-blue-950 via-transparent to-black/60 opacity-90"></div>

                {/* Header */}
                <div className="relative z-10 p-6">
                    <div className="inline-block border border-white/30 px-3 py-1 rounded text-[10px] font-bold tracking-widest uppercase mb-2 backdrop-blur-sm">
                        {t.seasonRecap}
                    </div>
                    <h2 className="text-3xl font-black italic uppercase leading-none drop-shadow-md">{title}</h2>
                    <div className="text-sm font-bold opacity-80 mt-1">{profile.name}</div>
                </div>

                {/* Main Stats (Win Rate Circle) */}
                <div className="relative z-10 mt-auto mb-auto flex flex-col items-center justify-center">
                     <div className="relative w-32 h-32 flex items-center justify-center">
                        {/* Circle SVG */}
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                             <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                             <circle cx="50" cy="50" r="45" fill="none" stroke="#fbbf24" strokeWidth="8" 
                                strokeDasharray={`${stats.winRate * 2.82} 282`} 
                                strokeLinecap="round"
                             />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                             <span className="text-3xl font-black text-white drop-shadow-lg">{stats.winRate}%</span>
                             <span className="text-[10px] uppercase font-bold tracking-wide opacity-80">{t.winRate}</span>
                        </div>
                     </div>
                </div>

                {/* Stats Grid Footer */}
                <div className="relative z-10 bg-white/10 backdrop-blur-md border-t border-white/10 grid grid-cols-4 divide-x divide-white/10">
                    <div className="p-4 flex flex-col items-center">
                        <span className="text-xl font-black">{stats.total}</span>
                        <span className="text-[8px] uppercase font-bold opacity-60">{t.played}</span>
                    </div>
                    <div className="p-4 flex flex-col items-center">
                        <span className="text-xl font-black text-emerald-400">{stats.wins}</span>
                        <span className="text-[8px] uppercase font-bold opacity-60">{t.won}</span>
                    </div>
                    <div className="p-4 flex flex-col items-center">
                        <span className="text-xl font-black text-blue-400">{stats.goals}</span>
                        <span className="text-[8px] uppercase font-bold opacity-60">{t.goals}</span>
                    </div>
                    <div className="p-4 flex flex-col items-center">
                        <span className="text-xl font-black text-purple-400">{stats.assists}</span>
                        <span className="text-[8px] uppercase font-bold opacity-60">{t.assists}</span>
                    </div>
                </div>

            </div>

             {(bgImage || selectedPreset !== null) && (
                <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="absolute top-4 right-4 z-30 bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm border border-white/20 hover:bg-black/70"
                >
                   <i className="fas fa-camera mr-1"></i>
                </button>
            )}
        </div>
        
        {/* Preset Selector */}
        <div className="flex gap-3 justify-center">
            {BG_PRESETS.map((p, i) => (
                <button 
                    key={i}
                    onClick={() => selectPreset(i)}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${selectedPreset === i ? `border-white scale-110 shadow-lg ${p.css}` : `border-transparent opacity-60 hover:opacity-100 ${p.css}`}`}
                    title={p.name}
                >
                     <i className={`fas ${p.icon} text-white/80 text-sm`}></i>
                </button>
            ))}
            <button 
                 onClick={() => fileInputRef.current?.click()}
                 className={`w-10 h-10 rounded-full border-2 flex items-center justify-center bg-slate-700 transition-all ${bgImage ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                 title="Upload Image"
            >
                <i className="fas fa-image text-white text-sm"></i>
            </button>
        </div>

         <button 
           onClick={handleDownload}
           disabled={isGenerating}
           className="w-full bg-white text-slate-900 font-bold py-4 rounded-xl shadow-xl hover:bg-slate-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
            {isGenerating ? <><i className="fas fa-spinner fa-spin"></i> {t.generating}</> : <><i className="fas fa-download"></i> {t.downloadImage}</>}
        </button>

      </div>
    </div>
  );
};

export default SeasonShareModal;
