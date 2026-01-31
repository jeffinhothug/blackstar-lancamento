import { Release, ReleaseStatus, ReleaseType, ReleaseChecklist } from '../types';

const STORAGE_KEY = 'blackstar_releases_v1';

// Initial Load
const loadReleases = (): Release[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveReleases = (releases: Release[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(releases));
};

export const releaseService = {
  getAll: async (): Promise<Release[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return loadReleases().filter(r => !r.purged); // Simulating purge viewing logic
  },

  create: async (release: Release): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const releases = loadReleases();
    releases.unshift(release);
    saveReleases(releases);
  },

  updateStatus: async (id: string, checklist: ReleaseChecklist): Promise<ReleaseStatus> => {
    const releases = loadReleases();
    const index = releases.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Release not found');

    let newStatus = ReleaseStatus.EM_ANALISE; // Default start if uploaded

    if (checklist.shareInEnviado && checklist.enviadoDistribuidora && checklist.metadadosVerificados && checklist.arquivosConferidos) {
      newStatus = ReleaseStatus.FINALIZADO;
    } else if (checklist.enviadoDistribuidora && checklist.metadadosVerificados && checklist.arquivosConferidos) {
      newStatus = ReleaseStatus.DISTRIBUIDO;
    } else if (checklist.metadadosVerificados && checklist.arquivosConferidos) {
      newStatus = ReleaseStatus.APROVADO;
    } else if (checklist.arquivosConferidos) {
      newStatus = ReleaseStatus.EM_ANALISE;
    }

    releases[index].checklist = checklist;
    releases[index].status = newStatus;
    
    // Logic for Purge Simulation (mocking the trigger)
    if (newStatus === ReleaseStatus.FINALIZADO) {
        // In a real app, a cloud function would handle this based on time. 
        // Here we just mark the logic availability.
    }

    saveReleases(releases);
    return newStatus;
  },
  
  // "Verified Purge" Simulation
  purgeReleaseMedia: async (id: string): Promise<void> => {
    const releases = loadReleases();
    const index = releases.findIndex(r => r.id === id);
    if (index === -1) return;
    
    // Simulate deleting media but keeping record
    releases[index].coverUrl = undefined; 
    releases[index].tracks.forEach(t => t.audioFileName = '[DELETED]');
    // In a real scenario with soft delete requirements:
    // releases[index].purged = true; 
    
    saveReleases(releases);
  },

  deletePermanently: async (id: string): Promise<void> => {
    const releases = loadReleases();
    const filtered = releases.filter(r => r.id !== id);
    saveReleases(filtered);
  }
};