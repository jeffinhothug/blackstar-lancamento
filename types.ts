export enum ReleaseType {
  SINGLE = 'Single',
  ALBUM = 'Álbum/EP'
}

export enum ReleaseStatus {
  NAO_SUBIDO = 'Não Subido',
  EM_ANALISE = 'Em Análise',
  APROVADO = 'Aprovado',
  DISTRIBUIDO = 'Distribuído',
  FINALIZADO = 'Finalizado',
  REJEITADO = 'Rejeitado'
}

export interface ReleaseChecklist {
  arquivosConferidos: boolean;
  metadadosVerificados: boolean;
  enviadoDistribuidora: boolean;
  shareInEnviado: boolean;
}

export interface Track {
  id: string; // generated UUID or simple ID
  title: string;
  artist: string[]; // Main artist(s) - Array now
  feat?: string; // Participating artist (Removed, merged into artist logic or kept separate? User said "multi artistas in music field", usually means main artists. Let's keep simpler or use tags for all)
  composer: string[]; // Array now
  isrc?: string;
  hasIsrc: boolean;
  audioFile?: File | null;
  audioFileName?: string;
  audioHash?: string;
  audioUrl?: string; // Stored URL from Firebase Storage
  lyrics?: string;
}

export interface Release {
  id: string;
  type: ReleaseType;
  title: string; // Song name (Single) or Album Name
  mainArtist: string[]; // Array now
  genre: string;
  subGenre?: string; // If genre is 'Outros'
  hasCover: boolean; // New
  coverFile?: File | null;
  coverFileName?: string;
  coverUrl?: string; // Simulated URL
  releaseDate: string;
  status: ReleaseStatus;
  checklist: ReleaseChecklist;
  createdAt: string;
  tracks: Track[]; // For Single, length is 1
  adminNotes?: string;
  purged?: boolean; // If true, media files are deleted
  downloads?: DownloadLog[];
}

export interface DownloadLog {
  date: string;
  user: string; // "Admin" or specific user email
  fileType: 'audio' | 'cover';
  fileName: string;
}

export interface GenreOption {
  value: string;
  label: string;
}

export const GENRE_OPTIONS: GenreOption[] = [
  { value: 'Funk', label: 'Funk' },
  { value: 'Trap', label: 'Trap' },
  { value: 'Rap', label: 'Rap' },
  { value: 'Pop', label: 'Pop' },
  { value: 'Pagode', label: 'Pagode' },
  { value: 'Sertanejo', label: 'Sertanejo' },
  { value: 'Eletrônica', label: 'Eletrônica' },
  { value: 'Outros', label: 'Outros' },
];