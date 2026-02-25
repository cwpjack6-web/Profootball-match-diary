export interface Teammate {
  id: string;
  name: string;
  number?: string;
}

export type TeamPattern = 'solid' | 'vertical' | 'horizontal';

export interface Team {
  id: string;
  name: string;
  jerseyNumber: string;
  themeColor: string;
  secondaryColor?: string;
  themePattern?: TeamPattern;
  logo?: string | null;
  defaultMatchFormat?: MatchFormat;
  defaultMatchStructure?: MatchStructure;
  roster: Teammate[];
  isArchived?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string | null;
  teams: Team[];
  // Legacy fields
  teamName?: string;
  jerseyNumber?: string;
  themeColor?: string;
}

export interface VideoLink {
  id: string;
  url: string;
  tag: 'highlight' | 'goal' | 'assist' | 'full' | 'other';
  note: string;
}

// 'cup' renamed to 'tournament'
export type MatchType = 'league' | 'tournament' | 'friendly';
export type PitchType = 'turf' | 'artificial' | 'hard' | 'indoor' | 'other';
export type WeatherType = 'sunny' | 'rain' | 'cloudy' | 'night' | 'hot' | 'windy';
export type MatchFormat = '5v5' | '6v6' | '7v7' | '8v8' | '9v9' | '11v11' | 'other';
export type MatchStructure = 'halves' | 'quarters';

// New: Quarter data for per-period breakdown
export interface MatchQuarter {
  scoreMyTeam: number;
  scoreOpponent: number;
  arthurGoals: number;
  arthurAssists: number;
  comment: string;
}

export interface MatchData {
  id: string;
  profileId: string;
  date: string;
  assemblyTime?: string;
  matchTime?: string;
  matchEndTime?: string;
  tournamentStartTime?: string;
  tournamentEndTime?: string;
  teamId: string;
  location: string;
  isHome: boolean;
  matchType: MatchType;
  tournamentName?: string;
  matchLabel?: string;
  pitchType?: PitchType;
  weather?: WeatherType;
  matchFormat?: MatchFormat;
  matchStructure?: MatchStructure;
  periodsPlayed?: number;
  positionPlayed?: string[];
  opponent: string;
  scoreMyTeam: number;
  scoreOpponent: number;
  scorers: { teammateId: string; count: number }[];
  arthurGoals: number;
  arthurAssists: number;
  rating: number;
  isMotm?: boolean;
  dadComment: string;
  commenterIdentity?: 'Dad' | 'Coach' | 'Mom' | 'Other';
  kidInterview: string;
  videos: VideoLink[];
  status?: 'scheduled' | 'completed';
  updatedAt?: number;
  // New: quarter-level breakdown
  quarters?: MatchQuarter[];
  useQuarters?: boolean;
}

// Migration helper: call on app load to convert legacy 'cup' → 'tournament'
export function migrateMatchType(match: MatchData): MatchData {
  if ((match.matchType as string) === 'cup') {
    return { ...match, matchType: 'tournament' };
  }
  return match;
}

export type CoachPersona = 'motivator' | 'tactician' | 'wisdom' | 'custom';

export interface CoachReport {
  id: string;
  profileId: string;
  monthKey: string;
  coachPersona: CoachPersona;
  customCoachName?: string;
  content: string;
  generatedAt: number;
}

export interface MatchFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<MatchData, 'id'>) => void;
  profile: UserProfile;
  initialData?: MatchData | null;
  previousMatches: MatchData[];
  onAddTeammate?: (teamId: string, name: string, number?: string) => void;
}

export interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string | null;
}

export interface ProfileSetupProps {
  initialProfile: UserProfile | null;
  onSave: (profile: UserProfile) => void;
  onCancel?: () => void;
}

export interface TeamManagerProps {
  profile: UserProfile;
  onUpdateProfile: (updatedProfile: UserProfile) => void;
}

export interface AnalyticsProps {
  matches: MatchData[];
  profile: UserProfile;
}

export interface CoverPageProps {
  profiles: UserProfile[];
  onSelectProfile: (profile: UserProfile) => void;
  onAddProfile: () => void;
  onImportData: () => void;
  onDeleteProfile: (id: string) => void;
}
