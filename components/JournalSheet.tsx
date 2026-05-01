import React, { useState, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';

export interface JournalEntry {
  id: string;
  date: string;          // YYYY-MM-DD
  category: 'match' | 'training' | 'growth' | 'other';
  content: string;
  linkedMatchId?: string;   // optional — links to a match or tournament
  linkedMatchName?: string; // display name e.g. "Leicester City Tournament"
  createdAt: number;        // timestamp
}

interface JournalSheetProps {
  entries: JournalEntry[];
  matches: { id: string; opponent: string; date: string; tournamentName?: string; matchType?: string }[];
  onSave: (entry: Omit<JournalEntry, 'id' | 'createdAt'>, id?: string) => void;
  onDelete: (id: string) => void;
  teamHex?: string;
  externalAddRequest?: { linkedMatchId: string, linkedMatchName: string, timestamp: number } | null;
}

const CATEGORIES = [
  { key: 'match',    zhLabel: '比賽',  enLabel: 'Match',    icon: 'fa-futbol',        color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'training', zhLabel: '訓練',  enLabel: 'Training', icon: 'fa-running',       color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { key: 'growth',   zhLabel: '成長',  enLabel: 'Growth',   icon: 'fa-seedling',      color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { key: 'other',    zhLabel: '其他',  enLabel: 'Other',    icon: 'fa-sticky-note',   color: 'bg-amber-100 text-amber-700 border-amber-200' },
] as const;

const getCategoryMeta = (key: string) => CATEGORIES.find(c => c.key === key) ?? CATEGORIES[3];

const JournalSheet: React.FC<JournalSheetProps> = ({ entries, matches, onSave, onDelete, teamHex = '#3b82f6', externalAddRequest }) => {
  const { t, language } = useLanguage();
  const zh = language === 'zh';

  const [filterCat, setFilterCat] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state
  const today = new Date().toISOString().split('T')[0];
  const [formDate, setFormDate] = useState(today);
  const [formCat, setFormCat] = useState<JournalEntry['category']>('other');
  const [formContent, setFormContent] = useState('');
  const [formLinkedId, setFormLinkedId] = useState('');
  const [formLinkedName, setFormLinkedName] = useState('');

  React.useEffect(() => {
    if (externalAddRequest) {
      setEditingEntry(null);
      setFormDate(today);
      setFormCat('match'); // default to match
      setFormContent('');
      setFormLinkedId(externalAddRequest.linkedMatchId);
      setFormLinkedName(externalAddRequest.linkedMatchName);
      setShowForm(true);
    }
  }, [externalAddRequest]);

  const openNewForm = () => {
    setEditingEntry(null);
    setFormDate(today);
    setFormCat('other');
    setFormContent('');
    setFormLinkedId('');
    setFormLinkedName('');
    setShowForm(true);
  };

  const openEditForm = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setFormDate(entry.date);
    setFormCat(entry.category);
    setFormContent(entry.content);
    setFormLinkedId(entry.linkedMatchId ?? '');
    setFormLinkedName(entry.linkedMatchName ?? '');
    setShowForm(true);
  };

  const handleLinkChange = (value: string) => {
    setFormLinkedId(value);
    if (!value) { setFormLinkedName(''); return; }
    if (value.startsWith('tournament:')) {
      const tName = value.replace('tournament:', '');
      setFormLinkedName(tName);
      return;
    }
    const m = matches.find(x => x.id === value);
    if (!m) return;
    setFormLinkedName(m.tournamentName || m.opponent);
  };

  const handleSubmit = () => {
    if (!formContent.trim()) return;
    onSave({
      date: formDate,
      category: formCat,
      content: formContent.trim(),
      linkedMatchId: formLinkedId || undefined,
      linkedMatchName: formLinkedId ? formLinkedName : undefined
    }, editingEntry?.id);
    setShowForm(false);
  };

  // Group entries by month-year
  const sortedEntries = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const filteredEntries = filterCat === 'all' ? sortedEntries : sortedEntries.filter(e => e.category === filterCat);

  const groupedEntries = useMemo(() => {
    const groups: { [month: string]: JournalEntry[] } = {};
    filteredEntries.forEach(entry => {
        const d = new Date(entry.date);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const key = zh ? `${y}年${m}月` : `${d.toLocaleString('default', { month: 'long' })} ${y}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(entry);
    });
    return groups;
  }, [filteredEntries, zh]);

  // Extract unique tournament options
  const linkOptions = useMemo(() => {
    const tournaments = Array.from(new Set(matches.filter(m => m.tournamentName).map(m => m.tournamentName as string)));
    return {
      matches: [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      tournaments
    };
  }, [matches]);

  if (showForm) {
      return (
        <div className="absolute inset-0 bg-slate-50 z-20 flex flex-col animate-slide-up">
            <header className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center z-10 shrink-0">
               <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center text-slate-500 rounded-full hover:bg-slate-100">
                  <i className="fas fa-arrow-left"></i>
               </button>
               <h2 className="font-bold text-slate-800">{editingEntry ? (zh?'編輯日誌':'Edit Entry') : (zh?'寫新日誌':'New Entry')}</h2>
               <button onClick={handleSubmit} disabled={!formContent.trim()} className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded-lg disabled:opacity-50">
                  {zh?'儲存':'Save'}
               </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">{zh?'日期':'Date'}</label>
                   <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500" />
                </div>
                
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">{zh?'類別':'Category'}</label>
                   <div className="grid grid-cols-2 gap-2">
                       {CATEGORIES.map(cat => (
                           <button 
                             key={cat.key} 
                             onClick={() => setFormCat(cat.key as any)}
                             className={`p-3 rounded-xl border font-bold text-sm flex items-center gap-2 transition-colors ${formCat === cat.key ? cat.color : 'bg-white border-slate-200 text-slate-600'}`}
                           >
                               <i className={`fas ${cat.icon}`}></i>
                               {zh ? cat.zhLabel : cat.enLabel}
                           </button>
                       ))}
                   </div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">{zh?'連結比賽 (選填)':'Link Match (Optional)'}</label>
                   <select 
                     value={formLinkedId} 
                     onChange={(e) => handleLinkChange(e.target.value)}
                     className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500"
                   >
                       <option value="">{zh?'無':'None'}</option>
                       {linkOptions.tournaments.length > 0 && (
                           <optgroup label={zh?'🏆 杯賽/聯賽':'🏆 Tournaments'}>
                               {linkOptions.tournaments.map(tn => (
                                   <option key={`t-${tn}`} value={`tournament:${tn}`}>{tn}</option>
                               ))}
                           </optgroup>
                       )}
                       <optgroup label={zh?'⚽ 單場比賽':'⚽ Matches'}>
                           {linkOptions.matches.map(m => (
                               <option key={m.id} value={m.id}>{m.date} - {m.opponent}</option>
                           ))}
                       </optgroup>
                   </select>
                </div>

                <div className="flex-1 flex flex-col h-full min-h-[250px]">
                   <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">{zh?'內容':'Content'}</label>
                   <textarea 
                     value={formContent} 
                     onChange={e => setFormContent(e.target.value)}
                     placeholder={zh?'寫低今日學到咩、有咩感想...':'Write down what you learned or how you feel...'}
                     className="flex-1 w-full bg-white border border-slate-200 rounded-xl p-4 outline-none focus:border-blue-500 resize-none text-slate-700 leading-relaxed min-h-[200px]"
                   />
                </div>
                
                {editingEntry && (
                  <button 
                    onClick={() => {
                        if(confirm(zh?'確定刪除？':'Delete entry?')) { onDelete(editingEntry.id); setShowForm(false); }
                    }} 
                    className="w-full py-4 text-rose-500 font-bold border border-rose-100 bg-rose-50 rounded-xl mt-4"
                  >
                    <i className="fas fa-trash-alt mr-2"></i>{zh?'刪除日誌':'Delete Entry'}
                  </button>
                )}
            </div>
        </div>
      );
  }

  return (
    <div className="animate-fade-in relative flex flex-col h-full bg-slate-50 min-h-screen pb-32">
        <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200/50 p-4 pt-4">
            <h2 className="text-xl font-black text-slate-800 mb-3">{zh ? '球員日誌' : 'Player Journal'}</h2>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                <button 
                  onClick={() => setFilterCat('all')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap transition-all ${filterCat === 'all' ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                    {zh?'全部':'All'}
                </button>
                {CATEGORIES.map(cat => (
                    <button 
                      key={cat.key}
                      onClick={() => setFilterCat(cat.key)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap transition-all flex items-center gap-1.5 ${filterCat === cat.key ? cat.color + ' shadow-sm' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        <i className={`fas ${cat.icon}`}></i>{zh ? cat.zhLabel : cat.enLabel}
                    </button>
                ))}
            </div>
        </div>

        <div className="p-4 space-y-8">
            {Object.keys(groupedEntries).length === 0 ? (
                <div className="text-center py-12 px-4">
                    <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 text-3xl">
                        <i className="fas fa-book-open"></i>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-1">{zh?'仲未有日誌':'No entries yet'}</h3>
                    <p className="text-sm text-slate-500 mb-6">{zh?'養成寫低訓練同比賽心得嘅好習慣！':'Start a good habit of writing down your thoughts!'}</p>
                    <button onClick={openNewForm} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-500 transition-transform active:scale-95">
                        <i className="fas fa-pen mr-2"></i>{zh?'寫第一篇':'Write First Entry'}
                    </button>
                </div>
            ) : (
                Object.entries(groupedEntries).map(([month, monthEntries]) => (
                    <div key={month} className="relative">
                        <div className="sticky top-24 z-10 inline-block bg-white border border-slate-200 text-slate-600 text-[10px] font-black px-3 py-1 rounded-full shadow-sm mb-4 uppercase tracking-wider ml-4">
                            {month}
                        </div>
                        
                        <div className="space-y-4 px-2">
                            {monthEntries.map((entry, idx) => {
                                const meta = getCategoryMeta(entry.category);
                                const isExpanded = expandedId === entry.id;
                                
                                return (
                                    <div key={entry.id} className="relative flex gap-3 group">
                                        <div className="flex flex-col items-center pt-1">
                                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${meta.color} bg-white relative`}>
                                                <i className={`fas ${meta.icon} text-[10px]`}></i>
                                            </div>
                                            {idx !== monthEntries.length - 1 && (
                                                <div className="w-px h-full bg-slate-200 -mt-2"></div>
                                            )}
                                        </div>
                                        
                                        <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative text-left">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="text-[10px] font-bold text-slate-400">
                                                    {entry.date}
                                                </div>
                                                <button onClick={() => openEditForm(entry)} className="text-slate-300 hover:text-blue-500 px-2 py-1 -mr-2 -mt-2">
                                                    <i className="fas fa-ellipsis-h"></i>
                                                </button>
                                            </div>

                                            {entry.linkedMatchName && (
                                                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-md text-[10px] font-bold text-slate-500 mb-2 max-w-full">
                                                    <i className="fas fa-link shrink-0"></i>
                                                    <span className="truncate">{entry.linkedMatchName}</span>
                                                </div>
                                            )}
                                            
                                            <div 
                                              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                                              className={`text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap cursor-pointer ${isExpanded ? '' : 'line-clamp-3'}`}
                                            >
                                                {entry.content}
                                            </div>
                                            
                                            {!isExpanded && entry.content.split('\n').length > 3 && (
                                                <div className="text-[10px] text-blue-500 font-bold mt-1 uppercase" onClick={() => setExpandedId(entry.id)}>
                                                    {zh?'顯示更多':'Show more'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}
        </div>

        {!showForm && (
            <button 
              onClick={openNewForm}
              style={{ backgroundColor: teamHex }}
              className="fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white text-xl transition-transform hover:scale-110 active:scale-95 z-40 border border-white/20"
            >
                <i className="fas fa-plus"></i>
            </button>
        )}
    </div>
  );
};

export default JournalSheet;
