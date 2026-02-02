
import { MatchData, UserProfile } from '../types';

const MATCH_STORAGE_KEY = 'arthur_match_diary_v1';
const PROFILES_STORAGE_KEY = 'arthur_match_profiles_list_v1';
const LEGACY_PROFILE_KEY = 'arthur_match_profile_v1';
const BACKUP_TIMESTAMP_KEY = 'arthur_last_backup_timestamp';

// --- Helper: Generate ID ---
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// --- Backup Tracking ---
export const updateLastBackupDate = (): void => {
    localStorage.setItem(BACKUP_TIMESTAMP_KEY, Date.now().toString());
};

export const isBackupNeeded = (): boolean => {
    const lastBackup = localStorage.getItem(BACKUP_TIMESTAMP_KEY);
    if (!lastBackup) return true; // Never backed up

    const daysSince = (Date.now() - parseInt(lastBackup)) / (1000 * 60 * 60 * 24);
    return daysSince > 14; // Alert if older than 14 days
};

// --- User Profiles ---

export const getAllProfiles = (): UserProfile[] => {
  try {
    const data = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }

    // Migration: Check for legacy single profile
    const legacyData = localStorage.getItem(LEGACY_PROFILE_KEY);
    if (legacyData) {
      const legacyProfile = JSON.parse(legacyData);
      // Create a new ID for the legacy profile
      const newId = generateId();
      const migratedProfile: UserProfile = {
        ...legacyProfile,
        id: newId,
        teams: legacyProfile.teams || []
      };
      
      // Save to new list
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify([migratedProfile]));
      
      // Migrate matches to this new ID
      migrateMatchesToProfile(newId);
      
      // Remove legacy key to finish migration
      localStorage.removeItem(LEGACY_PROFILE_KEY);
      
      return [migratedProfile];
    }

    return [];
  } catch (error) {
    console.error('Error reading profiles', error);
    return [];
  }
};

export const saveUserProfile = (profile: UserProfile): void => {
  try {
    const profiles = getAllProfiles();
    
    if (!profile.id) {
      profile.id = generateId(); // Ensure ID exists
    }

    const index = profiles.findIndex(p => p.id === profile.id);
    let updatedProfiles;
    
    if (index >= 0) {
      // Update existing
      updatedProfiles = [...profiles];
      updatedProfiles[index] = profile;
    } else {
      // Add new
      updatedProfiles = [...profiles, profile];
    }

    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updatedProfiles));
  } catch (error) {
    console.error('Error saving profile', error);
  }
};

export const deleteUserProfile = (profileId: string): UserProfile[] => {
    try {
        const profiles = getAllProfiles();
        const updatedProfiles = profiles.filter(p => p.id !== profileId);
        localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updatedProfiles));

        // Also delete all matches associated with this profile
        const allMatches = getMatches();
        const updatedMatches = allMatches.filter(m => m.profileId !== profileId);
        saveMatches(updatedMatches);

        return updatedProfiles;
    } catch (e) {
        console.error("Error deleting profile", e);
        return [];
    }
};

// --- MERGE LOGIC FOR SYNC (Profile) ---
export const importProfile = (incomingProfile: UserProfile): void => {
    try {
        const localProfiles = getAllProfiles();
        const existingIndex = localProfiles.findIndex(p => p.id === incomingProfile.id);
        
        if (existingIndex >= 0) {
            // Merge logic: Keep local avatar if incoming is null (common in sync)
            const existing = localProfiles[existingIndex];
            const merged: UserProfile = {
                ...incomingProfile,
                avatar: incomingProfile.avatar || existing.avatar, // Preserve local avatar if remote is missing
                teams: incomingProfile.teams // Trust incoming teams structure usually
            };
            localProfiles[existingIndex] = merged;
        } else {
            // New profile
            localProfiles.push(incomingProfile);
        }
        
        localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(localProfiles));
    } catch (e) {
        console.error("Import profile error", e);
    }
};

