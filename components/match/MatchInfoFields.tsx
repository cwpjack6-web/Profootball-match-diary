
import React from 'react';
import { MatchType, PitchType, WeatherType, MatchFormat, MatchStructure } from '../../types';

interface MatchInfoFieldsProps {
    formData: any;
    setFormData: (fn: (prev: any) => any) => void;
    handleChange: (e: any) => void;
    t: any;
    styles: any;
    isFixtureMode: boolean;
    opponentOptions: string[];
    h2hStats: any;
    adjustPeriods: (delta: number) => void;
    setMatchStructure: (s: MatchStructure) => void;
    togglePosition: (pos: string) => void;
}

const MatchInfoFields: React.FC<MatchInfoFieldsProps> = ({
    formData, setFormData, handleChange, t, styles, isFixtureMode, opponentOptions, h2hStats, adjustPeriods, setMatchStructure, togglePosition
}) => {
  const AVAILABLE_FORMATS: MatchFormat[] = ['5v5', '6v6', '7v7', '8v8', '9v9', '11v11'];
  const POSITIONS = ['FW', 'LW', 'RW', 'MF', 'DF', 'GK'];

  return (
    <div className="space-y-3">
        <div className="flex gap-3">
        <div className="flex-1">
            <label className="text-xs font-bold text-slate-400 uppercase">{t.date}</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2 text-sm" />
        </div>
        <div className="w-1/3">
            <label className="text-xs font-bold text-slate-400 uppercase">{t.home}/{t.away}</label>
            <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                <button type="button" onClick={() => setFormData((p:any) => ({...p, isHome: true}))} className={`flex-1 text-xs py-1.5 rounded ${formData.isHome ? styles.badge + ' font-bold' : 'text-slate-400'}`}>{t.homeShort}</button>
                <button type="button" onClick={() => setFormData((p:any) => ({...p, isHome: false}))} className={`flex-1 text-xs py-1.5 rounded ${!formData.isHome ? 'bg-slate-200 text-slate-700 font-bold' : 'text-slate-400'}`}>{t.awayShort}</button>
            </div>
        </div>
        </div>

        {/* Time Setup */}
        <div className="flex gap-3">
        <div className="flex-1">
            <label className="text-xs font-bold text-slate-400 uppercase">{t.assemblyTime}</label>
            <input type="time" name="assemblyTime" value={formData.assemblyTime} onChange={handleChange} className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2 text-sm" />
        </div>
        <div className="flex-1">
            <label className="text-xs font-bold text-slate-400 uppercase">{t.matchTime}</label>
            <input type="time" name="matchTime" value={formData.matchTime} onChange={handleChange} className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2 text-sm" />
        </div>
        </div>

        {/* Match Type */}
        <div>
        <label className="text-xs font-bold text-slate-400 uppercase">{t.matchType}</label>
        <div className="flex bg-white rounded-lg border border-slate-200 p-1 mt-1">
            <button type="button" onClick={() => setFormData((p:any) => ({...p, matchType: 'league'}))} className={`flex-1 text-xs py-1.5 rounded ${formData.matchType === 'league' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-400'}`}>{t.typeLeague}</button>
            <button type="button" onClick={() => setFormData((p:any) => ({...p, matchType: 'cup'}))} className={`flex-1 text-xs py-1.5 rounded ${formData.matchType === 'cup' ? 'bg-purple-100 text-purple-700 font-bold' : 'text-slate-400'}`}>{t.typeCup}</button>
            <button type="button" onClick={() => setFormData((p:any) => ({...p, matchType: 'friendly'}))} className={`flex-1 text-xs py-1.5 rounded ${formData.matchType === 'friendly' ? 'bg-emerald-100 text-emerald-700 font-bold' : 'text-slate-400'}`}>{t.typeFriendly}</button>
        </div>
        </div>

        <div className="flex gap-3 relative">
        <div className="flex-1 relative">
            <label className="text-xs font-bold text-slate-400 uppercase">{t.opponentName}</label>
            <input 
                required 
                type="text" 
                name="opponent" 
                list="opponent-list" 
                placeholder={t.opponentPlaceholder} 
                value={formData.opponent} 
                onChange={handleChange} 
                className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2 text-sm" 
            />
            <datalist id="opponent-list">
                {opponentOptions.map(op => <option key={op} value={op} />)}
            </datalist>
            {!isFixtureMode && h2hStats && (
                <div className="absolute top-0 right-0 -mt-1 bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded font-bold border border-blue-100 flex gap-2">
                    <span>{t.h2h}:</span>
                    <span className="text-emerald-600">{h2hStats.w}{t.win}</span>
                    <span className="text-slate-500">{h2hStats.d}{t.draw}</span>
                    <span className="text-rose-600">{h2hStats.l}{t.loss}</span>
                </div>
            )}
        </div>
        <div className="flex-1">
            <label className="text-xs font-bold text-slate-400 uppercase">{t.location}</label>
            <input type="text" name="location" placeholder={t.locationPlaceholder} value={formData.location} onChange={handleChange} className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2 text-sm" />
        </div>
        </div>

        {/* Format & Structure */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
            <label className="text-xs font-bold text-slate-400 uppercase">{t.matchFormat}</label>
            <div className="flex gap-2 mt-1 overflow-x-auto no-scrollbar pb-1">
                {AVAILABLE_FORMATS.map(fmt => (
                    <button
                        type="button"
                        key={fmt}
                        onClick={() => setFormData((p:any) => ({...p, matchFormat: fmt}))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap transition-all ${formData.matchFormat === fmt ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                    >
                        {fmt}
                    </button>
                ))}
            </div>
            </div>

            <div className="flex gap-3">
                <div className="flex-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">{t.matchStructure}</label>
                    <div className="flex bg-white rounded-lg border border-slate-200 p-1 mt-1">
                    <button type="button" onClick={() => setMatchStructure('quarters')} className={`flex-1 text-[10px] py-1.5 rounded ${formData.matchStructure === 'quarters' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-400'}`}>{t.structQuarters}</button>
                    <button type="button" onClick={() => setMatchStructure('halves')} className={`flex-1 text-[10px] py-1.5 rounded ${formData.matchStructure === 'halves' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-400'}`}>{t.structHalves}</button>
                    </div>
                </div>
                <div className="flex-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">{t.periodsPlayed}</label>
                    <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-2 py-1 mt-1">
                        <button type="button" onClick={() => adjustPeriods(-0.5)} className="w-6 h-6 bg-slate-100 rounded text-slate-500 hover:bg-slate-200 flex items-center justify-center"><i className="fas fa-minus text-[10px]"></i></button>
                        <span className="font-black text-slate-800 text-sm">{formData.periodsPlayed} <span className="text-[9px] text-slate-400 font-normal">{t.unitPeriod}</span></span>
                        <button type="button" onClick={() => adjustPeriods(0.5)} className="w-6 h-6 bg-slate-100 rounded text-slate-500 hover:bg-slate-200 flex items-center justify-center"><i className="fas fa-plus text-[10px]"></i></button>
                    </div>
                </div>
            </div>
        </div>

        {/* Context Fields */}
        <div>
        <label className="text-xs font-bold text-slate-400 uppercase">{t.positionPlayed}</label>
        <div className="flex flex-wrap gap-2 mt-1">
            {POSITIONS.map(pos => {
                const isSelected = formData.positionPlayed?.includes(pos);
                return (
                    <button
                        type="button"
                        key={pos}
                        onClick={() => togglePosition(pos)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isSelected ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                    >
                        {pos}
                    </button>
                );
            })}
        </div>
        </div>

        <div className="flex gap-3">
            <div className="w-1/2">
            <label className="text-xs font-bold text-slate-400 uppercase">{t.pitchType}</label>
            <select 
                name="pitchType" 
                value={formData.pitchType} 
                onChange={handleChange} 
                className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2 text-sm outline-none"
            >
                <option value="">-</option>
                <option value="turf">{t.pitchTurf}</option>
                <option value="artificial">{t.pitchArtificial}</option>
                <option value="hard">{t.pitchHard}</option>
                <option value="indoor">{t.pitchIndoor}</option>
                <option value="other">{t.pitchOther}</option>
            </select>
            </div>
            <div className="w-1/2">
            <label className="text-xs font-bold text-slate-400 uppercase">{t.weather}</label>
            <select 
                name="weather" 
                value={formData.weather} 
                onChange={handleChange} 
                className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2 text-sm outline-none"
            >
                <option value="">-</option>
                <option value="sunny">{t.weatherSunny}</option>
                <option value="rain">{t.weatherRain}</option>
                <option value="cloudy">{t.weatherCloudy}</option>
                <option value="night">{t.weatherNight}</option>
                <option value="hot">{t.weatherHot}</option>
                <option value="windy">{t.weatherWindy}</option>
            </select>
            </div>
        </div>
    </div>
  );
};

export default MatchInfoFields;
