
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
  themeColor: string; // Primary Color
  secondaryColor?: string; // New: Secondary Color for stripes
  themePattern?: TeamPattern; // New: solid, vertical, horizontal
  logo?: string | null; // New: Base64 Logo
  defaultMatchFormat?: MatchFormat; // New: Default 5v5, 7v7 etc.
  defaultMatchStructure?: MatchStructure; // New: Default quarters vs halves
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

export type MatchType = 'league' | 'cup' | 'friendly';
export type PitchType = 'turf' | 'artificial' | 'hard' | 'indoor' | 'other';
export type WeatherType = 'sunny' | 'rain' | 'cloudy' | 'night' | 'hot' | 'windy';
export type MatchFormat = '5v5' | '6v6' | '7v7' | '8v8' | '9v9' | '11v11' | 'other';
export type MatchStructure = 'halves' | 'quarters';

export interface MatchData {
  id: string;
  profileId: string;
  date: string;
  assemblyTime?: string; 
  matchTime?: string;
  matchEndTime?: string;
  teamId: string;
  location: string;
  isHome: boolean;
  matchType: MatchType; 
  tournamentName?: string; // New: e.g., "Easter Cup"
  matchLabel?: string; // New: e.g., "Game 1", "Semi-Final"
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
}

// New Interface for Coach Reports
export type CoachPersona = 'motivator' | 'tactician' | 'wisdom' | 'custom';

export interface CoachReport {
    id: string;
    profileId: string;
    monthKey: string; // YYYY-MM
    coachPersona: CoachPersona;
    customCoachName?: string; // New: Store the name of the custom coach
    content: string; // The markdown content from AI
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
