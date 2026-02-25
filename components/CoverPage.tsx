import React, { useState } from 'react';
import { CoverPageProps } from '../types';
import { useLanguage } from '../context/LanguageContext';

const CoverPage: React.FC<CoverPageProps> = ({ profiles, onSelectProfile, onAddProfile, onImportData, onDeleteProfile }) => {
  const { t, toggleLanguage, language } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (window.confirm(`${t.confirmDeleteProfile}\n\n${t.deleteProfileDesc}`)) {
          onDeleteProfile(id);
      }
  };

  return (
    <div className="h-screen bg-slate-900 flex flex-col relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle,rgba(59,130,246,0.5)_0%,transparent_70%)]"></div>
      </div>

      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <button 
            onClick={toggleLanguage}
            className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors border border-white/10 cursor-pointer shadow-md"
        >
            {language === 'zh' ? 'EN' : '中'}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 animate-fade-in">
        
        {/* Title */}
        <div className="text-center mb-6 sm:mb-10">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-[0_0_40px_rgba(37,99,235,0.4)] rotate-3">
                <i className="fas fa-futbol text-4xl text-white"></i>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-2">ProFootball Match Diary</h1>
            <p className="text-blue-200 text-sm font-medium uppercase tracking-widest opacity-80">
                {profiles.length > 0 ? (language === 'zh' ? '記錄每一步成長' : 'Record Every Step of Growth') : t.welcomeDesc}
            </p>
        </div>

        {/* --- STATE 1: NO PROFILES (WELCOME SCREEN) --- */}
        {profiles.length === 0 && (
           <div className="w-full max-w-xs space-y-4">
               <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-xl text-center mb-6">
                   <p className="text-slate-300 mb-6 font-medium">{t.startJourney}</p>
                   <button 
                       onClick={onAddProfile}
                       className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/50 transition-all active:scale-95 flex items-center justify-center gap-2 mb-3"
                   >
                       <i className="fas fa-plus"></i> {t.createProfile}
                   </button>
                   <button 
                       onClick={onImportData}
                       className="w-full bg-transparent border-2 border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 font-bold py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                   >
                       <i className="fas fa-file-import"></i> {t.restoreBackup}
                   </button>
               </div>
           </div>
        )}

        {/* --- STATE 2: EXISTING PROFILES --- */}
        {profiles.length > 0 && (
            <div className="flex flex-col items-center w-full max-w-md">
                
                <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full mb-4 sm:mb-8">
                    {profiles.map(profile => (
                        <div key={profile.id} className="relative group">
                            
                            {/* Delete Button (Visible only in Edit Mode) */}
                            {isEditing && (
                                <button 
                                    onClick={(e) => handleDeleteClick(e, profile.id)}
                                    className="absolute -top-1 -right-1 z-20 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 animate-fade-in"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            )}

                            <button
                                onClick={() => !isEditing && onSelectProfile(profile)}
                                className={`w-full flex flex-col items-center ${isEditing ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                                <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-800 border-4 border-slate-700 shadow-xl overflow-hidden mb-2 sm:mb-3 transition-all duration-300 ${!isEditing && 'group-hover:border-blue-500 group-hover:scale-105'}`}>
                                    {profile.avatar ? (
                                        <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-600 group-hover:text-blue-500 transition-colors">
                                            <i className="fas fa-user text-3xl"></i>
                                        </div>
                                    )}
                                </div>
                                <span className={`text-white font-bold text-lg transition-colors ${!isEditing && 'group-hover:text-blue-400'}`}>{profile.name}</span>
                                <span className="text-slate-500 text-xs font-bold">{profile.teams.length} {t.teamsCount}</span>
                            </button>
                        </div>
                    ))}

                    {/* Add New Profile Button (Hidden in Edit Mode) */}
                    {!isEditing && (
                        <button
                            onClick={onAddProfile}
                            className="group flex flex-col items-center justify-center"
                        >
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-800/50 border-4 border-dashed border-slate-700 shadow-xl flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-slate-800 group-hover:border-slate-600 transition-all duration-300">
                                <i className="fas fa-plus text-2xl text-slate-500 group-hover:text-white transition-colors"></i>
                            </div>
                            <span className="text-slate-400 font-bold text-sm group-hover:text-white transition-colors">{t.addNewProfile}</span>
                        </button>
                    )}
                </div>

                {/* Manage Profiles Button */}
                <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`text-sm font-bold flex items-center gap-2 px-4 py-2 rounded-full transition-all ${isEditing ? 'bg-slate-700 text-white' : 'text-slate-600 hover:text-slate-400'}`}
                >
                    {isEditing ? (
                        <>
                            <i className="fas fa-check"></i> {t.done}
                        </>
                    ) : (
                        <>
                            <i className="fas fa-cog"></i> {t.manageProfiles}
                        </>
                    )}
                </button>
            </div>
        )}

      </div>
      
      {/* Footer / Import Button for existing users */}
      <div className="p-6 text-center">
         {!isEditing && profiles.length > 0 && (
             <button onClick={onImportData} className="text-slate-600 hover:text-slate-400 text-xs font-medium flex items-center justify-center gap-2 mx-auto mb-2">
                 <i className="fas fa-sync-alt"></i> {t.syncData}
             </button>
         )}
         <div className="text-slate-700 text-[10px] font-medium">
            © 2025 ProFootball Match Diary
         </div>
      </div>
    </div>
  );
};

export default CoverPage;