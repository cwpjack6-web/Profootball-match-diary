
import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface WhatsNewModalProps {
  isOpen: boolean;import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const updates = [
  {
    icon: 'fa-bolt',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/20',
    titleZh: '⚡ 快速戰報記錄',
    titleEn: '⚡ Quick Match Log',
    descZh: '比賽中即時記錄入球、助攻、換人，唔使等完場先記。',
    descEn: 'Log goals, assists and substitutions instantly during the match.',
  },
  {
    icon: 'fa-robot',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/20',
    titleZh: '🤖 AI 教練分析',
    titleEn: '🤖 AI Coach Analysis',
    descZh: '「名帥複盤」逐場分析表現，「成長故事」睇到整個賽季進步軌跡。',
    descEn: 'Match-by-match coach review and a full season growth story, powered by AI.',
  },
  {
    icon: 'fa-share-alt',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
    titleZh: '📸 分享戰報卡升級',
    titleEn: '📸 Improved Share Card',
    descZh: '上傳相片後可以拖放、縮放，配合多款主題自由設計你嘅戰報卡。',
    descEn: 'Upload a photo, then drag and pinch-zoom it. Multiple card themes available.',
  },
  {
    icon: 'fa-futbol',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/20',
    titleZh: '⚽ 烏龍球記錄',
    titleEn: '⚽ Own Goal Tracking',
    descZh: '支援記錄對方烏龍球（加我方分）同我方烏龍球（加對方分）。',
    descEn: 'Track opponent own goals (our score) and own own goals (their score).',
  },
  {
    icon: 'fa-wrench',
    color: 'text-slate-400',
    bg: 'bg-slate-400/10',
    border: 'border-slate-400/20',
    titleZh: '🔧 細節優化',
    titleEn: '🔧 Polish & Fixes',
    descZh: '多項介面流暢度改善、輸入框不再亂跳、出場狀態記錄更完整。',
    descEn: 'Smoother UI, input focus fixes, and more detailed appearance tracking.',
  },
];

export default function WhatsNewModal({ isOpen, onClose }: Props) {
  const { language } = useLanguage();
  const zh = language === 'zh';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-white/10 overflow-hidden">

        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 text-center">
          {/* Drag handle (mobile) */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20 sm:hidden" />

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg mb-3">
            <i className="fas fa-star text-white text-xl" />
          </div>
          <h2 className="text-xl font-black text-white">
            {zh ? '有咩新嘢？' : "What's New"}
          </h2>
          <p className="text-slate-400 text-xs mt-1 font-medium">
            {zh ? '版本 1.1 更新內容' : 'Version 1.1 Update'}
          </p>
        </div>

        {/* Update list */}
        <div className="px-4 pb-4 space-y-2.5 max-h-[55vh] overflow-y-auto">
          {updates.map((u, i) => (
            <div key={i} className={`flex gap-3 p-3 rounded-xl border ${u.bg} ${u.border}`}>
              <div className={`flex-none w-9 h-9 rounded-lg flex items-center justify-center ${u.bg}`}>
                <i className={`fas ${u.icon} ${u.color} text-sm`} />
              </div>
              <div className="min-w-0">
                <p className="text-white font-black text-sm leading-tight">
                  {zh ? u.titleZh : u.titleEn}
                </p>
                <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                  {zh ? u.descZh : u.descEn}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-4 pb-6 pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black text-sm shadow-lg active:scale-95 transition-transform"
          >
            {zh ? '開始探索 🚀' : 'Let\'s go 🚀'}
          </button>
        </div>
      </div>
    </div>
  );
}
  onClose: () => void;
}

const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col relative max-h-[85vh]">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center flex-none">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md border-2 border-white/30">
                <i className="fas fa-gift text-2xl"></i>
            </div>
            <h2 className="text-xl font-black">{t.whatsNewTitle}</h2>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
            
            {/* Feature 1: Coach AI */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                    <span className="bg-purple-100 text-purple-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border border-purple-200">1</span>
                    <h3 className="font-bold text-slate-800">{t.whatsNewCoachTitle}</h3>
                </div>
                
                <p className="text-xs text-slate-500 leading-relaxed pl-10">
                    {t.whatsNewCoachDesc}
                </p>

                <div className="pl-10 space-y-2">
                    <div className="flex items-center gap-3 bg-red-50 p-2 rounded-lg border border-red-100">
                        <i className="fas fa-fire text-red-500 w-4 text-center"></i>
                        <span className="text-[10px] font-bold text-slate-700">{t.whatsNewCoachM}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-blue-50 p-2 rounded-lg border border-blue-100">
                        <i className="fas fa-chess-board text-blue-500 w-4 text-center"></i>
                        <span className="text-[10px] font-bold text-slate-700">{t.whatsNewCoachT}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-yellow-50 p-2 rounded-lg border border-yellow-100">
                        <i className="fas fa-brain text-yellow-600 w-4 text-center"></i>
                        <span className="text-[10px] font-bold text-slate-700">{t.whatsNewCoachW}</span>
                    </div>
                </div>
            </div>

            {/* Feature 2: Data Richness */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                    <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border border-emerald-200">2</span>
                    <h3 className="font-bold text-slate-800">{t.whatsNewRichnessTitle}</h3>
                </div>
                <div className="pl-10">
                    <div className="w-full h-2 bg-slate-200 rounded-full mb-2 overflow-hidden flex">
                        <div className="w-1/3 bg-red-400"></div>
                        <div className="w-1/3 bg-yellow-400"></div>
                        <div className="w-1/3 bg-green-500"></div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        {t.whatsNewRichnessDesc}
                    </p>
                </div>
            </div>

        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex-none">
            <button 
                onClick={onClose}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg"
            >
                {t.gotIt}
            </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsNewModal;
