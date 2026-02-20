import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

interface Step {
  icon: string;
  iconBg: string;
  titleZh: string;
  titleEn: string;
  descZh: string;
  descEn: string;
  tipZh?: string;
  tipEn?: string;
}

const STEPS: Step[] = [
  {
    icon: 'fa-futbol',
    iconBg: 'bg-blue-500',
    titleZh: '歡迎使用球賽日記',
    titleEn: 'Welcome to Match Diary',
    descZh: '一個專為足球家長而設的記錄工具。幫你記住阿仔每一場比賽的點滴，唔再搞亂、唔再忘記。',
    descEn: 'A record-keeping tool made for football parents. Remember every match, every goal, every moment — clearly and easily.',
    tipZh: '只需 3 步，即可開始使用 ⚽',
    tipEn: 'Just 3 steps to get started ⚽',
  },
  {
    icon: 'fa-user-circle',
    iconBg: 'bg-emerald-500',
    titleZh: '建立你個仔的檔案',
    titleEn: "Set up your child's profile",
    descZh: '輸入阿仔的名字，加入所屬球隊。之後所有比賽記錄都會自動整理好。',
    descEn: "Enter your child's name and add their team. All match records will be organised automatically.",
    tipZh: '💡 可以加入多個球隊，例如學校隊 + 會隊',
    tipEn: '💡 You can add multiple teams — school team, club team, etc.',
  },
  {
    icon: 'fa-plus-circle',
    iconBg: 'bg-amber-500',
    titleZh: '記錄第一場比賽',
    titleEn: 'Log your first match',
    descZh: '撳「+」號新增比賽。只需填入對手、比數，其他細節隨時可以補充。\n\n比賽進行中？用「⚡快速記錄」逐節記低重點。',
    descEn: 'Tap "+" to add a match. Just enter the opponent and score — you can add details later.\n\nMid-match? Use "⚡ Quick Log" to record notes between periods.',
    tipZh: '📊 記錄越多，數據分析越準確',
    tipEn: '📊 The more you log, the richer your insights',
  },
  {
    icon: 'fa-chart-line',
    iconBg: 'bg-violet-500',
    titleZh: '分析 · 回顧 · 分享',
    titleEn: 'Analyse · Review · Share',
    descZh: '「數據」頁面會自動整理勝率、進球趨勢、主客場表現等等。\n\n「教練」頁面可以生成 AI 月度報告同成長故事，一鍵儲存圖片。',
    descEn: 'The "Stats" tab automatically tracks win rates, goal trends, home vs away performance, and more.\n\nThe "Coach" tab generates AI monthly reports and growth stories — save as an image in one tap.',
    tipZh: '準備好了，開始記錄吧 🚀',
    tipEn: "You're all set. Let's get started 🚀",
  },
];

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const { language } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => onComplete();

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-end bg-gradient-to-b from-slate-900/80 to-slate-900/95 backdrop-blur-sm">
      <style>{`@keyframes slideUpFade { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

      {/* Card */}
      <div
        key={currentStep}
        className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'slideUpFade 0.35s cubic-bezier(0.32,0.72,0,1)' }}
      >
        {/* Progress bar */}
        <div className="h-1 bg-slate-100 w-full shrink-0">
          <div
            className="h-full bg-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="px-6 pt-8 pb-4 flex flex-col items-center text-center">

          {/* Icon */}
          <div className={`w-20 h-20 rounded-2xl ${step.iconBg} flex items-center justify-center shadow-lg mb-5`}>
            <i className={`fas ${step.icon} text-3xl text-white`} />
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <div key={i} className={`rounded-full transition-all duration-300 ${
                i === currentStep ? 'w-5 h-2 bg-blue-500' :
                i < currentStep  ? 'w-2 h-2 bg-blue-200' :
                                   'w-2 h-2 bg-slate-200'
              }`} />
            ))}
          </div>

          {/* Title */}
          <h2 className="text-xl font-black text-slate-800 mb-3 leading-tight">
            {language === 'zh' ? step.titleZh : step.titleEn}
          </h2>

          {/* Description */}
          <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line mb-4">
            {language === 'zh' ? step.descZh : step.descEn}
          </p>

          {/* Tip pill */}
          {(step.tipZh || step.tipEn) && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 w-full">
              <p className="text-xs text-blue-700 font-bold text-center">
                {language === 'zh' ? step.tipZh : step.tipEn}
              </p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="px-6 pb-8 pt-2 flex flex-col gap-2">
          <button
            onClick={handleNext}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            {isLast
              ? (language === 'zh' ? '開始使用 🚀' : 'Get Started 🚀')
              : (language === 'zh' ? '下一步' : 'Next')}
            {!isLast && <i className="fas fa-arrow-right text-xs" />}
          </button>

          {!isLast && (
            <button
              onClick={handleSkip}
              className="w-full py-3 text-slate-400 text-xs font-bold"
            >
              {language === 'zh' ? '略過指引' : 'Skip intro'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
