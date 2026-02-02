
import { TeamPattern } from '../types';

export const COLORS = [
  { name: 'Red', value: 'red', hex: '#ef4444', bg: 'bg-red-600', text: 'text-red-600', border: 'border-red-600', light: 'bg-red-50' },
  { name: 'Blue', value: 'blue', hex: '#3b82f6', bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600', light: 'bg-blue-50' },
  { name: 'Green', value: 'emerald', hex: '#10b981', bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-600', light: 'bg-emerald-50' },
  { name: 'Orange', value: 'orange', hex: '#f97316', bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500', light: 'bg-orange-50' },
  { name: 'Purple', value: 'purple', hex: '#8b5cf6', bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-600', light: 'bg-purple-50' },
  { name: 'Yellow', value: 'yellow', hex: '#eab308', bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-500', light: 'bg-yellow-50' },
  { name: 'Cyan', value: 'cyan', hex: '#06b6d4', bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-500', light: 'bg-cyan-50' },
  { name: 'Pink', value: 'pink', hex: '#ec4899', bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-pink-500', light: 'bg-pink-50' },
  { name: 'Navy', value: 'indigo', hex: '#4338ca', bg: 'bg-indigo-700', text: 'text-indigo-700', border: 'border-indigo-700', light: 'bg-indigo-50' },
  { name: 'Black', value: 'slate', hex: '#1e293b', bg: 'bg-slate-800', text: 'text-slate-800', border: 'border-slate-800', light: 'bg-slate-100' },
  { name: 'White', value: 'white', hex: '#ffffff', bg: 'bg-white', text: 'text-slate-600', border: 'border-slate-300', light: 'bg-slate-50' },
];

export const getTeamColorStyles = (colorValue: string) => {
  const color = COLORS.find(c => c.value === colorValue) || COLORS[1]; // Default to Blue
  
  if (color.value === 'white') {
    return {
      bg: 'bg-white border border-slate-200',
      text: 'text-slate-800',
      activeText: 'text-slate-900', // Dark text when active
      headerText: 'text-slate-800',
      headerBg: 'bg-white border-b border-slate-200',
      badge: 'bg-white border border-slate-300 text-slate-600',
      gradient: 'from-slate-100 to-white border border-slate-200',
      button: 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-50',
      light: 'bg-slate-50',
      hex: '#ffffff'
    };
  }

  return {
    bg: color.bg,
    text: color.text,
    activeText: 'text-white', // White text when active for colors
    headerText: 'text-white',
    headerBg: color.bg,
    badge: `${color.light} ${color.text}`,
    gradient: `from-${colorValue}-600 to-${colorValue}-800`,
    button: `${color.bg} text-white hover:opacity-90`,
    light: color.light,
    hex: color.hex
  };
};

export const getTeamById = (teams: any[], id: string) => {
  return teams.find(t => t.id === id) || teams[0];
};

export const generateJerseyGradient = (pattern: TeamPattern, primary: string, secondary?: string) => {
    const c1 = COLORS.find(c => c.value === primary)?.hex || '#3b82f6';
    const c2 = COLORS.find(c => c.value === secondary)?.hex || '#ffffff';

    if (pattern === 'vertical') {
        return `repeating-linear-gradient(90deg, ${c1}, ${c1} 10px, ${c2} 10px, ${c2} 20px)`;
    }
    if (pattern === 'horizontal') {
        return `repeating-linear-gradient(0deg, ${c1}, ${c1} 10px, ${c2} 10px, ${c2} 20px)`;
    }
    return c1; // Solid
};
