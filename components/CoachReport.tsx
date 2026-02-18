
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';
import { MatchData, UserProfile, CoachReport as CoachReportType, CoachPersona } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getCoachReports, saveCoachReport, getCoachAvatars, saveCoachAvatar } from '../services/storage';
import { generateCoachReport, calculateDataRichness } from '../services/ai';
import { useToast } from '../context/ToastContext';
import { compressImage } from '../utils/image';

interface CoachReportProps {
    profile: UserProfile;
    matches: MatchData[];
}

const COACH_NAMES = {
    motivator: "Jürgen",
    tactician: "Pep",
    wisdom: "Carlo",
    custom: "Coach"
};

// Restore paths assuming images are in public/coaches/
const DEFAULT_AVATAR_URLS = {
    motivator: "/coaches/motivator.png",
    tactician: "/coaches/tactician.png",
    wisdom: "/coaches/wisdom.png",
    custom: "" 
};

const CoachReport: React.FC<CoachReportProps> = ({ profile, matches }) => {
    const { t, language } = useLanguage();
    const { showToast } = useToast();
    
    // State
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [selectedPersona, setSelectedPersona] = useState<CoachPersona>('motivator');
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [currentReport, setCurrentReport] = useState<CoachReportType | null>(null);
    
    // Custom Coach State
    const [customName, setCustomName] = useState('');
    const [customStyle, setCustomStyle] = useState('');

    // Avatar State
    const [customAvatars, setCustomAvatars] = useState<Record<string, string>>({});
    const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({});
    
    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const reportRef = useRef<HTMLDivElement>(null); // Ref for capturing image

    // Initial Load
    useEffect(() => {
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        setSelectedMonth(currentMonthKey);
        
        // Load custom avatars
        setCustomAvatars(getCoachAvatars());
    }, []);

    // Load existing report
    useEffect(() => {
        if (!selectedMonth || !selectedPersona) return;
        
        const reports = getCoachReports(profile.id);
        const existing = reports.find(r => r.monthKey === selectedMonth && r.coachPersona === selectedPersona);
        
        setCurrentReport(existing || null);
        
        // Populate Custom Fields if existing
        if (selectedPersona === 'custom' && existing && existing.customCoachName) {
            setCustomName(existing.customCoachName);
        }
    }, [selectedMonth, selectedPersona, profile.id]);

    const monthMatches = useMemo(() => {
        if (!selectedMonth) return [];
        return matches.filter(m => {
            const mDate = new Date(m.date);
            const mKey = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}`;
            return mKey === selectedMonth && m.status !== 'scheduled';
        });
    }, [matches, selectedMonth]);

    const richness = useMemo(() => calculateDataRichness(monthMatches), [monthMatches]);

    const availableMonths = useMemo(() => {
        const set = new Set<string>();
        matches.filter(m => m.status !== 'scheduled').forEach(m => {
            const d = new Date(m.date);
            set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        });
        return Array.from(set).sort().reverse();
    }, [matches]);

    const handleGenerate = async () => {
        if (monthMatches.length === 0) {
            showToast('No matches in selected month', 'error');
            return;
        }

        if (selectedPersona === 'custom' && (!customName || !customStyle)) {
             showToast('Please enter coach name and style', 'error');
             return;
        }

        setIsLoading(true);
        try {
            const customDetails = selectedPersona === 'custom' ? { name: customName, style: customStyle } : undefined;
            const content = await generateCoachReport(profile, monthMatches, selectedMonth, selectedPersona, language, customDetails);
            
            const newReport: CoachReportType = {
                id: Date.now().toString(),
                profileId: profile.id,
                monthKey: selectedMonth,
                coachPersona: selectedPersona,
                customCoachName: selectedPersona === 'custom' ? customName : undefined,
                content: content,
                generatedAt: Date.now()
            };

            saveCoachReport(newReport);
            setCurrentReport(newReport);
            showToast(t.reportSaved, 'success');
        } catch (e: any) {
            console.error(e);
            const msg = e.message || 'Error generating report.';
            showToast(msg, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadLetter = async () => {
        if (!reportRef.current) return;
        setIsDownloading(true);

        try {
            // Slight delay to ensure renders
            await new Promise(resolve => setTimeout(resolve, 100));

            const canvas = await html2canvas(reportRef.current, {
                useCORS: true,
                scale: 2, // High resolution
                backgroundColor: null, // Transparent background (will pick up CSS styles)
                logging: false,
            });

            const link = document.createElement('a');
            link.download = `Coach_Report_${selectedMonth}_${selectedPersona}.png`;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast(t.exportSuccess || "Image Downloaded!", 'success');
        } catch (err) {
            console.error("Failed to generate image", err);
            showToast("Failed to generate image.", 'error');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleImageError = (persona: string) => {
        if (!avatarErrors[persona]) {
            setAvatarErrors(prev => ({ ...prev, [persona]: true }));
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && selectedPersona === 'custom') {
            try {
                const compressed = await compressImage(file, 200, 0.8);
                const updated = saveCoachAvatar('custom', compressed);
                setCustomAvatars(updated);
                showToast(t.save + ' ' + t.done, 'success');
            } catch (err) {
                console.error("Avatar upload failed", err);
                showToast("Failed to upload image", 'error');
            }
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const triggerUpload = () => {
        if (selectedPersona === 'custom') {
            setTimeout(() => fileInputRef.current?.click(), 100);
        }
    };

    const getSignatureFont = () => {
        if (selectedPersona === 'custom') return 'font-stamp text-2xl rotate-[-2deg]';
        switch(selectedPersona) {
            case 'motivator': return 'font-signature-heavy text-xl rotate-[-5deg]';
            case 'tactician': return 'font-signature-messy text-3xl rotate-[-2deg] tracking-widest';
            case 'wisdom': return 'font-signature-elegant text-3xl rotate-[-8deg]';
            default: return '';
        }
    };

    const getSignatureColor = () => {
        if (selectedPersona === 'custom') return 'text-slate-900';
        switch(selectedPersona) {
            case 'motivator': return 'text-red-800';
            case 'tactician': return 'text-blue-900';
            case 'wisdom': return 'text-slate-800';
            default: return '';
        }
    };

    const getReportHeaderStyle = (persona: CoachPersona) => {
        switch(persona) {
            case 'motivator': return 'bg-gradient-to-r from-red-700 to-rose-900 shadow-red-200';
            case 'tactician': return 'bg-gradient-to-r from-sky-700 to-slate-800 shadow-blue-200';
            case 'wisdom': return 'bg-gradient-to-r from-slate-800 to-black shadow-slate-300';
            default: return 'bg-gradient-to-r from-indigo-600 to-purple-800';
        }
    };

    const renderAvatar = (persona: CoachPersona) => {
        if (persona === 'custom') {
            const customSrc = customAvatars['custom'];
            if (customSrc) {
                return <img src={customSrc} alt="Custom Coach" className="w-full h-full object-cover" />;
            }
            return (
                <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                    <i className="fas fa-user-secret text-2xl"></i>
                </div>
            );
        }

        const url = DEFAULT_AVATAR_URLS[persona as keyof typeof DEFAULT_AVATAR_URLS];
        const hasError = avatarErrors[persona];

        if (!url || hasError) {
            let iconClass = 'fa-user-tie';
            let bgClass = 'bg-slate-200 text-slate-400';
            
            if (persona === 'motivator') { iconClass = 'fa-mitten'; bgClass = 'bg-red-100 text-red-400'; }
            if (persona === 'tactician') { iconClass = 'fa-chess-king'; bgClass = 'bg-blue-100 text-blue-400'; }
            if (persona === 'wisdom') { iconClass = 'fa-graduation-cap'; bgClass = 'bg-slate-200 text-slate-500'; }

            return (
                <div className={`w-full h-full flex items-center justify-center ${bgClass}`}>
                    <i className={`fas ${iconClass} text-2xl`}></i>
                </div>
            );
        }

        return (
            <img 
                src={url} 
                alt={persona} 
                className="w-full h-full object-cover" 
                onError={() => handleImageError(persona)}
                loading="lazy"
            />
        );
    };

    return (
        <div className="pb-24 animate-fade-in bg-slate-50 min-h-screen">
            
            <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleAvatarUpload} 
            />

            <div className="bg-slate-900 text-white p-4 sticky top-0 z-20 shadow-md">
                <div className="flex justify-between items-center">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <i className="fas fa-clipboard-list text-yellow-400"></i> {t.coachCorner}
                    </h2>
                </div>
            </div>

            <div className="p-4 space-y-6 max-w-lg mx-auto">
                
                {/* Controls */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-4">
                    {/* Selectors ... */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">{t.selectMonth}</label>
                        <select 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)} 
                            className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-700 outline-none"
                        >
                            {availableMonths.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                            {availableMonths.length === 0 && <option value="">{t.noMatches}</option>}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">{t.selectCoach}</label>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                            {(['motivator', 'tactician', 'wisdom', 'custom'] as CoachPersona[]).map(persona => {
                                const isSelected = selectedPersona === persona;
                                return (
                                    <button 
                                        key={persona}
                                        onClick={() => setSelectedPersona(persona)}
                                        className={`flex-none w-24 flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-all ${isSelected ? 'border-blue-500 bg-blue-50 shadow-md transform scale-105' : 'border-slate-100 bg-slate-50 opacity-70 hover:opacity-100'}`}
                                    >
                                        <div className="w-16 h-16 rounded-full overflow-hidden shadow-sm bg-white relative">
                                            {renderAvatar(persona)}
                                        </div>
                                        <span className={`text-[10px] font-bold text-center leading-tight ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>
                                            {t[persona as keyof typeof t]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {selectedPersona === 'custom' && (
                        <div className="animate-fade-in bg-blue-50 rounded-xl p-3 border border-blue-100 space-y-3 relative">
                            <button 
                                onClick={triggerUpload}
                                className="absolute -top-2 -right-2 w-8 h-8 bg-white border border-slate-200 rounded-full shadow flex items-center justify-center text-blue-600 z-10 hover:bg-blue-50"
                                title="Upload Custom Avatar"
                            >
                                <i className="fas fa-camera text-xs"></i>
                            </button>

                            <div>
                                <label className="text-[10px] font-bold text-blue-400 uppercase mb-1 block">{t.customCoach} Name</label>
                                <input 
                                    type="text" 
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    placeholder={t.customNamePlaceholder}
                                    className="w-full bg-white border border-blue-200 rounded-lg p-2 text-sm text-slate-900" 
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-blue-400 uppercase mb-1 block">Style</label>
                                <input 
                                    type="text" 
                                    value={customStyle}
                                    onChange={(e) => setCustomStyle(e.target.value)}
                                    placeholder={t.customStylePlaceholder}
                                    className="w-full bg-white border border-blue-200 rounded-lg p-2 text-sm text-slate-900"
                                />
                            </div>
                        </div>
                    )}

                    {/* Data Richness */}
                    <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
                         <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-slate-400 uppercase">{t.dataRichness}</span>
                             <span className={`text-xs font-bold ${richness === 'high' ? 'text-emerald-500' : richness === 'medium' ? 'text-yellow-500' : 'text-red-400'}`}>
                                 {t[`richness${richness.charAt(0).toUpperCase() + richness.slice(1)}` as keyof typeof t]}
                             </span>
                         </div>
                         <div className="flex gap-1">
                             {[1,2,3].map(i => (
                                 <div key={i} className={`w-2 h-8 rounded-full ${
                                     (richness === 'low' && i === 1) ? 'bg-red-400' :
                                     (richness === 'medium' && i <= 2) ? 'bg-yellow-400' :
                                     (richness === 'high') ? 'bg-emerald-400' : 'bg-slate-200'
                                 }`}></div>
                             ))}
                         </div>
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={isLoading || monthMatches.length === 0}
                        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2
                            ${isLoading ? 'bg-slate-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'}
                        `}
                    >
                        {isLoading ? (
                            <><i className="fas fa-spinner fa-spin"></i> {t.coachThinking}</>
                        ) : (
                            <><i className="fas fa-magic"></i> {currentReport ? t.generateReport + " (Regenerate)" : t.generateReport}</>
                        )}
                    </button>
                </div>

                {/* Report Display - Enhanced Letterhead Style */}
                {currentReport && (
                    <div className="animate-fade-in-up">
                        <div ref={reportRef} className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 relative mb-4">
                            {/* Paper Texture Overlay */}
                            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"></div>

                            {/* Report Header */}
                            <div className={`${getReportHeaderStyle(currentReport.coachPersona)} p-6 text-white relative overflow-hidden pb-8`}>
                                <div className="absolute top-[-50%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                                
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">{t.coachSays}</div>
                                        <h3 className="text-2xl font-bold font-serif leading-none tracking-tight">
                                            {currentReport.customCoachName || COACH_NAMES[currentReport.coachPersona]}
                                        </h3>
                                        <div className="text-[10px] opacity-60 mt-1 font-mono">{new Date(currentReport.generatedAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Avatar Overlap */}
                            <div className="absolute top-16 right-6 w-20 h-20 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white z-20">
                                {renderAvatar(currentReport.coachPersona)}
                            </div>

                            {/* Report Content with ReactMarkdown */}
                            <div className="p-8 pt-10 text-slate-700 text-sm leading-loose font-typewriter relative">
                                <i className="fas fa-quote-left text-4xl text-slate-100 absolute top-6 left-4 -z-0"></i>
                                
                                <div className="relative z-10 markdown-content">
                                    {/* Using react-markdown for cleaner rendering */}
                                    <ReactMarkdown 
                                        components={{
                                            strong: ({node, ...props}) => <span className="font-bold text-slate-900 bg-yellow-100/50 px-1 rounded" {...props} />,
                                            ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
                                            li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                            p: ({node, ...props}) => <p className="mb-4" {...props} />,
                                            h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2" {...props} />,
                                            h2: ({node, ...props}) => <h2 className="text-base font-bold mb-2" {...props} />,
                                        }}
                                    >
                                        {currentReport.content}
                                    </ReactMarkdown>
                                </div>
                                
                                {/* Signature */}
                                <div className="mt-8 flex justify-end">
                                    <div className="transform rotate-[-2deg] text-center">
                                        <div className={`text-3xl ${getSignatureFont()} ${getSignatureColor()}`}>
                                            {currentReport.customCoachName || COACH_NAMES[currentReport.coachPersona]}
                                        </div>
                                        <div className="w-full h-0.5 bg-slate-300 rounded-full mt-1 opacity-50"></div>
                                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Head Coach</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Download Button */}
                        <button 
                            onClick={handleDownloadLetter}
                            disabled={isDownloading}
                            className="w-full py-4 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                        >
                            {isDownloading ? (
                                <><i className="fas fa-spinner fa-spin"></i> {t.generating}</>
                            ) : (
                                <><i className="fas fa-file-download"></i> Download Coach Letter</>
                            )}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default CoachReport;