// --- Match Data ---

const migrateMatchesToProfile = (profileId: string) => {
  try {
    const data = localStorage.getItem(MATCH_STORAGE_KEY);
    if (data) {
      const matches: MatchData[] = JSON.parse(data);
      const migratedMatches = matches.map(m => ({
        ...m,
        profileId: m.profileId || profileId // Assign ID if missing
      }));
      localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(migratedMatches));
    }
  } catch (e) {
    console.error("Migration error", e);
  }
};

export const getMatches = (profileId?: string): MatchData[] => {
  try {
    const data = localStorage.getItem(MATCH_STORAGE_KEY);
    const allMatches: any[] = data ? JSON.parse(data) : [];
    
    // Auto-migrate legacy youtubeUrl to videos array on read
    const migratedAllMatches: MatchData[] = allMatches.map(m => {
        let videos = m.videos || [];
        // If has old url but no videos array, migrate it
        if (m.youtubeUrl && videos.length === 0) {
            videos = [{
                id: 'legacy_' + m.id,
                url: m.youtubeUrl,
                tag: 'highlight',
                note: ''
            }];
        }
        return { ...m, videos };
    });
    
    if (profileId) {
      return migratedAllMatches.filter(m => m.profileId === profileId);
    }
    return migratedAllMatches;
  } catch (error) {
    console.error('Error reading matches from local storage', error);
    return [];
  }
};

// Standard Save (Overwrites everything with provided list - used for Deletion)
export const saveMatches = (matches: MatchData[]): void => {
  try {
    localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(matches));
  } catch (error) {
    console.error('Error saving matches to local storage', error);
  }
};

// --- MERGE LOGIC FOR SYNC (Matches) ---
// This ensures we don't wipe local data if we sync from a source with fewer matches
export const importMatches = (incomingMatches: MatchData[]): void => {
    try {
        const currentMatches = getMatches(); // Get ALL matches (all profiles)
        
        // Create a map of existing matches by ID for easy lookup
        const matchMap = new Map<string, MatchData>();
        currentMatches.forEach(m => matchMap.set(m.id, m));
        
        // Merge incoming matches
        incomingMatches.forEach(incoming => {
            // We overwrite if ID exists, otherwise add. 
            // This assumes "Last Sync" is the truth. 
            // For a simple app, this is better than complex conflict resolution.
            matchMap.set(incoming.id, incoming);
        });
        
        // Convert back to array
        const mergedList = Array.from(matchMap.values());
        
        localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(mergedList));
    } catch (e) {
        console.error("Import matches error", e);
    }
};

export const addMatchToStorage = (match: MatchData): MatchData[] => {
  try {
    const allMatches = getMatches(); // Use getMatches to ensure migration happens if needed
    
    const updatedAll = [match, ...allMatches];
    localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(updatedAll));
    
    return updatedAll.filter(m => m.profileId === match.profileId);
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const updateMatchInStorage = (match: MatchData): MatchData[] => {
  try {
    const allMatches = getMatches(); // Use getMatches to ensure migration
    
    const updatedAll = allMatches.map(m => m.id === match.id ? match : m);
    localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(updatedAll));
    
    return updatedAll.filter(m => m.profileId === match.profileId);
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const deleteMatchFromStorage = (id: string, currentProfileId: string): MatchData[] => {
  try {
    const allMatches = getMatches();
    
    const updatedAll = allMatches.filter(m => m.id !== id);
    localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(updatedAll));
    
    return updatedAll.filter(m => m.profileId === currentProfileId);
  } catch (e) {
    console.error(e);
    return [];
  }
};

// --- Full Backup Helper ---
export const getFullBackupData = () => {
    return {
        type: 'arthur_full_backup_v1',
        version: '1.0', // Version Control for future migrations
        timestamp: Date.now(),
        profiles: getAllProfiles(),
        matches: getMatches()
    };
};
