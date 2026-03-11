import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GENRE_OPTIONS, ReleaseType, Track, Release, ReleaseStatus } from '../types';
import { smartTitleCase, getMinReleaseDate, generateMockHash, validateImageDimensions } from '../utils';
import { Button, Input, Select, FileUpload, Card } from './UI';
import { TagInput } from './TagInput';
import { Logo } from './Logo';
import { releaseService } from '../services/firebaseService';
import { messagingService } from '../services/messagingService';

const SubmissionForm: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'CHOICE' | 'FORM' | 'SUCCESS'>('CHOICE');
  const [releaseType, setReleaseType] = useState<ReleaseType>(ReleaseType.SINGLE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form States
  const [title, setTitle] = useState('');
  const [mainArtist, setMainArtist] = useState<string[]>([]);
  const [genre, setGenre] = useState('');
  const [subGenre, setSubGenre] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [hasCover, setHasCover] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [featArtists, setFeatArtists] = useState<string[]>([]); // New state for Single feats
  const [tracks, setTracks] = useState<Track[]>([]);

  // Data for suggestions
  const [availableArtists, setAvailableArtists] = useState<string[]>([]);
  const [availableComposers, setAvailableComposers] = useState<string[]>([]);
  const [customGenres, setCustomGenres] = useState<string[]>([]);

  // Effects
  React.useEffect(() => {
    // Fetch Metadata for suggestions
    const fetchMetadata = async () => {
      const releases = await releaseService.getAll();
      const storedArtists = await releaseService.getStoredArtists();
      const storedGenres = await releaseService.getStoredGenres();
      const artists = new Set<string>();
      const composers = new Set<string>();

      storedArtists.forEach(a => artists.add(a));

      releases.forEach(r => {
        r.mainArtist.forEach(a => artists.add(a));
        r.tracks.forEach(t => {
          t.artist.forEach(a => artists.add(a));
          t.composer.forEach(c => composers.add(c));
        });
      });

      setAvailableArtists(Array.from(artists).sort());
      setAvailableComposers(Array.from(composers).sort());
      setCustomGenres(storedGenres);
    };
    fetchMetadata();
  }, []);

  // Update tracks when Main Artist changes (Album Mode)
  React.useEffect(() => {
    if (releaseType === ReleaseType.ALBUM && mainArtist.length > 0) {
      setTracks(prev => prev.map(t => {
        // Only update if empty or if it was previously matching the general logic (simple heuristic: if empty)
        // User requested "automatically included". We will set it if empty. 
        if (t.artist.length === 0) {
          return { ...t, artist: [...mainArtist] };
        }
        return t;
      }));
    }
  }, [mainArtist, releaseType]);

  // Tracks (Single has 1, Album has many)
  const defaultTrack: Track = {
    id: '',
    title: '',
    artist: [],
    composer: [],
    hasIsrc: false,
    isrc: '',
    audioFile: null
  };



  const resetForm = () => {
    setTitle('');
    setMainArtist([]);
    setGenre('');
    setSubGenre('');
    setReleaseDate('');
    setHasCover(false);
    setCoverFile(null);
    setFeatArtists([]);
    setTracks([]);
  };

  const handleStart = (type: ReleaseType) => {
    setReleaseType(type);
    resetForm();
    setStep('FORM');

    // Initialize tracks
    if (type === ReleaseType.SINGLE) {
      setTracks([{ ...defaultTrack, id: crypto.randomUUID() }]);
    } else {
      setTracks([]);
      setTracks([{ ...defaultTrack, id: crypto.randomUUID() }]);
    }
  };

  const handleBack = () => {
    const isDirty = title || mainArtist.length > 0 || genre || tracks.some(t => t.title || t.artist.length > 0);

    if (isDirty) {
      if (!window.confirm("Você tem dados preenchidos. Se voltar, eles serão perdidos. Deseja continuar?")) {
        return;
      }
    }
    resetForm();
    setStep('CHOICE');
  };

  const addTrack = () => {
    setTracks([...tracks, {
      ...defaultTrack,
      id: crypto.randomUUID(),
      artist: releaseType === ReleaseType.ALBUM ? [...mainArtist] : [], // Pre-fill with main artist
    }]);
  };

  const updateTrack = (index: number, field: keyof Track, value: any) => {
    const newTracks = [...tracks];

    // Auto Smart Case for text text fields only (not arrays)
    if (field === 'title') {
      newTracks[index] = { ...newTracks[index], [field]: smartTitleCase(value) };
    } else {
      newTracks[index] = { ...newTracks[index], [field]: value };
    }
    setTracks(newTracks);
  };

  const removeTrack = (index: number) => {
    if (tracks.length === 1 && releaseType === ReleaseType.SINGLE) return;
    const newTracks = [...tracks];
    newTracks.splice(index, 1);
    setTracks(newTracks);
  };

  const validateForm = async (): Promise<boolean> => {
    setError('');

    // Main Artist Array check
    if (!title || mainArtist.length === 0 || !genre || !releaseDate) {
      setError('Atenção: Preencha todos os campos obrigatórios do Cabeçalho do Projeto (Título, Artista Principal, Gênero e Data).');
      return false;
    }

    if (genre === 'Outros' && !subGenre) {
      setError('Atenção: Você selecionou gênero "Outros". Por favor, especifique o gênero exato.');
      return false;
    }

    // Cover art validation
    if (hasCover && !coverFile) {
      setError('Atenção: Você marcou que possui Arte da Capa, mas não anexou o arquivo de imagem.');
      return false;
    }

    if (coverFile) {
      const isValidDim = await validateImageDimensions(coverFile);
      if (!isValidDim) {
        setError('Atenção: A Arte da Capa enviada não possui as dimensões corretas. Ela deve ter exatamente 3000x3000px.');
        return false;
      }
    }

    // Track validation
    for (let i = 0; i < tracks.length; i++) {
      const t = tracks[i];

      // Validation Logic Differentiation
      if (releaseType === ReleaseType.SINGLE) {
        if (t.composer.length === 0) {
          setError(`Faixa Única: Adicione pelo menos um compositor na faixa.`);
          return false;
        }
        if (!t.audioFile) {
          setError(`Faixa Única: Faltou anexar o Arquivo de Áudio (.wav ou .mp3).`);
          return false;
        }
      } else {
        // Album: Everything within track required
        if (!t.title) {
          setError(`Faixa ${i + 1}: Informe o nome/título da música.`);
          return false;
        }
        if (t.artist.length === 0) {
          setError(`Faixa ${i + 1}: Informe o(s) artista(s) da faixa.`);
          return false;
        }
        if (t.composer.length === 0) {
          setError(`Faixa ${i + 1}: Adicione pelo menos um compositor na faixa.`);
          return false;
        }
        if (!t.audioFile) {
          setError(`Faixa ${i + 1}: Faltou anexar o Arquivo de Áudio (.wav ou .mp3).`);
          return false;
        }
      }

      if (t.hasIsrc && !t.isrc) {
        setError(releaseType === ReleaseType.SINGLE ? `Faixa Única: Você marcou que possui ISRC, mas não informou o código respectivo.` : `Faixa ${i + 1}: Você marcou que possui ISRC, mas não informou o código respectivo.`);
        return false;
      }
    }

    return true;
  };

  const handleErrorScroll = () => {
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!await validateForm()) {
      handleErrorScroll();
      return;
    }

    setLoading(true);

    try {
      // Prepare Payload
      const newRelease: Release = {
        id: crypto.randomUUID(),
        type: releaseType,
        title: smartTitleCase(title),
        mainArtist: mainArtist, // Already array
        genre: genre === 'Outros' ? smartTitleCase(subGenre) : genre,
        hasCover,
        coverFile: hasCover ? coverFile : null,
        coverFileName: hasCover ? coverFile?.name : null,
        releaseDate,
        status: ReleaseStatus.EM_ANALISE, // Initial status
        checklist: {
          arquivosConferidos: false,
          metadadosVerificados: false,
          enviadoDistribuidora: false,
          shareInEnviado: false
        },
        createdAt: new Date().toISOString(),
        tracks: tracks.map(t => ({
          ...t,
          title: releaseType === ReleaseType.SINGLE ? smartTitleCase(title) : t.title,
          artist: releaseType === ReleaseType.SINGLE
            ? [...mainArtist, ...featArtists] // Single: Main + Feats
            : t.artist, // Album: As defined in track
          composer: t.composer,
          audioHash: generateMockHash(t.audioFile?.name || ''),
          audioFileName: t.audioFile?.name || null
        }))
      };

      await releaseService.create(newRelease);

      // Gatilho: Notificar Admins sobre novo envio
      await messagingService.broadcastNotification(
        "Novo Lançamento Recebido!",
        `${newRelease.mainArtist.join(' & ')} enviou "${newRelease.title}" para análise.`
      );

      setStep('SUCCESS');
    } catch (err) {
      setError('Erro ao salvar lançamento. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'CHOICE') {
    return (
      <div className="h-screen flex items-center justify-center p-4 overflow-hidden">
        <div className="max-w-xl w-full text-center space-y-2">
          <div className="flex justify-center mb-3">
            <Logo className="h-24 md:h-32 drop-shadow-2xl" />
          </div>

          <h2 className="text-base font-light text-zinc-400">O que você vai lançar hoje?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleStart(ReleaseType.SINGLE)}
              className="group relative bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/50 hover:border-gold p-6 md:p-8 rounded-[2rem] transition-all duration-500 flex flex-col items-center gap-3 overflow-hidden shadow-2xl hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-14 h-14 rounded-2xl bg-zinc-950 group-hover:bg-gold/10 flex items-center justify-center transition-all duration-500 border border-zinc-800 group-hover:border-gold/30 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gold drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xl font-semibold text-white tracking-tight">Single</span>
                <span className="text-[9px] text-gold/60 font-medium tracking-[0.2em] mt-0.5">Lançamento Único</span>
              </div>
            </button>

            <button
              onClick={() => handleStart(ReleaseType.ALBUM)}
              className="group relative bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/50 hover:border-gold p-6 md:p-8 rounded-[2rem] transition-all duration-500 flex flex-col items-center gap-3 overflow-hidden shadow-2xl hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-14 h-14 rounded-2xl bg-zinc-950 group-hover:bg-gold/10 flex items-center justify-center transition-all duration-500 border border-zinc-800 group-hover:border-gold/30 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gold drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xl font-semibold text-white tracking-tight">Álbum / EP</span>
                <span className="text-[9px] text-gold/60 font-medium tracking-[0.2em] mt-0.5">Múltiplas Faixas</span>
              </div>
            </button>
          </div>

          <div className="mt-6">
            <button
              onClick={() => navigate('/admin')}
              className="text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors tracking-[0.3em] font-medium"
            >
              ÁREA ADMINISTRATIVA
            </button>
          </div>
        </div>
      </div >
    );
  }

  if (step === 'SUCCESS') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center py-12">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Envio Realizado!</h2>
          <p className="text-gray-400 mb-8">Seus arquivos foram enviados para a equipe da Black Star e já estão em análise.</p>
          <Button onClick={() => { resetForm(); setStep('CHOICE'); }}>Novo Envio</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 py-20 md:py-32">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Novo {releaseType}</h1>
          <p className="text-gray-500 text-sm">Preencha os dados com atenção</p>
        </div>
        <button onClick={handleBack} className="text-sm text-gold hover:underline">Voltar</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-16">

        {/* Release Header */}
        <Card className="space-y-8 p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-20" />
          <h3 className="text-[11px] font-semibold text-white tracking-[0.3em] mb-4 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-gold shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
            METADADOS DO PROJETO
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label={releaseType === ReleaseType.SINGLE ? "Nome da Música *" : "Nome do Álbum *"}
              value={title}
              onChange={(e) => setTitle(smartTitleCase(e.target.value))}
              placeholder="Ex: O Mundo é Nosso"
              required
            />
            <TagInput
              label="Artista(s) Principal(is) *"
              tags={mainArtist}
              onChange={setMainArtist}
              placeholder="Ex: Mc Kevin, Dj Alle Mark"
              required
              suggestions={availableArtists}
              maxTags={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
              <Select
                label="Gênero *"
                options={[
                  ...GENRE_OPTIONS,
                  ...customGenres.filter(g => !GENRE_OPTIONS.some(o => o.value === g)).map(g => ({ value: g, label: g }))
                ]}
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                required
              />
              {genre === 'Outros' && (
                <Input
                  label="Especifique o Gênero *"
                  value={subGenre}
                  onChange={(e) => setSubGenre(smartTitleCase(e.target.value))}
                  required
                />
              )}
            </div>

            <Input
              label="Data de Lançamento *"
              type="date"
              min={getMinReleaseDate()}
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              required
            />
          </div>

          <div className="bg-black/20 p-4 rounded-lg space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-400 font-bold">Possui Capa?</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHasCover(true)}
                  className={`px-4 py-2 rounded text-xs font-bold transition-all ${hasCover ? 'bg-gold text-white shadow-lg shadow-gold/20' : 'bg-gray-800 text-gray-500'}`}
                >SIM</button>
                <button
                  type="button"
                  onClick={() => { setHasCover(false); setCoverFile(null); }}
                  className={`px-4 py-2 rounded text-xs font-bold transition-all ${!hasCover ? 'bg-gold text-white shadow-lg shadow-gold/20' : 'bg-gray-800 text-gray-500'}`}
                >NÃO</button>
              </div>
            </div>

            {hasCover && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <FileUpload
                  label="Arte da Capa (3000x3000px) *"
                  accept="image/*"
                  required
                  onChange={setCoverFile}
                  infoText="Obrigatório: JPG ou PNG, Quadrado Perfeito"
                />
              </div>
            )}
          </div>
        </Card>

        {/* Tracks Manager */}
        <div className="space-y-4">
          {releaseType === ReleaseType.ALBUM && (
            <div className="flex justify-between items-end border-b border-gray-800 pb-2">
              <h3 className="text-lg font-bold text-gold">Faixas ({tracks.length})</h3>
            </div>
          )}

          {tracks.map((track, idx) => (
            <Card key={track.id} className="relative">
              {releaseType === ReleaseType.ALBUM && (
                <div className="absolute top-4 right-4 text-xs font-bold text-gray-600">FAIXA {idx + 1}</div>
              )}
              {releaseType === ReleaseType.ALBUM && tracks.length > 1 && (
                <button type="button" onClick={() => removeTrack(idx)} className="absolute top-4 right-20 text-xs text-red-500 hover:text-red-400">Excluir</button>
              )}

              <div className="grid grid-cols-1 gap-6">
                {releaseType === ReleaseType.ALBUM && (
                  <Input
                    label="Nome da Música *"
                    value={track.title}
                    onChange={(e) => updateTrack(idx, 'title', e.target.value)}
                    placeholder="Ex: Intro"
                    required
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Single: Feats Logic / Album: Normal Artist Input */}
                  {releaseType === ReleaseType.SINGLE ? (
                    <div className="bg-black/20 p-4 rounded-lg">
                      <label className="block text-sm text-gray-400 mb-2 font-bold">Participação Especial (Feat)?</label>
                      {featArtists.length === 0 ? (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setFeatArtists([''])} className="px-3 py-1 bg-gray-800 text-gray-400 text-xs rounded hover:text-white">Sim</button>
                          <button type="button" className="px-3 py-1 bg-gold text-white text-xs rounded shadow-lg shadow-gold/20">Não</button>
                        </div>
                      ) : (
                        <TagInput
                          label="Nome do(s) Artista(s) Convidado(s)"
                          tags={featArtists}
                          onChange={setFeatArtists}
                          placeholder="Digite e dê Enter"
                          suggestions={availableArtists}
                          maxTags={4}
                        />
                      )}
                    </div>
                  ) : (
                    <TagInput
                      label="Artista(s) da Faixa *"
                      tags={track.artist}
                      onChange={(tags) => updateTrack(idx, 'artist', tags)}
                      placeholder="Herdado do álbum se vazio (Opte por preencher)"
                      required
                      suggestions={availableArtists}
                      maxTags={4}
                    />
                  )}

                  <TagInput
                    label="Compositor(es) *"
                    tags={track.composer}
                    onChange={(tags) => updateTrack(idx, 'composer', tags)}
                    placeholder="Nome Civil completo"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/20 p-4 rounded-lg">
                  <div className="flex items-center gap-4">
                    <label className="text-sm text-gray-400">Possui ISRC?</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateTrack(idx, 'hasIsrc', true)}
                        className={`px-3 py-1 rounded text-xs ${track.hasIsrc ? 'bg-gold text-white' : 'bg-gray-800 text-gray-400'}`}
                      >SIM</button>
                      <button
                        type="button"
                        onClick={() => updateTrack(idx, 'hasIsrc', false)}
                        className={`px-3 py-1 rounded text-xs ${!track.hasIsrc ? 'bg-gold text-white' : 'bg-gray-800 text-gray-400'}`}
                      >NÃO</button>
                    </div>
                  </div>
                  {track.hasIsrc && (
                    <Input
                      label="Código ISRC *"
                      value={track.isrc || ''}
                      onChange={(e) => updateTrack(idx, 'isrc', e.target.value.toUpperCase())}
                      placeholder="BR-XXX-24-00001"
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FileUpload
                    label="Arquivo de Áudio (.wav/.mp3) *"
                    accept=".wav,.mp3"
                    required
                    onChange={(f) => updateTrack(idx, 'audioFile', f)}
                  />
                  <div className="flex flex-col gap-1 w-full">
                    <label className="text-sm text-gray-400 font-medium ml-1">Letra</label>
                    <textarea
                      className="bg-input border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors placeholder-gray-600 h-[86px] resize-none"
                      value={track.lyrics || ''}
                      onChange={(e) => updateTrack(idx, 'lyrics', e.target.value)}
                    ></textarea>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {releaseType === ReleaseType.ALBUM && (
          <div className="flex justify-center pt-4">
            <Button type="button" variant="secondary" onClick={addTrack} className="w-full md:w-auto px-8 py-3 text-sm">
              + Adicionar Nova Faixa
            </Button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-950/40 border-l-4 border-y border-r border-red-900/50 border-l-red-500 text-red-200 rounded-lg text-sm font-medium flex items-start gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300 shadow-2xl shadow-red-900/10">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            <p className="tracking-wide leading-relaxed">{error}</p>
          </div>
        )}

        <div className="sticky bottom-4 z-50">
          <Button type="submit" className="w-full shadow-2xl" disabled={loading}>
            {loading ? 'Enviando...' : `Finalizar Envio (${releaseType})`}
          </Button>
        </div>

      </form>
    </div>
  );
};

export default SubmissionForm;