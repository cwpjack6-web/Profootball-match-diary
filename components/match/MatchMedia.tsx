
import React, { useState } from 'react';
import { VideoLink } from '../../types';

interface MatchMediaProps {
    formData: any;
    setFormData: (fn: (prev: any) => any) => void;
    handleChange: (e: any) => void;
    t: any;
    styles: any;
}

const MatchMedia: React.FC<MatchMediaProps> = ({ formData, setFormData, handleChange, t, styles }) => {
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTag, setNewVideoTag] = useState<'highlight' | 'goal' | 'assist' | 'full' | 'other'>('highlight');
  const [newVideoNote, setNewVideoNote] = useState('');

  const handleAddVideo = () => {
      if (!newVideoUrl) return;
      const newVideo: VideoLink = {
          id: Date.now().toString(),
          url: newVideoUrl,
          tag: newVideoTag,
          note: newVideoNote
      };
      setFormData((prev: any) => ({ ...prev, videos: [...prev.videos, newVideo] }));
      setNewVideoUrl('');
      setNewVideoNote('');
      setNewVideoTag('highlight');
  };

  const handleRemoveVideo = (id: string) => {
      setFormData((prev: any) => ({ ...prev, videos: prev.videos.filter((v: any) => v.id !== id) }));
  };

  const getTagLabel = (tag: string) => {
      switch(tag) {
          case 'highlight': return t.tagHighlight;
          case 'goal': return t.tagGoal;
          case 'assist': return t.tagAssist;
          case 'full': return t.tagFull;
          case 'other': return t.tagOther;
          default: return tag;
      }
  };

  return (
    <div className="space-y-4 pt-2">
        {/* Performance & MOTM */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-end mb-2">
                <label className="text-xs font-bold text-slate-400 uppercase">{t.performanceRating}</label>
                <span className={`text-2xl font-black ${styles.text}`}>{formData.rating}<span className="text-xs text-slate-300 font-normal ml-1">/ 10</span></span>
            </div>
            <input 
                type="range" 
                name="rating" 
                min="1" 
                max="10" 
                step="0.5"
                value={formData.rating} 
                onChange={handleChange}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-4"
            />
            
            {/* Man of the Match Toggle */}
            <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
                <div className="relative inline-block w-10 h-6 align-middle select-none transition duration-200 ease-in">
                <input 
                    type="checkbox" 
                    name="isMotm" 
                    id="motm-toggle" 
                    checked={formData.isMotm} 
                    onChange={handleChange}
                    className="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-4 appearance-none cursor-pointer peer checked:right-0 checked:border-green-400"
                    style={{ top: '4px', left: formData.isMotm ? '18px' : '2px', transition: 'all 0.2s' }}
                />
                <label htmlFor="motm-toggle" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors ${formData.isMotm ? 'bg-green-400' : 'bg-slate-300'}`}></label>
                </div>
                <label htmlFor="motm-toggle" className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1 cursor-pointer">
                <i className="fas fa-trophy text-yellow-500"></i> {t.manOfTheMatch}
                </label>
            </div>
        </div>

        <div>
            <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-400 uppercase">{t.dadCommentLabel}</label>
                <select 
                name="commenterIdentity"
                value={formData.commenterIdentity}
                onChange={handleChange}
                className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg text-xs px-2 py-1 font-bold text-slate-600 outline-none"
                >
                    <option value="Dad">{t.roleDad}</option>
                    <option value="Coach">{t.roleCoach}</option>
                    <option value="Mom">{t.roleMom}</option>
                    <option value="Other">{t.roleOther}</option>
                </select>
            </div>
            <textarea name="dadComment" rows={2} value={formData.dadComment} onChange={handleChange} placeholder={t.dadCommentPlaceholder} className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-3 text-sm resize-none" />
        </div>

        <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100 relative">
            <label className="text-xs font-bold text-indigo-400 uppercase mb-2 block">{t.interviewLabel}</label>
            <textarea 
                name="kidInterview" 
                rows={2} 
                value={formData.kidInterview} 
                onChange={handleChange} 
                placeholder={t.interviewPlaceholder}
                className="w-full bg-white text-slate-900 border border-indigo-100 rounded-lg p-2 text-sm resize-none" 
            />
        </div>

        {/* Video Management */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">{t.youtubeLabel}</label>
            
            <div className="space-y-2 mb-3">
                <input 
                type="url" 
                value={newVideoUrl} 
                onChange={(e) => setNewVideoUrl(e.target.value)} 
                placeholder={t.youtubePlaceholder} 
                className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2 text-sm" 
                />
                <div className="flex gap-2">
                <select 
                    value={newVideoTag}
                    onChange={(e) => setNewVideoTag(e.target.value as any)}
                    className="w-1/3 bg-white text-slate-900 border border-slate-200 rounded-lg p-2 text-sm"
                >
                    <option value="highlight">{t.tagHighlight}</option>
                    <option value="goal">{t.tagGoal}</option>
                    <option value="assist">{t.tagHighlight}</option>
                    <option value="full">{t.tagFull}</option>
                    <option value="other">{t.tagOther}</option>
                </select>
                <input 
                    type="text" 
                    value={newVideoNote} 
                    onChange={(e) => setNewVideoNote(e.target.value)} 
                    placeholder={t.videoNote} 
                    className="flex-1 bg-white text-slate-900 border border-slate-200 rounded-lg p-2 text-sm" 
                />
                </div>
                <button 
                type="button"
                onClick={handleAddVideo}
                disabled={!newVideoUrl}
                className="w-full bg-slate-800 text-white text-xs font-bold py-2 rounded-lg disabled:opacity-50 hover:bg-slate-700"
                >
                <i className="fas fa-plus mr-1"></i> {t.addVideo}
                </button>
            </div>

            {formData.videos.length > 0 && (
                <div className="space-y-2">
                {formData.videos.map((video: any) => (
                    <div key={video.id} className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-lg shadow-sm">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 
                                ${video.tag === 'goal' ? 'bg-emerald-100 text-emerald-700' : 
                                video.tag === 'assist' ? 'bg-indigo-100 text-indigo-700' : 
                                video.tag === 'highlight' ? 'bg-red-100 text-red-700' : 
                                'bg-slate-100 text-slate-600'}`}>
                                {getTagLabel(video.tag)}
                            </span>
                            <div className="flex flex-col truncate">
                                <a href={video.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate">{video.url}</a>
                                {video.note && <span className="text-[10px] text-slate-400 truncate">{video.note}</span>}
                            </div>
                        </div>
                        <button type="button" onClick={() => handleRemoveVideo(video.id)} className="text-slate-300 hover:text-red-500 px-2">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default MatchMedia;
