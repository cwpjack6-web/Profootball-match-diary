
import { TeamPattern } from '../types';

export const COLORS = [
  // Primary
  { name: 'Red', value: 'red', hex: '#ef4444', bg: 'bg-red-600', text: 'text-red-600', border: 'border-red-600', light: 'bg-red-50' },
  { name: 'Crimson', value: 'crimson', hex: '#be123c', bg: 'bg-rose-700', text: 'text-rose-700', border: 'border-rose-700', light: 'bg-rose-50' },
  { name: 'Claret', value: 'claret', hex: '#831843', bg: 'bg-pink-900', text: 'text-pink-900', border: 'border-pink-900', light: 'bg-pink-50' },
  { name: 'Blue', value: 'blue', hex: '#3b82f6', bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600', light: 'bg-blue-50' },
  { name: 'Sky Blue', value: 'sky', hex: '#0ea5e9', bg: 'bg-sky-500', text: 'text-sky-500', border: 'border-sky-500', light: 'bg-sky-50' },
  { name: 'Navy', value: 'navy', hex: '#1e3a8a', bg: 'bg-blue-900', text: 'text-blue-900', border: 'border-blue-900', light: 'bg-blue-50' },
  { name: 'Green', value: 'emerald', hex: '#10b981', bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-600', light: 'bg-emerald-50' },
  { name: 'Forest', value: 'forest', hex: '#14532d', bg: 'bg-green-900', text: 'text-green-900', border: 'border-green-900', light: 'bg-green-50' },
  { name: 'Mint', value: 'mint', hex: '#34d399', bg: 'bg-emerald-400', text: 'text-emerald-500', border: 'border-emerald-400', light: 'bg-emerald-50' },
  { name: 'Orange', value: 'orange', hex: '#f97316', bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500', light: 'bg-orange-50' },
  { name: 'Purple', value: 'purple', hex: '#8b5cf6', bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-600', light: 'bg-purple-50' },
  { name: 'Yellow', value: 'yellow', hex: '#eab308', bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-500', light: 'bg-yellow-50' },
  { name: 'Gold', value: 'gold', hex: '#d97706', bg: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-600', light: 'bg-amber-50' },
  { name: 'Cyan', value: 'cyan', hex: '#06b6d4', bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-500', light: 'bg-cyan-50' },
  { name: 'Pink', value: 'pink', hex: '#ec4899', bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-pink-500', light: 'bg-pink-50' },
  { name: 'Black', value: 'slate', hex: '#1e293b', bg: 'bg-slate-800', text: 'text-slate-800', border: 'border-slate-800', light: 'bg-slate-100' },
  { name: 'White', value: 'white', hex: '#ffffff', bg: 'bg-white', text: 'text-slate-600', border: 'border-slate-300', light: 'bg-slate-50' },
];

const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

const getClosestColor = (hex: string) => {
    const targetRgb = hexToRgb(hex);
    if (!targetRgb) return COLORS[1]; // Default to Blue

    let closestColor = COLORS[1];
    let minDistance = Infinity;

    for (const color of COLORS) {
        const rgb = hexToRgb(color.hex);
        if (!rgb) continue;
        
        // Euclidean distance
        const distance = Math.sqrt(
            Math.pow(targetRgb.r - rgb.r, 2) +
            Math.pow(targetRgb.g - rgb.g, 2) +
            Math.pow(targetRgb.b - rgb.b, 2)
        );

        if (distance < minDistance) {
            minDistance = distance;
            closestColor = color;
        }
    }
    return closestColor;
};

export const getTeamColorStyles = (colorValue: string) => {
  const isHex = colorValue.startsWith('#');
  const baseColor = isHex ? getClosestColor(colorValue) : (COLORS.find(c => c.value === colorValue) || COLORS[1]);
  
  if (baseColor.value === 'white') {
    return {
      bg: 'bg-white border border-slate-200',
      text: 'text-slate-800',
      activeText: 'text-slate-900',
      headerText: 'text-slate-800',
      headerBg: 'bg-white border-b border-slate-200',
      headerButton: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200',
      badge: 'bg-white border border-slate-300 text-slate-600',
      gradient: 'from-slate-100 to-white border border-slate-200',
      button: 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-50',
      light: 'bg-slate-50',
      hex: isHex ? colorValue : baseColor.hex
    };
  }

  return {
    bg: baseColor.bg,
    text: baseColor.text,
    activeText: 'text-white',
    headerText: 'text-white',
    headerBg: baseColor.bg,
    headerButton: 'bg-white/20 hover:bg-white/30 text-white border border-transparent',
    badge: `${baseColor.light} ${baseColor.text}`,
    gradient: `from-${baseColor.value}-600 to-${baseColor.value}-800`,
    button: `${baseColor.bg} text-white hover:opacity-90`,
    light: baseColor.light,
    hex: isHex ? colorValue : baseColor.hex
  };
};

export const getTeamById = (teams: any[], id: string) => {
  return teams.find(t => t.id === id) || teams[0];
};

export const generateJerseyGradient = (pattern: TeamPattern, primary: string, secondary?: string) => {
    // Check if primary/secondary are hex codes directly
    const p1 = primary.startsWith('#') ? primary : (COLORS.find(c => c.value === primary)?.hex || '#3b82f6');
    const p2 = secondary ? (secondary.startsWith('#') ? secondary : (COLORS.find(c => c.value === secondary)?.hex || '#ffffff')) : '#ffffff';

    if (pattern === 'vertical') {
        return `repeating-linear-gradient(90deg, ${p1}, ${p1} 12px, ${p2} 12px, ${p2} 24px)`;
    }
    if (pattern === 'horizontal') {
        return `repeating-linear-gradient(0deg, ${p1}, ${p1} 12px, ${p2} 12px, ${p2} 24px)`;
    }
    return p1; // Solid
};
