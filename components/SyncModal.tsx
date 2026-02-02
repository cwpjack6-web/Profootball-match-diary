
import React, { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { MatchData, UserProfile } from '../types';
import { importMatches, importProfile, getFullBackupData, updateLastBackupDate } from '../services/storage';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: MatchData[];
  profile: UserProfile | null;
  onSyncComplete: () => void;
  syncOnlyMatches?: MatchData[] | null;
}

const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose, matches, profile, onSyncComplete, syncOnlyMatches }) => {
  const { t } = useLanguage();
  const [error, setError] = useState<string>('');
  const [conflictMode, setConflictMode] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any>(null);
  
  const backupInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessData = (data: any, forceMerge: boolean = false) => {
      // Basic validation
      if (!data || (data.type !== 'arthur_sync_v1' && data.type !== 'arthur_full_backup_v1')) {
          setError(t.importError);
          return;
      }

      // Conflict Check Logic (Simplified: If IDs exist, warn user)
      if (!forceMerge && data.matches && Array.isArray(data.matches) && matches.length > 0) {
           const localMap = new Map(matches.map(m => [m.id, m]));
           let hasConflict = false;
           
           for (const incoming of data.matches) {
               if (localMap.has(incoming.id)) {
                   hasConflict = true;
                   break;
               }
           }

           if (hasConflict) {
               setPendingImportData(data);
               setConflictMode(true);
               return;
           }
      }

      executeImport(data);
  };

  const executeImport = (data: any) => {
      let importedCount = 0;
      
      // Handle Profiles
      if (data.profiles && Array.isArray(data.profiles)) {
          data.profiles.forEach((p: UserProfile) => {
              if (p && p.id) {
                  importProfile(p);
                  importedCount++;
              }
          });
      } else if (data.profile) {
          if (data.profile.id) {
              importProfile(data.profile);
              importedCount++;
          }
      }

      // Handle Matches
      if (data.matches && Array.isArray(data.matches)) {
          if (data.matches.length > 0) {
              importMatches(data.matches);
              importedCount++;
          }
      }

      if (importedCount > 0) {
          alert(t.syncSuccess);
          onSyncComplete();
          onClose();
      } else {
          setError(t.importError || "Invalid data format.");
      }
  };
  
  const handleExportBackup = () => {
      // If syncOnlyMatches is present, export ONLY those. Otherwise, do full backup.
      let data;
      let filename = 'football_diary_backup';
      const dateStr = new Date().toISOString().split('T')[0];

      if (syncOnlyMatches && syncOnlyMatches.length > 0) {
          // Partial Export
          const pName = profile?.name ? profile.name.replace(/\s+/g, '_') : 'Player';
          filename = `${pName}_SelectedMatches_${dateStr}`;
          
          data = {
              type: 'arthur_sync_v1',
              version: '1.0',
              timestamp: Date.now(),
              profile: profile, 
              matches: syncOnlyMatches
          };
      } else {
          // Full Backup
          const pName = profile?.name ? profile.name.replace(/\s+/g, '_') : 'Full';
          filename = `${pName}_Backup_${dateStr}`;
          data = getFullBackupData();
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Mark backup as done
      updateLastBackupDate();
      onSyncComplete(); // Trigger generic update to refresh sync status in parent
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setError('');
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              handleProcessData(json);
          } catch (err) {
              alert(t.importError);
          }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset input
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
            <h2 className="font-bold flex items-center gap-2">
                <i className="fas fa-save"></i> {syncOnlyMatches ? t.exportData : t.syncData}
            </h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">
                <i className="fas fa-times"></i>
            </button>
        </div>

        <div className="p-6">
            
            {conflictMode ? (
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center mx-auto text-2xl">
                        <i className="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">{t.syncConflictTitle}</h3>
                    <p className="text-slate-500 text-sm">{t.syncConflictDesc}</p>
                    
                    <div className="space-y-3 pt-4">
                        <button 
                            onClick={() => executeImport(pendingImportData)}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700"
                        >
                            {t.useIncoming}
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200"
                        >
                            {t.keepLocal}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                     <p className="text-sm text-slate-500 text-center mb-4">
                        {syncOnlyMatches 
                            ? t.fileBackupDesc 
                            : t.syncDesc}
                     </p>

                     {/* Export Button */}
                     <button onClick={handleExportBackup} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-blue-700 shadow-md transition-transform active:scale-95">
                         <i className="fas fa-file-download text-2xl"></i> 
                         <span>{t.exportData}</span>
                         <span className="text-[10px] opacity-70 font-normal">.json file</span>
                     </button>
                    
                    {!syncOnlyMatches && (
                        <div className="relative border-t border-slate-100 pt-6">
                            <button onClick={() => backupInputRef.current?.click()} className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-slate-50 transition-transform active:scale-95">
                                <i className="fas fa-file-upload text-2xl"></i> 
                                <span>{t.importData}</span>
                                <span className="text-[10px] opacity-70 font-normal">Restore from .json</span>
                            </button>
                            <input ref={backupInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportBackup} />
                        </div>
                    )}

                    {error && <div className="text-red-500 text-center text-xs font-bold bg-red-50 p-2 rounded">{error}</div>}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SyncModal;
