/**
 * TournamentEditModal.tsx
 * Edits shared tournament-level fields (pitch, weather, tournamentStartTime, tournamentEndTime)
 * and syncs them across all games in the tournament.
 * Individual game matchTime stays independent.
 */

import React, { useState, useEffect } from 'react';
import { MatchData } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface TournamentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentName: string;
  matches: MatchData[];               // all games in this tournament
  onSave: (updates: Partial<MatchData>) => void;  // called once, applied to all games
}

const TournamentEditModal: React.FC<TournamentEditModalProps> = ({
  isOpen, onClose, tournamentName, matches, onSave,
}) => {
  const { language } = useLanguage();

  const first = matches[0];

  const [pitchType,           setPitchType]           = useState(first?.pitchType || '');
  const [weather,             setWeather]             = useState(first?.weather || '');
  const [tournamentStartTime, setTournamentStartTime] = useState(first?.tournamentStartTime || '');
  const [tournamentEndTime,   setTournamentEndTime]   = useState(first?.tournamentEndTime || '');

  // Reset when modal opens with new data
  useEffect(() => {
    if (isOpen && first) {
      setPitchType(first.pitchType || '');
      setWeather(first.weather || '');
      setTournamentStartTime(first.tournamentStartTime || '');
      setTournamentEndTime(first.tournamentEndTime || '');
    }
  }, [isOpen, tournamentName]);

  if (!isOpen) return null;

  const zh = language === 'zh';

  const pitchOptions = [
    { value: 'turf',       label: zh ? '天然草' : 'Natural Turf' },
    { value: 'artificial', label: zh ? '仿真草' : 'Astroturf' },
    { value: 'hard',       label: zh ? '硬地' : 'Hard Court' },
    { value: 'indoor',     label: zh ? '室內' : 'Indoor' },
    { value: 'other',      label: zh ? '其他' : 'Other' },
  ];

  const weatherOptions = [
    { value: 'sunny',  icon: 'fa-sun',              label: zh ? '晴天' : 'Sunny' },
    { value: 'cloudy', icon: 'fa-cloud',             label: zh ? '多雲' : 'Cloudy' },
    { value: 'rain',   icon: 'fa-cloud-rain',        label: zh ? '落雨' : 'Rainy' },
    { value: 'windy',  icon: 'fa-wind',              label: zh ? '有風' : 'Windy' },
    { value: 'hot',    icon: 'fa-temperature-high',  label: zh ? '炎熱' : 'Hot' },
    { value: 'night',  icon: 'fa-moon',              label: zh ? '夜場' : 'Night' },
  ];

  const handleSave = () => {
    onSave({
      pitchType: pitchType || undefined,
      weather: weather || undefined,
      tournamentStartTime: tournamentStartTime || undefined,
      tournamentEndTime: tournamentEndTime || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-t-2xl shadow-2xl p-5 space-y-5"
        onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center -mt-1 mb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <i className="fas fa-trophy text-amber-500" />
              <h3 className="font-black text-slate-800 text-base">{tournamentName}</h3>
            </div>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              {zh
                ? `將同步到全部 ${matches.length} 場比賽`
                : `Syncs to all ${matches.length} games`}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <i className="fas fa-times text-sm" />
          </button>
        </div>

        {/* Tournament time range */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">
            {zh ? '整個賽事時間' : 'Tournament Time Range'}
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <p className="text-[9px] text-slate-400 font-bold mb-1">{zh ? '開始' : 'Start'}</p>
              <input
                type="time"
                value={tournamentStartTime}
                onChange={e => setTournamentStartTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-400 text-slate-800"
              />
            </div>
            <div className="text-slate-300 font-bold mt-5">→</div>
            <div className="flex-1">
              <p className="text-[9px] text-slate-400 font-bold mb-1">{zh ? '結束' : 'End'}</p>
              <input
                type="time"
                value={tournamentEndTime}
                onChange={e => setTournamentEndTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-400 text-slate-800"
              />
            </div>
          </div>
          <p className="text-[9px] text-slate-400 mt-1.5">
            {zh
              ? '每場比賽嘅個別開始時間請喺各 Game 戰報卡入面編輯'
              : 'Individual game start times can be set in each Game card'}
          </p>
        </div>

        {/* Pitch type */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">
            {zh ? '草地性質' : 'Pitch Type'}
          </label>
          <div className="flex flex-wrap gap-2">
            {pitchOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPitchType(pitchType === opt.value ? '' : opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                  pitchType === opt.value
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Weather */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">
            {zh ? '天氣' : 'Weather'}
          </label>
          <div className="flex flex-wrap gap-2">
            {weatherOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setWeather(weather === opt.value ? '' : opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                  weather === opt.value
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                <i className={`fas ${opt.icon} text-[10px]`} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full py-4 bg-amber-500 text-white font-black rounded-xl shadow-lg hover:bg-amber-600 active:bg-amber-700 transition-colors flex items-center justify-center gap-2"
        >
          <i className="fas fa-save" />
          {zh ? `儲存並同步到 ${matches.length} 場` : `Save & sync to ${matches.length} games`}
        </button>

      </div>
    </div>
  );
};

export default TournamentEditModal;
