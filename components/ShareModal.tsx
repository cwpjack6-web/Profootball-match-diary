
import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { MatchData, UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getTeamById, getTeamColorStyles } from '../utils/colors';
import { compressImage } from '../utils/image';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: MatchData;
  profile: UserProfile;
}

const BG_PRESETS = [
    { id: 'pitch', name: 'Pitch', css: 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-700 via-green-800 to-green-950', icon: 'fa-futbol' },
    { id: 'ucl', name: 'Champions', css: 'bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900 via-indigo-950 to-slate-900', icon: 'fa-star' },
    { id: 'modern', name: 'Modern', css: 'bg-gradient-to-br from-slate-800 via-gray-900 to-black', icon: 'fa-layer-group' },
    { id: 'fire', name: 'Heat', css: 'bg-gradient-to-tr from-orange-600 via-red-800 to-slate-900', icon: 'fa-fire' },
];

type LayoutPosition = 'top' | 'center' | 'bottom';
type CardTheme = 'minimal' | 'broadcast' | 'gradient';

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, match, profile }) => {
  const { t } = useLanguage();
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'card' | 'poster'>('card');
  
  // New Layout Controls
  const [textPosition, setTextPosition] = useState<LayoutPosition>('bottom');
  const [cardTheme, setCardTheme] = useState<CardTheme>('broadcast');
  
  // Image Manipulation State
  const [imgScale, setImgScale] = useState(1);
  const [imgPos, setImgPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset transform when image changes
  useEffect(() => {
      setImgScale(1);
      setImgPos({ x: 0, y: 0 });
  }, [bgImage]);

  if (!isOpen) return null;

  const matchTeam = getTeamById(profile.teams, match.teamId);
  const theme = getTeamColorStyles(matchTeam.themeColor);

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
        alert("Could not load image. Please try again.");
      } finally {
        setIsProcessingImg(false);
      }
    }
  };

  const selectPreset = (index: number) => { setSelectedPreset(index); setBgImage(null); };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      await new Promise(r => setTimeout(r, 100));
      
      const canvas = await html2canvas(cardRef.current, { 
          useCORS: true, 
          scale: 2, 
          backgroundColor: null,
          logging: false
      });
      
      const link = document.createElement('a');
      link.download = `match-report-${match.date}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (e) { 
        console.error('Generation failed', e);
        alert('Could not generate image. Please try again.'); 
    } finally { 
        setIsGenerating(false); 
    }
  };

  // --- Drag & Drop Logic for Image ---
  const handlePointerDown = (e: React.PointerEvent) => {
      if (!bgImage) return;
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - imgPos.x, y: e.clientY - imgPos.y });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (!isDragging || !bgImage) return;
      e.preventDefault();
      setImgPos({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
      });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const getScorersText = () => {
    let list: string[] = [];
    if (match.arthurGoals > 0) list.push(`${profile.name} x${match.arthurGoals}`);
    match.scorers.forEach(s => {
       const tm = matchTeam.roster.find(r => r.id === s.teammateId);
       if (tm) list.push(`${tm.name} x${s.count}`);
    });
    return list.join(' • ');
  };

  const isWin = match.scoreMyTeam > match.scoreOpponent;
  const isLoss = match.scoreMyTeam < match.scoreOpponent;
  const resultColor = isWin ? '#10b981' : isLoss ? '#ef4444' : '#94a3b8';

  const renderBackgroundPattern = () => {
      if (selectedPreset === null) return null;
      const presetId = BG_PRESETS[selectedPreset].id;
      if (presetId === 'pitch') return <div className="absolute inset-0 w-full h-full pointer-events-none opacity-20"><div className="absolute top-4 left-4 right-4 bottom-4 border-2 border-white rounded-lg"></div><div className="absolute top-1/2 left-1/2 w-48 h-48 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2"></div><div className="absolute top-1/2 left-4 right-4 h-px bg-white -translate-y-1/2"></div></div>;
      if (presetId === 'ucl') return <div className="absolute inset-0 w-full h-full pointer-events-none opacity-10 overflow-hidden"><i className="fas fa-star absolute -top-10 -right-10 text-[12rem] text-white rotate-12"></i><i className="fas fa-star absolute top-1/3 -left-16 text-[10rem] text-white -rotate-12"></i></div>;
      if (presetId === 'modern') return <div className="absolute inset-0 w-full h-full pointer-events-none opacity-5 overflow-hidden"><div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div><div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div><div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div></div>;
      return null;
  };

  const aspectRatio = layoutMode === 'poster' ? 'aspect-[9/16]' : 'aspect-[4/5]';

  // --- Dynamic Styles based on Theme ---
  const getContentContainerClass = () => {
      let base = "relative z-10 w-full flex flex-col pointer-events-none transition-all duration-300 ";
      
      // Positioning
      if (textPosition === 'top') base += "justify-start ";
      else if (textPosition === 'center') base += "justify-center h-full ";
      else base += "justify-end mt-auto "; // Bottom

      return base;
  };

  const getCardStyle = () => {
      if (cardTheme === 'minimal') return "p-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]";
      if (cardTheme === 'broadcast') return "bg-slate-900/90 text-white w-full border-t-2 border-white/10 p-6";
      if (cardTheme === 'gradient') return "bg-gradient-to-t from-black/90 to-transparent pt-12 p-6 text-white";
      return "";
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col gap-4 my-auto">
        <div className="flex justify-between items-center text-white mb-1">
            <h3 className="font-bold text-lg"><i className="fas fa-share-alt mr-2"></i>{t.shareMatch}</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><i className="fas fa-times"></i></button>
        </div>
        
        {/* Layout & Style Controls */}
        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm grid grid-cols-2 gap-2">
            <div className="flex bg-black/20 rounded-lg p-1">
                <button onClick={() => setTextPosition('top')} className={`flex-1 rounded py-1 text-[10px] font-bold ${textPosition === 'top' ? 'bg-white text-black shadow' : 'text-white/60'}`}><i className="fas fa-arrow-up"></i></button>
                <button onClick={() => setTextPosition('center')} className={`flex-1 rounded py-1 text-[10px] font-bold ${textPosition === 'center' ? 'bg-white text-black shadow' : 'text-white/60'}`}><i className="fas fa-arrows-alt-v"></i></button>
                <button onClick={() => setTextPosition('bottom')} className={`flex-1 rounded py-1 text-[10px] font-bold ${textPosition === 'bottom' ? 'bg-white text-black shadow' : 'text-white/60'}`}><i className="fas fa-arrow-down"></i></button>
            </div>
            <div className="flex bg-black/20 rounded-lg p-1">
                <button onClick={() => setCardTheme('broadcast')} className={`flex-1 rounded py-1 text-[10px] font-bold ${cardTheme === 'broadcast' ? 'bg-white text-black shadow' : 'text-white/60'}`}>Bar</button>
                <button onClick={() => setCardTheme('gradient')} className={`flex-1 rounded py-1 text-[10px] font-bold ${cardTheme === 'gradient' ? 'bg-white text-black shadow' : 'text-white/60'}`}>Fade</button>
                <button onClick={() => setCardTheme('minimal')} className={`flex-1 rounded py-1 text-[10px] font-bold ${cardTheme === 'minimal' ? 'bg-white text-black shadow' : 'text-white/60'}`}>Mini</button>
            </div>
        </div>

        {/* Card Container */}
        <div className={`relative w-full ${aspectRatio} shadow-2xl overflow-hidden rounded-xl bg-slate-900 group select-none transition-all duration-300 mx-auto`}>
            
            {/* Loading Overlay */}
            {isProcessingImg && (
                <div className="absolute inset-0 z-50 bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm">
                    <i className="fas fa-spinner fa-spin text-white text-3xl mb-2"></i>
                    <span className="text-white text-xs font-bold">Optimizing...</span>
                </div>
            )}

            {!bgImage && selectedPreset === null && <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-800 cursor-pointer border-2 border-dashed border-slate-600 hover:bg-slate-700 transition-colors"><i className="fas fa-camera text-4xl text-slate-400 mb-2"></i><span className="text-slate-300 font-bold">{t.uploadPhoto}</span></div>}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            
            <div ref={cardRef} className="relative w-full h-full bg-slate-900 text-white overflow-hidden flex flex-col">
                {/* Background Image Layer */}
                {bgImage ? (
                     <div 
                        className="absolute inset-0 w-full h-full overflow-hidden cursor-move"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                     >
                        <img 
                            src={bgImage} 
                            alt="Match" 
                            className="absolute left-1/2 top-1/2 max-w-none min-w-full min-h-full pointer-events-none will-change-transform" 
                            style={{ 
                                transform: `translate(-50%, -50%) translate(${imgPos.x}px, ${imgPos.y}px) scale(${imgScale})`,
                                touchAction: 'none' 
                            }} 
                        />
                     </div>
                ) : selectedPreset !== null ? (
                    <div className={`absolute inset-0 w-full h-full ${BG_PRESETS[selectedPreset].css}`}>{renderBackgroundPattern()}</div>
                ) : (
                    <div className={`absolute inset-0 w-full h-full bg-gradient-to-br ${theme.gradient} opacity-50`}></div>
                )}

                {/* Content Container */}
                <div className={getContentContainerClass()}>
                    
                    {/* The Info Card */}
                    <div className={`w-full ${getCardStyle()} transition-all duration-300`}>
                        
                        {/* Header Row */}
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold tracking-widest uppercase opacity-70 mb-0.5">{t.matchResult}</span>
                                <div className="flex items-center gap-2">
                                    {cardTheme === 'broadcast' && <div className={`h-6 w-1 ${theme.bg}`}></div>}
                                    <h2 className="text-lg font-black italic uppercase leading-none flex items-center gap-2">
                                        {matchTeam.name}
                                        {/* Logo in Share Card - Increased Size */}
                                        {matchTeam.logo && <img src={matchTeam.logo} className="h-8 w-8 object-contain drop-shadow-md" alt="" />}
                                    </h2>
                                </div>
                            </div>
                            {match.isMotm && <div className="bg-yellow-500 text-black px-2 py-0.5 rounded-full font-black text-[10px] shadow-lg flex items-center gap-1 transform rotate-3"><i className="fas fa-trophy"></i> MOTM</div>}
                        </div>

                        {/* Score Block */}
                        <div className="flex items-center justify-center gap-4 w-full mb-2">
                             <div className="text-center w-1/3">
                                 <span className="text-4xl font-black shadow-black drop-shadow-lg">{match.scoreMyTeam}</span>
                                 <span className="block text-[10px] font-bold uppercase mt-1 opacity-80">{t.us}</span>
                             </div>
                             <div className="h-8 w-px bg-white/30"></div>
                             <div className="text-center w-1/3">
                                 <span className="text-4xl font-black shadow-black drop-shadow-lg opacity-80">{match.scoreOpponent}</span>
                                 <span className="block text-[10px] font-bold uppercase mt-1 opacity-60">{match.opponent}</span>
                             </div>
                        </div>
                        
                        {layoutMode === 'card' && cardTheme === 'broadcast' && <div className="w-full h-1 rounded-full bg-white/20 mb-3 overflow-hidden flex justify-center"><div className="h-full w-24 rounded-full" style={{ backgroundColor: resultColor }}></div></div>}

                        {/* Footer Details */}
                        <div className="w-full flex flex-col items-center gap-1">
                             {(match.arthurGoals > 0 || match.scorers.length > 0) && (
                                <div className="text-center mb-1">
                                    <div className="text-[9px] font-bold uppercase text-emerald-400 mb-0.5 opacity-90"><i className="fas fa-futbol mr-1"></i> Scoresheet</div>
                                    <p className="text-xs font-medium leading-relaxed max-w-[90%] mx-auto opacity-90">{getScorersText()}</p>
                                </div>
                             )}
                             <div className="flex items-center gap-3 text-[10px] font-bold opacity-70 uppercase tracking-wide mt-1">
                                 <span>{match.date}</span>
                                 {match.location && <><span>•</span><span>{match.location}</span></>}
                             </div>
                        </div>
                    </div>

                </div>
            </div>
            
            {/* Camera Button Over Image */}
            {(bgImage || selectedPreset !== null) && <button onClick={() => fileInputRef.current?.click()} className="absolute top-4 right-4 z-30 bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm border border-white/20 hover:bg-black/70"><i className="fas fa-camera mr-1"></i></button>}
        </div>

        {/* Layout Toggle Footer */}
        <div className="flex bg-white/10 p-1 rounded-lg backdrop-blur-sm self-center">
            <button onClick={() => setLayoutMode('card')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${layoutMode === 'card' ? 'bg-white text-slate-900' : 'text-white/60 hover:text-white'}`}>Card</button>
            <button onClick={() => setLayoutMode('poster')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${layoutMode === 'poster' ? 'bg-white text-slate-900' : 'text-white/60 hover:text-white'}`}>Poster</button>
        </div>

        {/* Image Controls (Visible only when BG Image is active) */}
        {bgImage && (
            <div className="bg-white/10 rounded-xl p-3 flex items-center gap-3 backdrop-blur-sm animate-fade-in">
                <i className="fas fa-search-minus text-white/50 text-xs"></i>
                <input 
                    type="range" 
                    min="0.2" 
                    max="3" 
                    step="0.1" 
                    value={imgScale} 
                    onChange={(e) => setImgScale(parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                />
                <i className="fas fa-search-plus text-white/50 text-xs"></i>
                <div className="w-px h-4 bg-white/20 mx-2"></div>
                <button onClick={() => { setImgScale(1); setImgPos({x:0, y:0}); }} className="text-xs font-bold text-white/80 hover:text-white uppercase">Reset</button>
            </div>
        )}

        <div className="flex gap-3 justify-center">{BG_PRESETS.map((p, i) => <button key={i} onClick={() => selectPreset(i)} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${selectedPreset === i ? `border-white scale-110 shadow-lg ${p.css}` : `border-transparent opacity-60 hover:opacity-100 ${p.css}`}`} title={p.name}><i className={`fas ${p.icon} text-white/80 text-sm`}></i></button>)}<button onClick={() => fileInputRef.current?.click()} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center bg-slate-700 transition-all ${bgImage ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}><i className="fas fa-image text-white text-sm"></i></button></div>
        <button onClick={handleDownload} disabled={isGenerating} className="w-full bg-white text-slate-900 font-bold py-4 rounded-xl shadow-xl hover:bg-slate-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mb-4">{isGenerating ? <><i className="fas fa-spinner fa-spin"></i> {t.generating}</> : <><i className="fas fa-download"></i> {t.downloadImage}</>}</button>
      </div>
    </div>
  );
};

export default ShareModal;
