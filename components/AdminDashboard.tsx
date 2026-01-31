import React, { useState, useEffect } from 'react';
import { Release, ReleaseStatus, ReleaseChecklist, GENRE_OPTIONS } from '../types';
import { releaseService } from '../services/firebaseService';
import { Button, Card, Badge, Input } from './UI';
import { Logo } from './Logo';
import { formatDate, getStatusColor, smartTitleCase } from '../utils';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

import SubmissionForm from './SubmissionForm';

// --- AUTH COMPONENT ---
const AdminLogin: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (err) {
      setError('Erro ao fazer login. Verifique suas credenciais.');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md p-8 border-gold/20">
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo className="h-32 mb-4" />
          <p className="text-gray-500 uppercase tracking-widest text-xs mt-1">Admin Access</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Email</label>
            <input
              type="email"
              className="w-full bg-input border border-gray-700 rounded p-3 text-white focus:border-gold outline-none"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Senha</label>
            <input
              type="password"
              className="w-full bg-input border border-gray-700 rounded p-3 text-white focus:border-gold outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" className="w-full">Entrar</Button>
        </form>
      </Card>
    </div>
  );
};

// --- DASHBOARD COMPONENT ---
const Dashboard: React.FC = () => {
  const [releases, setReleases] = useState<Release[]>([]);
  const [tab, setTab] = useState<'DASHBOARD' | 'RELEASES' | 'HISTORY' | 'ARTISTS' | 'GENRES' | 'NEW_RELEASE'>('DASHBOARD');
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

  // New Artist Modal State
  const [showArtistModal, setShowArtistModal] = useState(false);
  const [newArtistName, setNewArtistName] = useState('');
  const [extraArtists, setExtraArtists] = useState<string[]>([]);
  const [isSubmittingArtist, setIsSubmittingArtist] = useState(false);

  const fetchReleases = async () => {
    const data = await releaseService.getAll();
    setReleases(data);
    const stored = await releaseService.getStoredArtists();
    setExtraArtists(stored);
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  const handleStatusUpdate = async (checklist: ReleaseChecklist) => {
    if (!selectedRelease) return;
    await releaseService.updateStatus(selectedRelease.id, checklist);
    await fetchReleases();
    setSelectedRelease(prev => prev ? { ...prev, checklist } : null); // Optimistic update
  };

  const handleDelete = async () => {
    if (!selectedRelease || !window.confirm('Tem certeza? Isso é irreversível.')) return;
    await releaseService.deletePermanently(selectedRelease);
    setSelectedRelease(null);
    fetchReleases();
  };

  const handlePurge = async () => {
    if (!selectedRelease || !window.confirm('Isso apagará os arquivos de áudio e capa para economizar espaço, mantendo os dados. Confirmar?')) return;
    try {
      await releaseService.purgeReleaseMedia(selectedRelease);
      alert('Mídia excluída com sucesso.');
      setSelectedRelease(null);
      fetchReleases();
    } catch (e) {
      alert('Erro ao excluir mídia.');
      console.error(e);
    }
  };

  const handleDownload = async (fileName: string | undefined, url: string | undefined, type: 'audio' | 'cover') => {
    if (url && fileName && selectedRelease) {
      // Register download
      releaseService.registerDownload(selectedRelease.id, {
        date: new Date().toISOString(),
        user: 'Admin', // In future, use auth.currentUser.email
        fileType: type,
        fileName: fileName
      });
      window.open(url, '_blank');
    } else {
      alert(`Baixando (Simulação): ${fileName || 'Arquivo'}`);
    }
  };

  // Views
  const renderDashboardTab = () => {
    const pending = releases.filter(r => r.status === ReleaseStatus.EM_ANALISE || r.status === ReleaseStatus.NAO_SUBIDO).length;
    const approved = releases.filter(r => r.status === ReleaseStatus.APROVADO).length;

    // Filter Finalized in current month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const final = releases.filter(r => {
      if (r.status !== ReleaseStatus.FINALIZADO) return false;
      const d = new Date(r.createdAt); // OR releaseDate? Using createdAt for operational metric
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card onClick={() => setTab('RELEASES')} className="border-l-4 border-l-yellow-500 cursor-pointer hover:bg-input transition-colors">
          <h3 className="text-gray-400 text-sm uppercase">Pendências (Análise)</h3>
          <p className="text-4xl font-bold text-white mt-2">{pending}</p>
        </Card>
        <Card onClick={() => setTab('RELEASES')} className="border-l-4 border-l-blue-500 cursor-pointer hover:bg-input transition-colors">
          <h3 className="text-gray-400 text-sm uppercase">Aguardando Distribuição</h3>
          <p className="text-4xl font-bold text-white mt-2">{approved}</p>
        </Card>
        <Card onClick={() => setTab('HISTORY')} className="border-l-4 border-l-gold cursor-pointer hover:bg-input transition-colors">
          <h3 className="text-gray-400 text-sm uppercase">Finalizados (Mês Atual)</h3>
          <p className="text-4xl font-bold text-white mt-2">{final}</p>
        </Card>
      </div>
    );
  };

  const renderReleaseTable = (data: Release[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
            <th className="p-4">Projeto</th>
            <th className="p-4">Artista</th>
            <th className="p-4">Gênero</th>
            <th className="p-4">Data</th>
            <th className="p-4">Status</th>
            <th className="p-4">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {data.map(r => (
            <tr key={r.id} className="hover:bg-white/5 transition-colors">
              <td className="p-4 font-medium text-white">{r.title} <span className="text-xs text-gray-500 block">{r.type}</span></td>
              <td className="p-4 text-gray-300">{r.mainArtist}</td>
              <td className="p-4 text-gray-300">{r.genre}</td>
              <td className="p-4 text-gray-300">{formatDate(r.releaseDate)}</td>
              <td className="p-4"><Badge status={r.status} /></td>
              <td className="p-4">
                <button onClick={() => setSelectedRelease(r)} className="text-gold hover:text-white text-sm font-medium">
                  Detalhes
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <p className="text-center text-gray-500 py-8">Nenhum lançamento encontrado.</p>}
    </div>
  );

  const renderReleasesTab = () => {
    // Show active releases (Analysis, Approved, Distributed)
    const active = releases.filter(r => r.status !== ReleaseStatus.FINALIZADO && r.status !== ReleaseStatus.REJEITADO);
    return renderReleaseTable(active);
  };

  const renderHistoryTab = () => {
    // Show "Finished" releases (and maybe Rejected/Distributed if defined)
    // User specifically mentioned "Finalizados" -> History
    const history = releases.filter(r => r.status === ReleaseStatus.FINALIZADO || r.status === ReleaseStatus.REJEITADO);
    return renderReleaseTable(history);
  };

  const renderGenresTab = () => {
    // Extract unique genres and count
    const genreCounts = releases.reduce((acc, curr) => {
      acc[curr.genre] = (acc[curr.genre] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Combine GENRE_OPTIONS with actual counts, including 0s
    // Also consider "Outros" subgenres if needed, but let's stick to main categories for now + whatever custom genres exist

    // Get all known genres from options + any that might be in the DB but not in options (legacy/custom)
    const allKnownGenres = new Set([...GENRE_OPTIONS.map(g => g.value), ...Object.keys(genreCounts)]);

    const sortedGenres = Array.from(allKnownGenres)
      .map(genre => ({ name: genre, count: genreCounts[genre] || 0 }))
      .sort((a, b) => b.count - a.count); // Most popular first

    return (
      <Card>
        <h3 className="text-gray-400 text-sm uppercase mb-6">Gêneros (Ativos e Disponíveis)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sortedGenres.map(({ name, count }) => (
            <div key={name} className={`bg-input p-4 rounded-lg border flex justify-between items-center group transition-colors ${count > 0 ? 'border-gold/30 hover:border-gold' : 'border-gray-800 opacity-60'}`}>
              <span className={`font-medium ${count > 0 ? 'text-white' : 'text-gray-500'}`}>{name}</span>
              <span className={`text-xs px-2 py-1 rounded-full font-bold ${count > 0 ? 'bg-gold/10 text-gold' : 'bg-gray-800 text-gray-600'}`}>{count}</span>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background text-gray-200 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-surface border-r border-gray-800 flex flex-col fixed md:relative h-full z-40">
        <div className="p-6 flex flex-col items-center border-b border-gray-800">
          <Logo className="h-24 mb-4" />
          <span className="text-xs font-bold text-gold tracking-widest">PAINEL ADMIN</span>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="mb-6">
            <button
              onClick={() => setTab('NEW_RELEASE')}
              className={`w-full text-center px-4 py-3 rounded-lg text-sm font-bold bg-gold text-white shadow-lg shadow-gold/20 hover:bg-gold-hover transition-all mb-2`}
            >
              + Novo Lançamento
            </button>
          </div>

          <button
            onClick={() => setTab('DASHBOARD')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${tab === 'DASHBOARD' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setTab('RELEASES')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${tab === 'RELEASES' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            Lançamentos
          </button>
          <button
            onClick={() => setTab('HISTORY')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${tab === 'HISTORY' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            Histórico
          </button>
          <button
            onClick={() => setTab('ARTISTS')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${tab === 'ARTISTS' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            Artistas
          </button>
          <button
            onClick={() => setTab('GENRES')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${tab === 'GENRES' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            Gêneros
          </button>
        </nav>

        <div className="p-6 border-t border-gray-800">
          <button onClick={() => window.location.hash = '/'} className="text-xs text-gray-500 hover:text-white flex items-center gap-2">
            ← Voltar ao Site
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto h-screen relative">
        {tab === 'NEW_RELEASE' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Criar Novo Lançamento</h2>
              <button onClick={() => setTab('DASHBOARD')} className="text-sm text-gray-500 hover:text-white">Cancelar</button>
            </div>
            {/* Wrap SubmissionForm to handle style context if needed */}
            <SubmissionForm />
          </div>
        ) : (
          <>
            <header className="flex justify-between items-end mb-8 border-b border-gray-800 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {tab === 'DASHBOARD' && 'Visão Geral'}
                  {tab === 'RELEASES' && 'Lançamentos Ativos'}
                  {tab === 'HISTORY' && 'Histórico de Lançamentos'}
                  {tab === 'ARTISTS' && 'Gerenciar Artistas'}
                  {tab === 'GENRES' && 'Catálogo de Gêneros'}
                </h1>
                <p className="text-sm text-gray-500">
                  {tab === 'DASHBOARD' && 'Resumo da operação da gravadora.'}
                  {tab === 'RELEASES' && 'Gerencie os lançamentos em andamento.'}
                  {tab === 'HISTORY' && 'Lançamentos finalizados ou arquivados.'}
                  {tab === 'ARTISTS' && 'Base de dados de artistas e compositores.'}
                  {tab === 'GENRES' && 'Gêneros musicais ativos na plataforma.'}
                </p>
              </div>
            </header>

            {tab === 'DASHBOARD' && renderDashboardTab()}
            {tab === 'RELEASES' && renderReleasesTab()}
            {tab === 'HISTORY' && renderHistoryTab()}
            {tab === 'GENRES' && renderGenresTab()}
            {tab === 'ARTISTS' && (
              <Card>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-gray-400 text-sm uppercase">Banco de Artistas</h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        if (!window.confirm('Isso irá formatar (Maiúsculas/Minúsculas) todos os nomes de artistas e compositores em todos os lançamentos. Continuar?')) return;
                        try {
                          const count = await releaseService.normalizeDatabase(require('../utils').smartTitleCase);
                          alert(`Sucesso! ${count} lançamentos foram atualizados e padronizados.`);
                          fetchReleases();
                        } catch (e) {
                          alert('Erro ao normalizar.');
                        }
                      }}
                      variant="secondary"
                      className="text-xs py-2"
                    >
                      🪄 Padronizar Nomes
                    </Button>
                    <Button onClick={() => setShowArtistModal(true)} size="sm">
                      + Novo Artista
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set([...releases.map(r => r.mainArtist).flat(), ...extraArtists])).sort().map(artist => (
                    <span key={artist} className="bg-input px-4 py-2 rounded-lg text-sm border border-gray-700 hover:border-gold transition-colors cursor-pointer text-gray-300">
                      {artist}
                    </span>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </main>

      {/* New Artist Modal */}
      {showArtistModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 border-gold/20">
            <h2 className="text-xl font-bold text-white mb-4">Adicionar Novo Artista</h2>
            <p className="text-sm text-gray-400 mb-6">Este artista aparecerá nas sugestões ao criar lançamentos.</p>

            <div className="space-y-4">
              <Input
                label="Nome do Artista"
                value={newArtistName}
                onChange={(e) => setNewArtistName(e.target.value)}
                placeholder="Ex: Mc Kevin"
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button onClick={() => setShowArtistModal(false)} variant="ghost" type="button">Cancelar</Button>
                <Button
                  onClick={async () => {
                    if (!newArtistName.trim()) return;
                    setIsSubmittingArtist(true);
                    try {
                      const formattedName = smartTitleCase(newArtistName);
                      await releaseService.addArtist(formattedName);
                      alert('Artista adicionado com sucesso!');
                      setNewArtistName('');
                      setShowArtistModal(false);
                      fetchReleases(); // Updates the list
                    } catch (e) {
                      alert('Erro ao salvar artista.');
                    } finally {
                      setIsSubmittingArtist(false);
                    }
                  }}
                  disabled={isSubmittingArtist}
                >
                  {isSubmittingArtist ? 'Salvando...' : 'Salvar Artista'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Artist Detail Modal */}
      {selectedArtist && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl">
            <div className="sticky top-0 bg-surface border-b border-gray-800 p-6 flex justify-between items-center z-10">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedArtist}</h2>
                <p className="text-sm text-gray-500">Histórico de Lançamentos</p>
              </div>
              <button onClick={() => setSelectedArtist(null)} className="text-gray-500 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-6">
              {renderReleaseTable(releases.filter(r => r.mainArtist.includes(selectedArtist) || r.tracks.some(t => t.artist.includes(selectedArtist))))}
            </div>
          </div>
        </div>
      )}

      {/* Release Detail Modal */}
      {selectedRelease && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl">
            <div className="sticky top-0 bg-surface border-b border-gray-800 p-6 flex justify-between items-center z-10">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedRelease.title}</h2>
                <div className="flex gap-2 mt-1">
                  {selectedRelease.mainArtist.map(a => (
                    <span key={a} className="text-gold text-xs bg-gold/10 px-2 py-1 rounded">{a}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => setSelectedRelease(null)} className="text-gray-500 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Details & Files */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="block text-gray-500">Gênero</span>
                    <span className="text-white">{selectedRelease.genre}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">Data Lançamento</span>
                    <span className="text-white">{formatDate(selectedRelease.releaseDate)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-400 uppercase">Arquivos</h3>

                  <div className="bg-input p-3 rounded flex justify-between items-center">
                    <span className="text-sm text-gray-300">Capa: {selectedRelease.coverFileName || 'Sem arquivo'}</span>
                    <button onClick={() => handleDownload(selectedRelease.coverFileName, selectedRelease.coverUrl, 'cover')} className="text-gold text-xs hover:underline">Baixar</button>
                  </div>

                  {selectedRelease.tracks.map((t, idx) => (
                    <div key={t.id} className="bg-input p-3 rounded flex flex-col gap-2">
                      <div className="flex justify-between">
                        <span className="font-medium text-white">{idx + 1}. {t.title}</span>
                        <button onClick={() => handleDownload(t.audioFileName, (t as any).audioUrl, 'audio')} className="text-gold text-xs hover:underline">Baixar Áudio</button>
                      </div>
                      <div className="text-xs text-gray-500 flex flex-col gap-1">
                        <div className="flex gap-4">
                          <span>ISRC: {t.isrc || 'N/A'}</span>
                          <span>Hash: {t.audioHash ? t.audioHash.substring(0, 10) + '...' : 'Pendente'}</span>
                        </div>
                        <div className="flex gap-4">
                          <span>Compositor: {t.composer.join(', ') || '-'}</span>
                        </div>
                        {t.lyrics && <details className="cursor-pointer"><summary>Ver Letra</summary><p className="italic mt-1 whitespace-pre-wrap">{t.lyrics}</p></details>}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {t.artist.map(a => <span key={a} className="text-[10px] bg-white/5 px-1 rounded text-gray-400">{a}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Workflow */}
              <div className="space-y-6 border-l border-gray-800 lg:pl-6">
                <div className="bg-input rounded-lg p-4 text-center">
                  <span className="text-xs text-gray-500 block mb-1">Status Atual</span>
                  <Badge status={selectedRelease.status} />
                  {selectedRelease.purged && <span className="block text-[10px] text-red-400 uppercase font-bold mt-1">Mídia Excluída</span>}
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-white">Checklist de Aprovação</h3>

                  <label className="flex items-center gap-3 p-3 rounded hover:bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-gold w-5 h-5"
                      checked={selectedRelease.checklist.arquivosConferidos}
                      onChange={(e) => handleStatusUpdate({ ...selectedRelease.checklist, arquivosConferidos: e.target.checked })}
                    />
                    <span className={selectedRelease.checklist.arquivosConferidos ? 'text-white' : 'text-gray-500'}>1. Arquivos Conferidos</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded hover:bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-gold w-5 h-5"
                      checked={selectedRelease.checklist.metadadosVerificados}
                      onChange={(e) => handleStatusUpdate({ ...selectedRelease.checklist, metadadosVerificados: e.target.checked })}
                    />
                    <span className={selectedRelease.checklist.metadadosVerificados ? 'text-white' : 'text-gray-500'}>2. Metadados Ok</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded hover:bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-gold w-5 h-5"
                      checked={selectedRelease.checklist.enviadoDistribuidora}
                      onChange={(e) => handleStatusUpdate({ ...selectedRelease.checklist, enviadoDistribuidora: e.target.checked })}
                    />
                    <span className={selectedRelease.checklist.enviadoDistribuidora ? 'text-white' : 'text-gray-500'}>3. Enviado OneRPM/Outros</span>
                  </label>

                  {selectedRelease.checklist.enviadoDistribuidora && (
                    <label className="flex items-center gap-3 p-3 rounded hover:bg-white/5 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-gold w-5 h-5"
                        checked={selectedRelease.checklist.shareInEnviado}
                        onChange={(e) => handleStatusUpdate({ ...selectedRelease.checklist, shareInEnviado: e.target.checked })}
                      />
                      <span className={selectedRelease.checklist.shareInEnviado ? 'text-white' : 'text-gray-500'}>4. Share-in Enviado</span>
                    </label>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400 uppercase">Observações do Admin</label>
                  <textarea
                    className="w-full bg-input border border-gray-700 rounded p-2 text-sm text-white focus:border-gold outline-none h-24"
                    placeholder="Anotações internas..."
                    defaultValue={selectedRelease.adminNotes || ''}
                    onBlur={async (e) => {
                      const val = e.target.value;
                      if (val !== selectedRelease.adminNotes) {
                        const doc = require('firebase/firestore').doc(require('../services/firebase').db, 'lancamentos', selectedRelease.id);
                        await require('firebase/firestore').updateDoc(doc, { adminNotes: val });
                      }
                    }}
                  />
                </div>

                <div className="pt-6 border-t border-gray-800 space-y-3">
                  <Button variant="secondary" onClick={handlePurge} className="w-full text-sm border-red-900/30 text-red-400 hover:bg-red-900/10 hover:text-red-200" disabled={!!selectedRelease.purged}>
                    {selectedRelease.purged ? 'Mídia Já Excluída' : '⚠️ Excluir Mídia (Purge)'}
                  </Button>
                  <Button variant="danger" onClick={handleDelete} className="w-full text-sm">
                    Excluir Lançamento (Irreversível)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminRoot: React.FC = () => {
  const [isLogged, setIsLogged] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLogged(!!user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-gold">Carregando...</div>;
  if (!isLogged) return <AdminLogin onLogin={() => setIsLogged(true)} />;
  return <Dashboard />;
};