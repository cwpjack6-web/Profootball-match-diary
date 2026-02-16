
import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface WhatsNewModalProps {
  isOpen: boolean;
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
