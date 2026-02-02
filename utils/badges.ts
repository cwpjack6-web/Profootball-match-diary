
import { MatchData } from '../types';

export type BadgeTier = 'locked' | 'bronze' | 'silver' | 'gold' | 'diamond';

export interface BadgeDefinition {
    id: string;
    icon: string;
    labelKey: string;
    descriptionKey: string;
    tiers: {
        bronze: number;
        silver: number;
        gold: number;
        diamond: number;
    };
}

export interface BadgeState extends BadgeDefinition {
    currentTier: BadgeTier;
    nextTier: BadgeTier | null;
    currentValue: number;
    nextThreshold: number;
    progressPercent: number;
    color: string;
    levelIndex: number; // 0=locked, 1=bronze, 2=silver, 3=gold, 4=diamond
}

// Define the tiered goals
const BADGE_CONFIGS: BadgeDefinition[] = [
    {
        id: 'goals',
        icon: 'fa-futbol',
        labelKey: 'badgeGoalMachine',
        descriptionKey: 'badgeGoalMachineDesc',
        tiers: { bronze: 3, silver: 10, gold: 25, diamond: 50 }
    },
    {
        id: 'assists',
        icon: 'fa-shoe-prints',
        labelKey: 'badgePlaymaker',
        descriptionKey: 'badgePlaymakerDesc',
        tiers: { bronze: 3, silver: 10, gold: 25, diamond: 50 }
    },
    {
        id: 'matches',
        icon: 'fa-dumbbell',
        labelKey: 'badgeIronMan',
        descriptionKey: 'badgeIronManDesc',
        tiers: { bronze: 5, silver: 15, gold: 30, diamond: 60 }
    },
    {
        id: 'motm',
        icon: 'fa-trophy',
        labelKey: 'badgeStar',
        descriptionKey: 'badgeStarDesc',
        tiers: { bronze: 1, silver: 3, gold: 5, diamond: 10 }
    },
    {
        id: 'cleansheet',
        icon: 'fa-shield-alt',
        labelKey: 'badgeWall',
        descriptionKey: 'badgeWallDesc',
        tiers: { bronze: 1, silver: 5, gold: 10, diamond: 20 }
    },
    {
        id: 'hattrick',
        icon: 'fa-hat-wizard',
        labelKey: 'badgeHattrick',
        descriptionKey: 'badgeHattrickDesc',
        tiers: { bronze: 1, silver: 2, gold: 3, diamond: 5 }
    }
];

const TIER_COLORS = {
    locked: 'bg-slate-50 border-slate-200 text-slate-300',
    bronze: 'bg-orange-50 border-orange-200 text-orange-700',
    silver: 'bg-slate-100 border-slate-300 text-slate-600',
    gold: 'bg-yellow-50 border-yellow-300 text-yellow-700',
    diamond: 'bg-cyan-50 border-cyan-300 text-cyan-700'
};

const TIER_LABELS_KEY = {
    locked: 'locked',
    bronze: 'levelBronze',
    silver: 'levelSilver',
    gold: 'levelGold',
    diamond: 'levelDiamond'
};

export const getTierLabelKey = (tier: BadgeTier) => TIER_LABELS_KEY[tier];

export const calculateBadges = (matches: MatchData[]): { badges: BadgeState[], totalLevel: number, maxLevel: number } => {
    
    // 1. Calculate base stats
    const totalGoals = matches.reduce((acc, m) => acc + m.arthurGoals, 0);
    const totalAssists = matches.reduce((acc, m) => acc + m.arthurAssists, 0);
    const totalMatches = matches.length;
    const totalMotm = matches.filter(m => m.isMotm).length;
    const totalCleanSheets = matches.filter(m => m.scoreOpponent === 0).length;
    const totalHattricks = matches.filter(m => m.arthurGoals >= 3).length;

    // 2. Map config to state
    const badges: BadgeState[] = BADGE_CONFIGS.map(config => {
        let currentValue = 0;
        switch(config.id) {
            case 'goals': currentValue = totalGoals; break;
            case 'assists': currentValue = totalAssists; break;
            case 'matches': currentValue = totalMatches; break;
            case 'motm': currentValue = totalMotm; break;
            case 'cleansheet': currentValue = totalCleanSheets; break;
            case 'hattrick': currentValue = totalHattricks; break;
        }

        // Determine Tier
        let currentTier: BadgeTier = 'locked';
        let nextTier: BadgeTier | null = 'bronze';
        let nextThreshold = config.tiers.bronze;
        let levelIndex = 0;

        if (currentValue >= config.tiers.diamond) {
            currentTier = 'diamond';
            nextTier = null;
            nextThreshold = config.tiers.diamond; // Cap at max
            levelIndex = 4;
        } else if (currentValue >= config.tiers.gold) {
            currentTier = 'gold';
            nextTier = 'diamond';
            nextThreshold = config.tiers.diamond;
            levelIndex = 3;
        } else if (currentValue >= config.tiers.silver) {
            currentTier = 'silver';
            nextTier = 'gold';
            nextThreshold = config.tiers.gold;
            levelIndex = 2;
        } else if (currentValue >= config.tiers.bronze) {
            currentTier = 'bronze';
            nextTier = 'silver';
            nextThreshold = config.tiers.silver;
            levelIndex = 1;
        } else {
            // Locked
            currentTier = 'locked';
            nextTier = 'bronze';
            nextThreshold = config.tiers.bronze;
            levelIndex = 0;
        }

        // Calculate percent
        let progressPercent = 0;
        if (currentTier === 'diamond') {
            progressPercent = 100;
        } else {
            // Simple linear progress to next tier. 
            // Optional: You could make this relative to previous tier for smoother bars.
            // For now, absolute progress (0 -> nextThreshold)
            progressPercent = Math.min(100, Math.round((currentValue / nextThreshold) * 100));
        }

        return {
            ...config,
            currentTier,
            nextTier,
            currentValue,
            nextThreshold,
            progressPercent,
            color: TIER_COLORS[currentTier],
            levelIndex
        };
    });

    // 3. Calculate Overall Growth Level
    const totalLevel = badges.reduce((acc, b) => acc + b.levelIndex, 0);
    // Max possible level = 6 badges * 4 levels = 24
    const maxLevel = badges.length * 4;

    return { badges, totalLevel, maxLevel };
};
