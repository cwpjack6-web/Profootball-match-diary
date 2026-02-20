import React, { useState, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';
import { MatchData, UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

interface GrowthStoryProps {
  profile: UserProfile;
  matches: MatchData[];
}

type StoryPeriod = 'all' | 'year' | 'season';

// ── Helpers ──────────────────────────────────────────────────────────────────

const buildStoryData = (matches: MatchData[], profile: UserProfile) => {
  const completed = matches.filter(m => m.status !== 'scheduled');
  if (completed.length === 0) return null;

  const sorted = [...completed].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const first = sorted[0];
  const last  = sorted[sorted.length - 1];

  // Basic stats
  const totalGoals   = completed.reduce((s, m) => s + (m.arthurGoals || 0), 0);
  const totalAssists = completed.reduce((s, m) => s + (m.arthurAssists || 0), 0);
  const totalMotm    = completed.filter(m => m.isMotm).length;
  const wins  = completed.filter(m => m.scoreMyTeam > m.scoreOpponent).length;
  const draws = completed.filter(m => m.scoreMyTeam === m.scoreOpponent).length;
  const losses = completed.filter(m => m.scoreMyTeam < m.scoreOpponent).length;
  const winRate = completed.length > 0 ? Math.round((wins / completed.length) * 100) : 0;

  // Ratings
  const rated = completed.filter(m => m.rating > 0);
  const avgRating = rated.length > 0
    ? (rated.reduce((s, m) => s + m.rating, 0) / rated.length).toFixed(1)
    : null;

  // Best match by composite score
  const peakMatch = completed.reduce((best, m) => {
    const score = (m.rating || 0) * 2 + (m.arthurGoals || 0) * 3 + (m.arthurAssists || 0) * 2 + (m.isMotm ? 5 : 0);
    const bestScore = (best?.rating || 0) * 2 + (best?.arthurGoals || 0) * 3 + (best?.arthurAssists || 0) * 2 + (best?.isMotm ? 5 : 0);
    return score > bestScore ? m : best;
  }, completed[0]);

  // Progress: first half vs second half avg rating
  const half = Math.floor(rated.length / 2);
  const earlyRatings = rated.slice(0, half);
  const recentRatings = rated.slice(half);
  const avgEarly  = half > 0 ? (earlyRatings.reduce((s, m) => s + m.rating, 0) / earlyRatings.length).toFixed(1) : null;
  const avgRecent = recentRatings.length > 0 ? (recentRatings.reduce((s, m) => s + m.rating, 0) / recentRatings.length).toFixed(1) : null;
  const ratingDiff = (avgEarly && avgRecent) ? (parseFloat(avgRecent) - parseFloat(avgEarly)).toFixed(1) : null;

  // Best streak
  let bestStreak = 0, cur = 0;
  sorted.forEach(m => {
    if (m.scoreMyTeam > m.scoreOpponent) { cur++; bestStreak = Math.max(bestStreak, cur); }
    else cur = 0;
  });

  // Conditions highlights
  const weatherGroups: Record<string, number[]> = {};
  completed.forEach(m => {
    if (!m.weather) return;
    if (!weatherGroups[m.weather]) weatherGroups[m.weather] = [];
    const isWin = m.scoreMyTeam > m.scoreOpponent ? 1 : 0;
    weatherGroups[m.weather].push(isWin);
  });
  const bestWeather = Object.entries(weatherGroups)
    .filter(([, arr]) => arr.length >= 2)
    .map(([key, arr]) => ({ key, winRate: Math.round((arr.reduce((a,b)=>a+b,0)/arr.length)*100), count: arr.length }))
    .sort((a, b) => b.winRate - a.winRate)[0] || null;

  // Comments/interviews for narrative richness
  const commentsWithContent = completed.filter(m => m.dadComment && m.dadComment.trim().length > 20);
  const interviewsWithContent = completed.filter(m => m.kidInterview && m.kidInterview.trim().length > 10);

  const hasRichData = commentsWithContent.length > 0 || interviewsWithContent.length > 0;

  return {
    totalMatches: completed.length,
    firstDate: first.date,
    lastDate: last.date,
    totalGoals,
    totalAssists,
    totalMotm,
    wins, draws, losses, winRate,
    avgRating,
    peakMatch,
    bestStreak,
    avgEarly,
    avgRecent,
    ratingDiff,
    bestWeather,
    hasRichData,
    commentsWithContent: commentsWithContent.slice(-3), // last 3 rich comments
    interviewsWithContent: interviewsWithContent.slice(-3),
    sorted,
  };
};

const buildPrompt = (data: ReturnType<typeof buildStoryData>, profile: UserProfile, period: StoryPeriod, language: 'zh' | 'en') => {
  if (!data) return '';

  const periodLabel = period === 'all' ? '全部記錄' : period === 'year' ? '今年' : '本季';

  const richComments = data.commentsWithContent.map(m =>
    `• ${m.date} vs ${m.opponent}: "${m.dadComment}"`
  ).join('\n');

  const richInterviews = data.interviewsWithContent.map(m =>
    `• ${m.date}: ${profile.name}說：「${m.kidInterview}」`
  ).join('\n');

  const peakM = data.peakMatch;

  const dataBlock = `
PLAYER: ${profile.name}
PERIOD: ${periodLabel} (${data.firstDate} → ${data.lastDate})
TOTAL MATCHES: ${data.totalMatches}
RECORD: ${data.wins}W ${data.draws}D ${data.losses}L (Win rate: ${data.winRate}%)
GOALS: ${data.totalGoals} | ASSISTS: ${data.totalAssists} | MOTM: ${data.totalMotm}x
AVG RATING: ${data.avgRating || 'N/A'}
BEST WIN STREAK: ${data.bestStreak} matches
RATING PROGRESSION: Early avg ${data.avgEarly || 'N/A'} → Recent avg ${data.avgRecent || 'N/A'} (change: ${data.ratingDiff ? (parseFloat(data.ratingDiff) > 0 ? '+' : '') + data.ratingDiff : 'N/A'})
PEAK MATCH: ${peakM.date} vs ${peakM.opponent} — ${peakM.scoreMyTeam}–${peakM.scoreOpponent}, ${peakM.arthurGoals}G ${peakM.arthurAssists}A, Rating ${peakM.rating}${peakM.isMotm ? ', MOTM' : ''}
${data.bestWeather ? `FAVOURITE CONDITIONS: ${data.bestWeather.key} (${data.bestWeather.winRate}% win rate over ${data.bestWeather.count} matches)` : ''}
${richComments ? `\nPARENT OBSERVATIONS:\n${richComments}` : ''}
${richInterviews ? `\nPLAYER'S OWN WORDS:\n${richInterviews}` : ''}
`;

  const langInstruction = language === 'zh'
    ? `Write entirely in Traditional Chinese (繁體中文). Use warm, natural Cantonese-style Chinese suitable for Hong Kong families. This is a letter from a loving parent TO their child, or a story ABOUT the child's journey — choose whichever feels more natural given the data.`
    : `Write in warm, personal English. This is a story about a child's football journey — written to be read by both parent and child.`;

  const systemInstruction = `
You are writing a "Growth Story" — a narrative account of a young football player's journey over a period of time.

This is NOT a coach's report. This is a story.

WHO WILL READ THIS:
A parent who has watched every match, recorded every goal, and wants to remember this chapter of their child's life. Possibly the child themselves.

YOUR TASK:
Read the data carefully. Find the narrative arc — the journey from the first match to the most recent. Look for:
- How the player has grown (statistically, or emotionally from comments)
- A standout moment that captures something essential about who this player is
- Something surprising or touching in the numbers or comments
- The emotional texture of this period — was it triumphant? resilient? quietly consistent?

WRITING STYLE:
- Warm, personal, slightly literary — like a family memoir, not a sports report
- Mix storytelling prose with occasional data highlights (in bold)
- 3–5 paragraphs. No headers needed. Flow naturally.
- End with a single sentence that looks forward — hopeful, not sentimental
- ${langInstruction}

IMPORTANT:
- Reference at least one specific match date and opponent
- If parent comments or player interviews exist, weave them in naturally — these are gold
- If data is thin (just scores), focus on the arc of results and what they suggest about character
- Never use hollow praise. Make every compliment specific and earned.
- Under 300 words total.
`;

  return { systemInstruction, prompt: dataBlock };
};

// ── Component ─────────────────────────────────────────────────────────────────

const GrowthStory: React.FC<GrowthStoryProps> = ({ profile, matches }) => {
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const [period, setPeriod] = useState<StoryPeriod>('all');
  const [story, setStory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const storyRef = useRef<HTMLDivElement>(null);

  // Filter matches by period
  const periodMatches = useMemo(() => {
    const completed = matches.filter(m => m.status !== 'scheduled');
    const now = new Date();
    if (period === 'year') {
      return completed.filter(m => new Date(m.date).getFullYear() === now.getFullYear());
    }
    if (period === 'season') {
      // Season = last 6 months
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 6);
      return completed.filter(m => new Date(m.date) >= cutoff);
    }
    return completed;
  }, [matches, period]);

  const storyData = useMemo(() => buildStoryData(periodMatches, profile), [periodMatches, profile]);

  const handleGenerate = async () => {
    if (!storyData) return;
    const built = buildPrompt(storyData, profile, period, language);
    if (!built) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(built),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed');
      setStory(data.text || '');
      showToast(language === 'zh' ? '成長故事已生成 ✓' : 'Growth story generated ✓', 'success');
    } catch (e: any) {
      showToast(e.message || 'Error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!storyRef.current) return;
    setIsDownloading(true);
    try {
      await new Promise(r => setTimeout(r, 100));
      const canvas = await html2canvas(storyRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `${profile.name}_GrowthStory_${period}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(language === 'zh' ? '已儲存圖片 ✓' : 'Image saved ✓', 'success');
    } catch {
      showToast('Failed to save image', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const periodLabel = (p: StoryPeriod) => {
    if (language === 'zh') {
      return p === 'all' ? '全部記錄' : p === 'year' ? `${new Date().getFullYear()}年` : '最近半年';
    }
    return p === 'all' ? 'All Time' : p === 'year' ? `${new Date().getFullYear()}` : 'Last 6 Months';
  };

  const ratingDiffNum = storyData?.ratingDiff ? parseFloat(storyData.ratingDiff) : 0;

  return (
    <div className="space-y-5">

      {/* Period selector */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-4">
        <div>
          <label className="text-xs font-black text-slate-400 uppercase block mb-2">
            {language === 'zh' ? '選擇時間範圍' : 'Select Period'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['all', 'year', 'season'] as StoryPeriod[]).map(p => (
              <button key={p} onClick={() => { setPeriod(p); setStory(null); }}
                className={`py-2 rounded-xl text-xs font-black border-2 transition-all ${period === p ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
                {periodLabel(p)}
              </button>
            ))}
          </div>
        </div>

        {/* Stats snapshot */}
        {storyData ? (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: language === 'zh' ? '場數' : 'Matches', value: storyData.totalMatches, color: 'text-slate-700' },
              { label: language === 'zh' ? '入球' : 'Goals',   value: storyData.totalGoals,   color: 'text-emerald-600' },
              { label: language === 'zh' ? '助攻' : 'Assists', value: storyData.totalAssists, color: 'text-indigo-600' },
              { label: language === 'zh' ? '勝率' : 'Win%',    value: `${storyData.winRate}%`, color: 'text-blue-600' },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
                <div className="text-[9px] text-slate-400 font-bold uppercase">{s.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-slate-400 text-sm">
            {language === 'zh' ? '呢個時期冇記錄' : 'No matches in this period'}
          </div>
        )}

        {/* Rating progress bar */}
        {storyData?.avgEarly && storyData?.avgRecent && (
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">
                {language === 'zh' ? '評分進步' : 'Rating Progress'}
              </span>
              <span className={`text-xs font-black ${ratingDiffNum > 0 ? 'text-emerald-600' : ratingDiffNum < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                {ratingDiffNum > 0 ? '▲' : ratingDiffNum < 0 ? '▼' : '─'} {Math.abs(ratingDiffNum)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
              <span className="text-slate-400">{language === 'zh' ? '早期' : 'Early'} {storyData.avgEarly}</span>
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${ratingDiffNum >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                  style={{ width: `${Math.min(100, (parseFloat(storyData.avgRecent) / 10) * 100)}%` }} />
              </div>
              <span className={ratingDiffNum > 0 ? 'text-emerald-600' : 'text-slate-500'}>
                {language === 'zh' ? '近期' : 'Recent'} {storyData.avgRecent}
              </span>
            </div>
          </div>
        )}

        {/* Data richness hint */}
        {storyData && !storyData.hasRichData && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            <i className="fas fa-lightbulb text-amber-400 text-xs mt-0.5" />
            <p className="text-[10px] text-amber-700 font-bold leading-snug">
              {language === 'zh'
                ? '加入比賽評語和仔仔訪問，故事會更豐富有溫度。'
                : 'Add match comments and player interviews to make the story richer.'}
            </p>
          </div>
        )}

        <button onClick={handleGenerate}
          disabled={isLoading || !storyData}
          className={`w-full py-4 rounded-xl font-black text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
            isLoading ? 'bg-slate-400' : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500'
          }`}>
          {isLoading
            ? <><i className="fas fa-spinner fa-spin" /> {language === 'zh' ? '正在撰寫故事…' : 'Writing story…'}</>
            : <><i className="fas fa-seedling" /> {story
                ? (language === 'zh' ? '重新生成' : 'Regenerate')
                : (language === 'zh' ? '生成成長故事' : 'Generate Growth Story')}</>
          }
        </button>
      </div>

      {/* Story card */}
      {story && (
        <div className="animate-fade-in">
          <div ref={storyRef} className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 relative">

            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-800 p-6 text-white relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-black/10 to-transparent" />
              <div className="relative z-10">
                <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">
                  {language === 'zh' ? '成長故事' : 'Growth Story'}
                </div>
                <h2 className="text-2xl font-black leading-tight">{profile.name}</h2>
                <div className="text-xs opacity-70 mt-1 font-bold">
                  {storyData!.firstDate} — {storyData!.lastDate}
                  <span className="mx-2">·</span>
                  {storyData!.totalMatches} {language === 'zh' ? '場' : 'matches'}
                </div>
              </div>
              {/* Emoji emblem */}
              <div className="absolute bottom-4 right-5 text-4xl opacity-20 select-none">⚽</div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
              {[
                { icon: 'fa-futbol',      val: storyData!.totalGoals,   label: language === 'zh' ? '入球' : 'Goals',   color: 'text-emerald-600' },
                { icon: 'fa-shoe-prints', val: storyData!.totalAssists, label: language === 'zh' ? '助攻' : 'Assists', color: 'text-indigo-500' },
                { icon: 'fa-trophy',      val: `${storyData!.winRate}%`,label: language === 'zh' ? '勝率' : 'Win%',    color: 'text-amber-500' },
                { icon: 'fa-star',        val: storyData!.avgRating || '—', label: language === 'zh' ? '平均評分' : 'Avg Rating', color: 'text-yellow-500' },
              ].map(s => (
                <div key={s.label} className="py-3 flex flex-col items-center gap-0.5">
                  <i className={`fas ${s.icon} text-xs ${s.color} opacity-60`} />
                  <span className={`text-base font-black ${s.color}`}>{s.val}</span>
                  <span className="text-[8px] text-slate-400 font-bold uppercase">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Narrative */}
            <div className="p-6 text-slate-700 text-sm leading-loose relative">
              <i className="fas fa-quote-left text-5xl text-slate-50 absolute top-4 left-3 -z-0 select-none" />
              <div className="relative z-10 prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    strong: ({node, ...props}) => <span className="font-black text-slate-900" {...props} />,
                    p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
                    em: ({node, ...props}) => <em className="text-slate-500 not-italic font-bold" {...props} />,
                  }}
                >
                  {story}
                </ReactMarkdown>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <i className="fas fa-book-open text-emerald-400 text-xs" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Match Diary</span>
              </div>
              <span className="text-[9px] text-slate-300 font-bold">{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {/* Download button */}
          <button onClick={handleDownload} disabled={isDownloading}
            className="mt-4 w-full py-4 bg-slate-800 text-white rounded-xl font-black shadow-lg hover:bg-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95">
            {isDownloading
              ? <><i className="fas fa-spinner fa-spin" /> {language === 'zh' ? '生成圖片中…' : 'Generating…'}</>
              : <><i className="fas fa-image" /> {language === 'zh' ? '儲存為圖片' : 'Save as Image'}</>
            }
          </button>
        </div>
      )}
    </div>
  );
};

export default GrowthStory;
