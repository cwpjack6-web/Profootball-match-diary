
import React from 'react';
import { VideoModalProps } from '../types';
import { getEmbedUrl } from '../utils/youtube';
import { useLanguage } from '../context/LanguageContext';

const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, videoId }) => {
  const { t } = useLanguage();

  if (!isOpen || !videoId) return null;

  const handleOpenYoutube = () => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-4xl bg-black rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10 flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-3 bg-zinc-900 border-b border-zinc-800">
          <h3 className="text-white font-medium text-sm flex items-center gap-2">
            <i className="fab fa-youtube text-red-600"></i> {t.videoTitle}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* Video Container (16:9 Aspect Ratio) */}
        <div className="relative pt-[56.25%] bg-black">
           <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={getEmbedUrl(videoId)}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
        </div>

        {/* Fallback Footer - Essential for Error 153 */}
        <div className="bg-zinc-900 p-3 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-zinc-800">
           <span className="text-zinc-500 text-xs text-center sm:text-left flex-1">
             <i className="fas fa-exclamation-triangle mr-1 text-yellow-600"></i>
             {t.videoError153}
           </span>
           <button 
             onClick={handleOpenYoutube}
             className="text-white text-xs bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded flex items-center gap-2 transition-colors whitespace-nowrap"
           >
             <i className="fas fa-external-link-alt"></i> {t.openInYoutube}
           </button>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;
