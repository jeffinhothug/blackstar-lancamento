import { db, storage } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Release, ReleaseStatus, ReleaseChecklist } from '../types';

const RELEASES_COLLECTION = 'lancamentos';

export const releaseService = {
    getAll: async (): Promise<Release[]> => {
        try {
            const q = query(collection(db, RELEASES_COLLECTION), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const releases: Release[] = [];
            querySnapshot.forEach((doc) => {
                releases.push({ id: doc.id, ...doc.data() } as Release);
            });
            return releases;
        } catch (error) {
            console.error("Error getting documents: ", error);
            // Fallback or rethrow
            return [];
        }
    },

    create: async (release: Release): Promise<void> => {
        try {
            // 1. Upload Cover
            let coverUrl = '';
            if (release.coverFile) {
                const coverPath = `capas/${release.id}/${release.coverFile.name}`;
                const coverRef = ref(storage, coverPath);
                await uploadBytes(coverRef, release.coverFile);
                coverUrl = await getDownloadURL(coverRef);
            }

            // 2. Upload Tracks Audio
            const updatedTracks = await Promise.all(release.tracks.map(async (track) => {
                if (track.audioFile) {
                    const audioPath = `audios/${release.id}/${track.id}/${track.audioFile.name}`;
                    const audioRef = ref(storage, audioPath);
                    await uploadBytes(audioRef, track.audioFile);
                    const audioUrl = await getDownloadURL(audioRef);
                    // Remove file object before saving to Firestore
                    const { audioFile, ...trackData } = track;
                    return { ...trackData, audioUrl, audioFileName: track.audioFileName };
                }
                const { audioFile, ...trackData } = track;
                return trackData;
            }));

            // 3. Prepare Release Object for Firestore (remove File objects)
            const { coverFile, ...releaseData } = release;
            const finalRelease = {
                ...releaseData,
                coverUrl,
                tracks: updatedTracks
                // You might want to store references to file paths if you need to delete them later
            };

            await setDoc(doc(db, RELEASES_COLLECTION, release.id), finalRelease);
        } catch (error) {
            console.error("Error creating release: ", error);
            throw error;
        }
    },

    updateStatus: async (id: string, checklist: ReleaseChecklist): Promise<ReleaseStatus> => {
        let newStatus = ReleaseStatus.EM_ANALISE;

        if (checklist.shareInEnviado && checklist.enviadoDistribuidora && checklist.metadadosVerificados && checklist.arquivosConferidos) {
            newStatus = ReleaseStatus.FINALIZADO;
        } else if (checklist.enviadoDistribuidora && checklist.metadadosVerificados && checklist.arquivosConferidos) {
            newStatus = ReleaseStatus.DISTRIBUIDO;
        } else if (checklist.metadadosVerificados && checklist.arquivosConferidos) {
            newStatus = ReleaseStatus.APROVADO;
        } else if (checklist.arquivosConferidos) {
            newStatus = ReleaseStatus.EM_ANALISE;
        } else {
            newStatus = ReleaseStatus.NAO_SUBIDO;
        }

        const releaseRef = doc(db, RELEASES_COLLECTION, id);
        await updateDoc(releaseRef, {
            checklist: checklist,
            status: newStatus
        });

        return newStatus;
    },

    deleteStorageFiles: async (release: Release): Promise<void> => {
        // Delete Cover
        if (release.coverFileName && !release.coverFileName.startsWith('[DELETED')) {
            const coverPath = `capas/${release.id}/${release.coverFileName}`;
            const coverRef = ref(storage, coverPath);
            await deleteObject(coverRef).catch(e => console.warn('Cover delete failed/not found', e));
        }

        // Delete Audio Files
        await Promise.all(release.tracks.map(async (t) => {
            if (t.audioFileName && !t.audioFileName.startsWith('[DELETED')) {
                const audioPath = `audios/${release.id}/${t.id}/${t.audioFileName}`;
                const audioRef = ref(storage, audioPath);
                await deleteObject(audioRef).catch(e => console.warn(`Audio delete failed for ${t.title}`, e));
            }
        }));
    },

    purgeReleaseMedia: async (release: Release): Promise<void> => {
        try {
            await releaseService.deleteStorageFiles(release);

            const releaseRef = doc(db, RELEASES_COLLECTION, release.id);
            await updateDoc(releaseRef, {
                purged: true,
                coverFileName: '[DELETED_MEDIA]',
                coverUrl: '',
                tracks: release.tracks.map(t => ({ ...t, audioFileName: '[DELETED_MEDIA]', audioUrl: '', audioHash: '[PURGED]' }))
            });
        } catch (error) {
            console.error("Error purging media:", error);
            throw error;
        }
    },

    deletePermanently: async (release: Release): Promise<void> => {
        console.log(`[FirebaseService] Iniciando exclusão permanente: ${release.id} (${release.title})`);
        try {
            // 1. Limpar o Storage primeiro enquanto ainda temos as referências no objeto
            try {
                await releaseService.deleteStorageFiles(release);
                console.log(`[FirebaseService] Storage files cleaned for ${release.id}`);
            } catch (storageError) {
                console.warn("[FirebaseService] Storage cleanup had issues, proceeding with DB deletion:", storageError);
            }

            // 2. Apaga do Banco de Dados
            const docRef = doc(db, RELEASES_COLLECTION, release.id);
            await deleteDoc(docRef);
            console.log(`[FirebaseService] Document ${release.id} deleted from Firestore.`);
        } catch (error) {
            console.error("[FirebaseService] Critical error deleting release:", error);
            throw error;
        }
    },

    registerDownload: async (id: string, log: { date: string, user: string, fileType: 'audio' | 'cover', fileName: string }): Promise<void> => {
        const releaseRef = doc(db, RELEASES_COLLECTION, id);
        const { arrayUnion } = require('firebase/firestore');
        await updateDoc(releaseRef, {
            downloads: arrayUnion(log)
        });
    },

    normalizeDatabase: async (smartTitleCaseFn: (s: string) => string): Promise<number> => {
        try {
            const q = query(collection(db, RELEASES_COLLECTION));
            const querySnapshot = await getDocs(q);
            let count = 0;

            const updatePromises = querySnapshot.docs.map(async (docSnapshot) => {
                const data = docSnapshot.data() as Release;
                let changed = false;

                // Normalize Main Artist
                const newMainArtist = data.mainArtist.map(a => smartTitleCaseFn(a));
                if (JSON.stringify(newMainArtist) !== JSON.stringify(data.mainArtist)) changed = true;

                // Normalize Tracks
                const newTracks = data.tracks.map(t => {
                    const newTrackArtists = t.artist.map(a => smartTitleCaseFn(a));
                    const newTrackComposers = t.composer.map(c => smartTitleCaseFn(c));

                    if (JSON.stringify(newTrackArtists) !== JSON.stringify(t.artist) ||
                        JSON.stringify(newTrackComposers) !== JSON.stringify(t.composer)) {
                        changed = true;
                        return { ...t, artist: newTrackArtists, composer: newTrackComposers };
                    }
                    return t;
                });

                if (changed) {
                    await updateDoc(doc(db, RELEASES_COLLECTION, docSnapshot.id), {
                        mainArtist: newMainArtist,
                        tracks: newTracks
                    });
                    count++;
                }
            });

            await Promise.all(updatePromises);
            return count;
        } catch (error) {
            console.error("Error normalizing DB:", error);
            throw error;
        }
    },

    // --- Artist Management (Standalone) ---
    addArtist: async (name: string): Promise<void> => {
        try {
            const docRef = doc(db, 'artistas', name.trim());
            await setDoc(docRef, { name: name.trim(), createdAt: new Date().toISOString() });
        } catch (error) {
            console.error("Error adding artist:", error);
            throw error;
        }
    },

    getStoredArtists: async (): Promise<string[]> => {
        try {
            const q = query(collection(db, 'artistas'));
            const querySnapshot = await getDocs(q);
            const artists: string[] = [];
            querySnapshot.forEach((doc) => {
                artists.push(doc.data().name as string);
            });
            return artists;
        } catch (error) {
            console.error("Error getting stored artists:", error);
            return [];
        }
    },

    // --- Genre Management ---
    addGenre: async (genre: string): Promise<void> => {
        try {
            const docRef = doc(db, 'generos', genre.trim());
            await setDoc(docRef, { name: genre.trim(), createdAt: new Date().toISOString() });
        } catch (error) {
            console.error("Error adding genre:", error);
            throw error;
        }
    },

    getStoredGenres: async (): Promise<string[]> => {
        try {
            const q = query(collection(db, 'generos'));
            const querySnapshot = await getDocs(q);
            const genres: string[] = [];
            querySnapshot.forEach((doc) => {
                genres.push(doc.data().name as string);
            });
            return genres;
        } catch (error) {
            console.error("Error getting stored genres:", error);
            return [];
        }
    }
};
