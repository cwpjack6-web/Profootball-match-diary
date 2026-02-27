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
  onSave: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
  onDelete: (id: string) => void;
  teamHex?: string;
}

const CATEGORIES = [
  { key: 'match',    zhLabel: '比賽',  enLabel: 'Match',    icon: 'fa-futbol',        color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'training', zhLabel: '訓練',  enLabel: 'Training', icon: 'fa-running',       color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { key: 'growth',   zhLabel: '成長',  enLabel: 'Growth',   icon: 'fa-seedling',      color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { key: 'other',    zhLabel: '其他',  enLabel: 'Other',    icon: 'fa-sticky-note',   color: 'bg-amber-100 text-amber-700 border-amber-200' },
] as const;

const getCategoryMeta = (key: string) => CATEGORIES.find(c => c.key === key) ?? CATEGORIES[3];

const JournalSheet: React.FC<JournalSheetProps> = ({ entries, matches, onSave, onDelete, teamHex = '#3b82f6' }) => {
  const { language } = useLanguage();
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

  const handleLinkChange = (matchId: string) => {
    setFormLinkedId(matchId);
    if (!matchId) { setFormLinkedName(''); return; }
    const m = matches.find(x => x.id === matchId);
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
      linkedMatchName: formLinkedName || undefined,
    });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    setConfirmDeleteId(null);
  };

  // Sort & filter
  const filtered = useMemo(() => {
    return [...entries]
      .filter(e => filterCat === 'all' || e.category === filterCat)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [entries, filterCat]);

  // Group by month
  const grouped = useMemo(() => {
    const groups: Record<string, JournalEntry[]> = {};
    filtered.forEach(e => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return groups;
  }, [filtered]);

  const groupKeys = useMemo(() =>
    Object.keys(grouped).sort((a, b) => {
      const [y1, m1] = a.split('-').map(Number);
      const [y2, m2] = b.split('-').map(Number);
      return y2 - y1 || m2 - m1;
    }), [grouped]);

  const formatGroupKey = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    if (zh) return `${y} ${['一','二','三','四','五','六','七','八','九','十','十一','十二'][m-1]}月`;
    return new Date(y, m - 1).toLocaleDateString('en', { year: 'numeric', month: 'long' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex-none px-4 pt-4 pb-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button onClick={() => setFilterCat('all')}
            className={`flex-none px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${filterCat === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>
            {zh ? '全部' : 'All'}
          </button>
          {CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setFilterCat(c.key)}
              className={`flex-none px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${filterCat === c.key ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>
              <i className={`fas ${c.icon} mr-1`} />
              {zh ? c.zhLabel : c.enLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Entry list */}
      <div className="flex-1 overflow-y-auto px-4 pb-32">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <i className="fas fa-book-open text-4xl mb-3 opacity-30" />
            <p className="text-sm font-bold">{zh ? '未有日誌記錄' : 'No journal entries yet'}</p>
            <p className="text-xs mt-1 opacity-60">{zh ? '撳下方 ＋ 開始記錄' : 'Tap + below to start'}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <i className="fas fa-filter text-3xl mb-3 opacity-30" />
            <p className="text-sm font-bold">{zh ? '呢個分類未有記錄' : 'No entries in this category'}</p>
          </div>
        ) : (
          groupKeys.map(gk => (
            <div key={gk} className="mb-6">
              {/* Month header */}
              <div className="sticky top-0 z-10 py-2 mb-3">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wide">
                  {formatGroupKey(gk)}
                </span>
              </div>

              <div className="space-y-3">
                {grouped[gk].map(entry => {
                  const cat = getCategoryMeta(entry.category);
                  const isExpanded = expandedId === entry.id;
                  const preview = entry.content.length > 80 && !isExpanded
                    ? entry.content.slice(0, 80) + '…'
                    : entry.content;

                  return (
                    <div key={entry.id}
                      className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                      {/* Card header */}
                      <div className="flex items-start gap-3 p-4 pb-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-none ${cat.color} border`}>
                          <i className={`fas ${cat.icon} text-xs`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${cat.color}`}>
                              {zh ? cat.zhLabel : cat.enLabel}
                            </span>
                            {entry.linkedMatchName && (
                              <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 flex items-center gap-1">
                                <i className="fas fa-link text-[8px]" /> {entry.linkedMatchName}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">{entry.date}</p>
                        </div>
                        {/* Actions */}
                        <div className="flex gap-1 flex-none">
                          <button onClick={() => openEditForm(entry)}
                            className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors">
                            <i className="fas fa-pen text-[10px]" />
                          </button>
                          <button onClick={() => setConfirmDeleteId(entry.id)}
                            className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors">
                            <i className="fas fa-trash text-[10px]" />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="px-4 pb-4">
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{preview}</p>
                        {entry.content.length > 80 && (
                          <button onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                            className="text-[11px] text-blue-500 font-bold mt-1">
                            {isExpanded ? (zh ? '收起' : 'Collapse') : (zh ? '展開全文' : 'Read more')}
                          </button>
                        )}
                      </div>

                      {/* Delete confirm */}
                      {confirmDeleteId === entry.id && (
                        <div className="mx-4 mb-4 p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-center justify-between">
                          <p className="text-xs font-bold text-rose-600">{zh ? '確認刪除？' : 'Delete this entry?'}</p>
                          <div className="flex gap-2">
                            <button onClick={() => setConfirmDeleteId(null)}
                              className="text-xs font-bold text-slate-500 px-3 py-1 bg-white rounded-lg border">
                              {zh ? '取消' : 'Cancel'}
                            </button>
                            <button onClick={() => handleDelete(entry.id)}
                              className="text-xs font-bold text-white px-3 py-1 bg-rose-500 rounded-lg">
                              {zh ? '刪除' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button onClick={openNewForm}
        className="fixed bottom-24 right-6 sm:right-[calc(50%-336px)] w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-xl text-white transition-transform hover:scale-110 active:scale-95 z-40"
        style={{ backgroundColor: teamHex }}>
        <i className="fas fa-plus" />
      </button>

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-[80] flex flex-col justify-end sm:items-center sm:justify-center" onClick={() => setShowForm(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative z-10 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[85vh]"
            style={{ animation: 'slideUp 0.25s cubic-bezier(0.32,0.72,0,1)' }}
            onClick={e => e.stopPropagation()}
          >
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 flex-none">
              <h3 className="text-base font-black text-slate-800">
                {editingEntry
                  ? (zh ? '編輯日誌' : 'Edit Entry')
                  : (zh ? '新增日誌' : 'New Journal Entry')}
              </h3>
              <button onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <i className="fas fa-times text-sm" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Category */}
              <div>
                <label className="text-xs font-black text-slate-400 uppercase block mb-2">
                  {zh ? '類別' : 'Category'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(c => (
                    <button key={c.key} type="button"
                      onClick={() => setFormCat(c.key as JournalEntry['category'])}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${formCat === c.key ? c.color + ' shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                      <i className={`fas ${c.icon}`} />
                      {zh ? c.zhLabel : c.enLabel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-black text-slate-400 uppercase block mb-2">
                  {zh ? '日期' : 'Date'}
                </label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-400" />
              </div>

              {/* Link to match */}
              <div>
                <label className="text-xs font-black text-slate-400 uppercase block mb-2">
                  {zh ? '關聯比賽（可選）' : 'Link to Match (optional)'}
                </label>
                <select value={formLinkedId} onChange={e => handleLinkChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-400">
                  <option value="">{zh ? '-- 唔關聯 --' : '-- None --'}</option>
                  {matches
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map(m => (
                      <option key={m.id} value={m.id}>
                        {m.date} · {m.tournamentName || m.opponent}
                      </option>
                    ))}
                </select>
              </div>

              {/* Content */}
              <div>
                <label className="text-xs font-black text-slate-400 uppercase block mb-2">
                  {zh ? '內容' : 'Content'}
                </label>
                <textarea
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  rows={5}
                  placeholder={zh ? '記低今日嘅觀察、感受或者重要事項...' : 'Write your observations, reflections, or notes...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Save */}
            <div className="p-4 border-t border-slate-100 flex-none">
              <button onClick={handleSubmit}
                disabled={!formContent.trim()}
                className="w-full py-3 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 transition-all active:scale-95"
                style={{ backgroundColor: teamHex }}>
                <i className="fas fa-save" />
                {zh ? '儲存日誌' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalSheet;
