import React, { useState, useEffect } from 'react';
import NotificationMonitor from './NotificationMonitor';
import { Release, ReleaseStatus, ReleaseChecklist, GENRE_OPTIONS } from '../types';
import { releaseService } from '../services/firebaseService';
import { Button, Card, Badge, Input, cn } from './UI';
import { Logo } from './Logo';
import { formatDate, getStatusColor, smartTitleCase, APP_VERSION } from '../utils';
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
    <div className="min-h-screen flex items-center justify-center bg-black">
      <Card className="w-full max-w-md p-8 border-gold/20 shadow-[0_0_50px_rgba(212,175,55,0.1)]">
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo className="h-32 mb-4 drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]" />
          <p className="text-gold/60 tracking-[0.3em] text-[10px] font-medium mt-1">ACESSO RESTRITO</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {error && <p className="text-red-400 text-xs font-medium tracking-wide">{error}</p>}
          <Button type="submit" className="w-full">Entrar no Sistema</Button>
        </form>
      </Card>
    </div>
  );
};

import { useNavigate } from 'react-router-dom';

// --- DASHBOARD COMPONENT ---
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [releases, setReleases] = useState<Release[]>([]);
  const [tab, setTab] = useState<'DASHBOARD' | 'RELEASES' | 'HISTORY' | 'ARTISTS' | 'GENRES' | 'NEW_RELEASE' | 'SETTINGS'>('DASHBOARD');

  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // New Artist Modal State
  const [showArtistModal, setShowArtistModal] = useState(false);
  const [newArtistName, setNewArtistName] = useState('');
  const [extraArtists, setExtraArtists] = useState<string[]>([]);
  const [isSubmittingArtist, setIsSubmittingArtist] = useState(false);

  // New Genre Modal State
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [newGenreName, setNewGenreName] = useState('');
  const [extraGenres, setExtraGenres] = useState<string[]>([]);
  const [isSubmittingGenre, setIsSubmittingGenre] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(window.deferredPrompt || null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if device is iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.deferredPrompt = e;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const fetchReleases = async () => {
    const data = await releaseService.getAll();
    setReleases(data);
    const stored = await releaseService.getStoredArtists();
    setExtraArtists(stored);
    const storedGenres = await releaseService.getStoredGenres();
    setExtraGenres(storedGenres);
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  const handleStatusUpdate = async (checklist: ReleaseChecklist) => {
    if (!selectedRelease) return;
    await releaseService.updateStatus(selectedRelease.id, checklist);
    await fetchReleases();
    setSelectedRelease(prev => prev ? { ...prev, checklist } : null);
  };

  const handleDelete = async () => {
    if (!selectedRelease || !window.confirm('Excluir este projeto permanentemente? Isso não pode ser desfeito.')) return;
    try {
      await releaseService.deletePermanently(selectedRelease);
      setSelectedRelease(null);
      fetchReleases();
    } catch (error) {
      console.error('Erro ao excluir projeto:', error);
      alert('Não foi possível excluir o projeto. Tente novamente.');
    }
  };

  const handlePurge = async () => {
    if (!selectedRelease || !window.confirm('Isso apagará os arquivos de áudio e capa para economizar espaço, mantendo os dados. Confirmar?')) return;
    try {
      await releaseService.purgeReleaseMedia(selectedRelease);
      /* Modal de sucesso */
      setSelectedRelease(null);
      fetchReleases();
    } catch (e) {
      alert('Erro ao excluir mídia.');
      console.error(e);
    }
  };

  const handleDownload = async (fileName: string | undefined, url: string | undefined, type: 'audio' | 'cover') => {
    if (url && fileName && selectedRelease) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(objectUrl);
      } catch (err) {
        console.error('Download fetch failed, falling back to window.open', err);
        window.open(url, '_blank');
      }
    }
  };

  const renderDashboardTab = () => {
    const pending = releases.filter(r => r.status === ReleaseStatus.EM_ANALISE || r.status === ReleaseStatus.NAO_SUBIDO).length;
    const approved = releases.filter(r => r.status === ReleaseStatus.APROVADO).length;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const final = releases.filter(r => {
      if (r.status !== ReleaseStatus.FINALIZADO) return false;
      const d = new Date(r.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const recentReleases = [...releases]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6); // Show latest 6

    return (
      <div className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: 'Pendências (Análise)', value: pending, color: 'border-l-yellow-500', tab: 'RELEASES' },
            { label: 'Aguardando Distribuição', value: approved, color: 'border-l-blue-500', tab: 'RELEASES' },
            { label: 'Finalizados (Mês Atual)', value: final, color: 'border-l-gold', tab: 'HISTORY' }
          ].map((stat) => (
            <Card
              key={stat.label}
              onClick={() => setTab(stat.tab as any)}
              className={cn('border-l-4 cursor-pointer hover:-translate-y-1 transition-all duration-300', stat.color)}
            >
              <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</h3>
              <p className="text-5xl font-black text-white mt-4 italic">{stat.value}</p>
            </Card>
          ))}
        </div>

        <div>
          <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            Lançamentos Recentes
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentReleases.map(r => (
              <div
                key={r.id}
                onClick={() => setSelectedRelease(r)}
                className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/50 cursor-pointer hover:bg-zinc-800/60 hover:border-gold/30 transition-all duration-300 group flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <span className="font-black text-white uppercase tracking-tight group-hover:text-gold transition-colors">{r.title}</span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">{r.mainArtist.join(' & ')}</span>
                </div>
                <svg className="w-5 h-5 text-zinc-600 group-hover:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </div>
            ))}
          </div>
          {recentReleases.length === 0 && (
            <div className="text-center py-10 bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-800">
              <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em]">Nenhum lançamento recente</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderReleaseTable = (data: Release[]) => (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left border-separate border-spacing-y-2">
        <thead>
          <tr className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">
            <th className="px-6 py-4">Projeto / Artista</th>
            <th className="px-6 py-4">Gênero</th>
            <th className="px-6 py-4">Data</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Ação</th>
          </tr>
        </thead>
        <tbody>
          {data.map(r => (
            <tr key={r.id} className="group bg-zinc-900/40 hover:bg-zinc-800/60 transition-all duration-300 rounded-xl overflow-hidden backdrop-blur-sm border border-zinc-800/50">
              <td className="px-6 py-5">
                <div className="flex flex-col">
                  <span className="font-black text-white uppercase tracking-tight group-hover:text-gold transition-colors">{r.title}</span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">{r.mainArtist.join(' & ')} • {r.type}</span>
                </div>
              </td>
              <td className="px-6 py-5 text-xs font-bold text-zinc-400 italic">{r.genre}</td>
              <td className="px-6 py-5 text-xs text-zinc-500">{formatDate(r.releaseDate)}</td>
              <td className="px-6 py-5"><Badge status={r.status} /></td>
              <td className="px-6 py-5 text-right">
                <button
                  onClick={() => setSelectedRelease(r)}
                  className="bg-gold/10 text-gold px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-gold hover:text-black transition-all duration-300"
                >
                  Gerenciar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="text-center py-20 bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-800">
          <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em]">Nenhum lançamento encontrado</p>
        </div>
      )}
    </div>
  );

  const renderReleasesTab = () => {
    const active = releases.filter(r => r.status !== ReleaseStatus.FINALIZADO && r.status !== ReleaseStatus.REJEITADO);
    return renderReleaseTable(active);
  };

  const renderHistoryTab = () => {
    const history = releases.filter(r => r.status === ReleaseStatus.FINALIZADO || r.status === ReleaseStatus.REJEITADO);
    return renderReleaseTable(history);
  };

  const renderGenresTab = () => {
    const genreCounts = releases.reduce((acc, curr) => {
      acc[curr.genre] = (acc[curr.genre] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const allKnownGenres = new Set([...GENRE_OPTIONS.map(g => g.value), ...extraGenres, ...Object.keys(genreCounts)]);
    const sortedGenres = Array.from(allKnownGenres)
      .map(genre => ({ name: genre, count: genreCounts[genre] || 0 }))
      .sort((a, b) => b.count - a.count);

    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center bg-zinc-950/40 p-6 rounded-2xl border border-zinc-800">
          <div className="flex flex-col">
            <h3 className="text-zinc-400 text-xs font-semibold tracking-[0.2em] uppercase">Catálogo de Gêneros</h3>
            <span className="text-[10px] text-zinc-600 tracking-widest mt-1">Adicione ou gerencie os estilos musicais disponíveis no formulário</span>
          </div>
          <Button onClick={() => setShowGenreModal(true)} size="sm" className="text-[10px] font-semibold tracking-widest">
            + Adicionar Gênero
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sortedGenres.map(({ name, count }) => (
            <div key={name} className={cn(
              'p-6 rounded-2xl border transition-all duration-500 flex flex-col gap-3 group',
              count > 0 ? 'bg-zinc-900/60 border-gold/20 hover:border-gold shadow-lg shadow-black/50' : 'bg-zinc-950/40 border-zinc-800 opacity-50'
            )}>
              <div className="flex justify-between items-start">
                <span className={cn('text-[10px] font-black uppercase tracking-[0.2em]', count > 0 ? 'text-zinc-400' : 'text-zinc-700')}>Gênero Musical</span>
                <span className={cn('text-lg font-black italic', count > 0 ? 'text-gold/40' : 'text-zinc-800')}>{count}</span>
              </div>
              <span className={cn('text-sm font-black uppercase tracking-tight', count > 0 ? 'text-white group-hover:text-gold transition-colors' : 'text-zinc-600')}>{name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSettingsTab = () => {
    const handleCheckUpdate = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.update().then(() => {
            window.location.reload();
          });
        });
      } else {
        window.location.reload();
      }
    };

    return (
      <div className="space-y-6 max-w-2xl">
        <Card className="p-8 border-zinc-800/50">
          <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-8">Sistema & Diagnóstico</h3>
          <div className="grid gap-4">
            <div className="p-6 bg-zinc-950/60 rounded-2xl border border-zinc-900 group">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tight text-white mb-1">Versão do Sistema</h4>
                  <p className="text-xs text-zinc-500">v{APP_VERSION} - BlackStar Engine</p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleCheckUpdate} className="text-[9px] font-black uppercase tracking-widest">Forçar Update</Button>
              </div>
            </div>

            <div className="p-6 bg-zinc-950/60 rounded-2xl border border-zinc-900">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tight text-white mb-1">Caches Locais</h4>
                  <p className="text-xs text-zinc-500">Limpar dados temporários do navegador</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-[9px] font-black uppercase tracking-widest">Limpar Cache</Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-gray-200 flex flex-col md:flex-row font-sans selection:bg-gold/30">
      <NotificationMonitor />

      {/* Mobile Header */}
      <div className="md:hidden bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-zinc-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <Logo className="h-8" />
        </div>
        <span className="text-[10px] font-black text-gold tracking-[0.2em] uppercase">Admin Access</span>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-zinc-950/90 backdrop-blur-2xl border-r border-zinc-800/50 flex flex-col transform transition-all duration-500 ease-in-out md:relative md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0 shadow-[20px_0_50px_rgba(0,0,0,0.5)]" : "-translate-x-full"
      )}>
        <div className="px-6 pt-14 pb-8 flex flex-col items-center border-b border-zinc-800/30 relative">
          <div className="flex w-full items-center justify-center relative">
            <div className="flex flex-col items-center group">
              <Logo className="h-20 group-hover:scale-105 transition-transform duration-500 drop-shadow-[0_0_20px_rgba(212,175,55,0.2)]" />
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden absolute right-0 text-zinc-500 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>

        <nav className="flex-1 px-6 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <div className="mb-4">
            <button
              onClick={() => { setTab('NEW_RELEASE'); setIsMobileMenuOpen(false); }}
              className="w-full group relative flex items-center justify-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black bg-gold text-black shadow-[0_15px_30px_rgba(212,175,55,0.15)] hover:shadow-[0_20px_40px_rgba(212,175,55,0.25)] hover:-translate-y-1 active:scale-95 transition-all duration-300 uppercase tracking-[0.2em] overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-[-25deg]" />
              <span className="text-xl leading-none font-light">+</span>
              <span>Cadastrar</span>
            </button>
          </div>

          {[
            { id: 'DASHBOARD', label: 'Visão Geral' },
            { id: 'RELEASES', label: 'Projetos' },
            { id: 'HISTORY', label: 'Histórico' },
            { id: 'ARTISTS', label: 'Artistas' },
            { id: 'GENRES', label: 'Catálogo' },
            { id: 'SETTINGS', label: 'Sistema' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { setTab(item.id as any); setIsMobileMenuOpen(false); }}
              className={cn(
                'w-full flex items-center px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all duration-300 group relative overflow-hidden',
                tab === item.id
                  ? 'bg-zinc-900/80 text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-zinc-800'
                  : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900/30'
              )}
            >
              {tab === item.id && <div className="absolute left-0 top-3 bottom-3 w-1 bg-gold rounded-full shadow-[0_0_15px_rgba(212,175,55,1)]" />}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-zinc-900/50">
          <button onClick={() => navigate('/')} className="text-[9px] font-black text-zinc-600 hover:text-gold uppercase tracking-[0.2em] flex items-center gap-2 transition-colors">
            <span className="text-xs">←</span> Sair do Sistema
          </button>
          <div className="mt-4 flex flex-col gap-1">
            <span className="text-[8px] text-zinc-800 font-black uppercase tracking-widest">BlackStar Engine</span>
            <span className="text-[8px] text-zinc-700 font-mono">Build #{APP_VERSION}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-14 overflow-y-auto h-[calc(100vh-65px)] md:h-screen custom-scrollbar">
        {tab === 'NEW_RELEASE' ? (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-10 pb-6 border-b border-zinc-900">
              <div className="flex flex-col">
                <h1 className="text-4xl font-semibold italic text-white tracking-tight">Novo Lançamento</h1>
                <span className="text-[10px] text-zinc-600 tracking-[0.2em] mt-1">Preencha os metadados do projeto</span>
              </div>
              <button
                onClick={() => setTab('DASHBOARD')}
                className="text-[10px] font-semibold tracking-[0.2em] text-zinc-600 hover:text-white transition-colors"
              >
                Voltar
              </button>
            </div>
            <SubmissionForm />
          </div>
        ) : (
          <div className="animate-in fade-in duration-700 max-w-7xl mx-auto">
            <header className="flex flex-col mb-12">
              <div className="flex items-center gap-4 mb-3">
                <div className="h-0.5 w-12 bg-gold/50" />
                <span className="text-[11px] font-semibold tracking-[0.4em] text-gold/80 italic">BlackStar Dashboard</span>
              </div>
              <h1 className="text-4xl font-semibold text-white italic tracking-tight">
                {tab === 'DASHBOARD' && 'Visão Geral'}
                {tab === 'RELEASES' && 'Projetos Ativos'}
                {tab === 'HISTORY' && 'Arquivo Geral'}
                {tab === 'ARTISTS' && 'Banco de Talentos'}
                {tab === 'GENRES' && 'Catálogo Musical'}
                {tab === 'SETTINGS' && 'Preferências'}
              </h1>
            </header>

            {tab === 'DASHBOARD' && renderDashboardTab()}
            {tab === 'RELEASES' && renderReleasesTab()}
            {tab === 'HISTORY' && renderHistoryTab()}
            {tab === 'GENRES' && renderGenresTab()}
            {tab === 'SETTINGS' && renderSettingsTab()}
            {tab === 'ARTISTS' && (
              <Card>
                <div className="flex justify-between items-center mb-10">
                  <div className="flex flex-col">
                    <h3 className="text-zinc-400 text-xs font-semibold tracking-[0.2em]">Diretório de Artistas</h3>
                    <span className="text-[10px] text-zinc-600 tracking-widest mt-1">Sincronizado com a base de dados central</span>
                  </div>
                  <div className="flex gap-4">
                    <Button
                      onClick={async () => {
                        if (!window.confirm('Normalizar todos os nomes na base de dados?')) return;
                        try {
                          const count = await releaseService.normalizeDatabase(smartTitleCase);
                          alert(`Sucesso! ${count} registros padronizados.`);
                          fetchReleases();
                        } catch (e) {
                          alert('Erro na normalização.');
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="text-[10px] font-semibold"
                    >
                      🧪 Normalizar nomes
                    </Button>
                    <Button onClick={() => setShowArtistModal(true)} size="sm" className="text-[10px] font-semibold tracking-widest">
                      + Adicionar Artista
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {Array.from(new Set([...releases.map(r => r.mainArtist).flat(), ...extraArtists])).sort().map(artist => (
                    <span
                      key={artist}
                      className="bg-zinc-950/40 px-5 py-3 rounded-2xl text-xs font-semibold border border-zinc-900 hover:border-gold hover:bg-zinc-900 transition-all duration-300 cursor-pointer text-zinc-400 hover:text-white"
                    >
                      {artist}
                    </span>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* New Artist Modal, Release Detail Modal, etc. (Manter lógica existente, mas com novo estilo) */}
      {/* Omitindo detalhes internos dos modais nesta versão para brevidade, mas o estilo Card/Input/Button cuidará da aparência */}

      {/* Re-implementando os modais rapidamente para manter funcionalidade */}
      {showArtistModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <Card className="w-full max-w-md p-10 border-gold/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-30" />
            <h2 className="text-xl font-semibold italic text-white tracking-tight mb-2">Novo Artista</h2>
            <p className="text-[10px] text-zinc-500 tracking-[0.2em] mb-10">Adicionar à base de dados central</p>

            <div className="space-y-8">
              <Input
                label="Nome Artístico"
                value={newArtistName}
                onChange={(e) => setNewArtistName(e.target.value)}
                placeholder="Ex: MC JEFSON"
              />

              <div className="flex justify-end gap-4 pt-4 border-t border-zinc-900">
                <Button onClick={() => setShowArtistModal(false)} variant="ghost" className="text-[10px] font-semibold tracking-widest">Cancelar</Button>
                <Button
                  onClick={async () => {
                    if (!newArtistName.trim()) return;
                    setIsSubmittingArtist(true);
                    try {
                      await releaseService.addArtist(smartTitleCase(newArtistName));
                      setNewArtistName('');
                      setShowArtistModal(false);
                      fetchReleases();
                    } catch (e) {
                      alert('Erro ao salvar.');
                    } finally {
                      setIsSubmittingArtist(false);
                    }
                  }}
                  disabled={isSubmittingArtist}
                  className="text-[10px] font-semibold tracking-widest"
                >
                  {isSubmittingArtist ? 'Processando...' : 'Salvar Registro'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* New Genre Modal */}
      {showGenreModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <Card className="w-full max-w-md p-10 border-gold/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-30" />
            <h2 className="text-xl font-semibold italic text-white tracking-tight mb-2">Novo Gênero Musical</h2>
            <p className="text-[10px] text-zinc-500 tracking-[0.2em] mb-10">Adicionar ao catálogo do painel</p>

            <div className="space-y-8">
              <Input
                label="Nome do Gênero"
                value={newGenreName}
                onChange={(e) => setNewGenreName(e.target.value)}
                placeholder="Ex: R&B"
              />

              <div className="flex justify-end gap-4 pt-4 border-t border-zinc-900">
                <Button onClick={() => setShowGenreModal(false)} variant="ghost" className="text-[10px] font-semibold tracking-widest">Cancelar</Button>
                <Button
                  onClick={async () => {
                    if (!newGenreName.trim()) return;
                    setIsSubmittingGenre(true);
                    try {
                      await releaseService.addGenre(smartTitleCase(newGenreName));
                      setNewGenreName('');
                      setShowGenreModal(false);
                      fetchReleases();
                    } catch (e) {
                      alert('Erro ao salvar gênero.');
                    } finally {
                      setIsSubmittingGenre(false);
                    }
                  }}
                  disabled={isSubmittingGenre}
                  className="text-[10px] font-semibold tracking-widest"
                >
                  {isSubmittingGenre ? 'Processando...' : 'Adicionar Gênero'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Release Detail Modal - Versão Premium */}
      {selectedRelease && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-2xl z-[100] flex items-center justify-center lg:p-12">
          <div className="bg-zinc-950 h-full w-full lg:max-w-6xl lg:h-auto lg:max-h-[85vh] lg:rounded-[2.5rem] lg:border border-zinc-800/50 shadow-[0_50px_100px_rgba(0,0,0,1)] overflow-hidden flex flex-col relative">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-gold/5 to-transparent pointer-events-none" />

            <div className="p-8 lg:p-12 border-b border-zinc-900 flex justify-between items-center bg-zinc-950/50 relative z-10">
              <div className="flex flex-col">
                <h2 className="text-2xl lg:text-4xl font-semibold text-white italic tracking-tight leading-none">{selectedRelease.title}</h2>
                <div className="flex flex-wrap gap-2 mt-4">
                  {selectedRelease.mainArtist.map(a => (
                    <span key={a} className="text-[10px] font-semibold bg-gold/5 text-gold border border-gold/10 px-3 py-1.5 rounded-full tracking-widest">{a}</span>
                  ))}
                  <Badge status={selectedRelease.status} />
                </div>
              </div>
              <div className="flex items-center gap-4">
                {selectedRelease.purged ? (
                  <div
                    className="w-12 h-12 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center text-zinc-600 cursor-not-allowed"
                    title="Arquivos de Mídia já foram excluídos"
                  >
                    <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                  </div>
                ) : (
                  <button
                    onClick={handlePurge}
                    className="w-12 h-12 rounded-full bg-orange-950/20 border border-orange-900/30 flex items-center justify-center text-orange-500/70 hover:text-orange-500 hover:bg-orange-950/60 hover:border-orange-500 hover:scale-110 transition-all duration-300 shadow-[0_0_20px_rgba(249,115,22,0.1)]"
                    title="Excluir Arquivos do Storage (Áudio e Capa)"
                  >
                    <svg className="w-5 h-5 outline-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="w-12 h-12 rounded-full bg-red-950/20 border border-red-900/30 flex items-center justify-center text-red-500/70 hover:text-red-500 hover:bg-red-950/60 hover:border-red-500 hover:scale-110 transition-all duration-300 shadow-[0_0_20px_rgba(220,38,38,0.1)]"
                  title="Excluir Lançamento"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
                <button
                  onClick={() => setSelectedRelease(null)}
                  className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 hover:rotate-90 transition-all duration-500"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                <div className="lg:col-span-2 space-y-12">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-semibold text-zinc-600 tracking-widest">Informação Geral</span>
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[10px]">Gênero</span>
                        <span className="text-white font-semibold">{selectedRelease.genre}{selectedRelease.subGenre ? ` - ${selectedRelease.subGenre}` : ''}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-semibold text-zinc-600 tracking-widest">Calendário</span>
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[10px]">Lançamento</span>
                        <span className="text-white font-semibold">{formatDate(selectedRelease.releaseDate)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-semibold text-zinc-600 tracking-widest">Identificação</span>
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[10px]">ID do Projeto / Título</span>
                        <span className="text-white font-mono text-[10px] font-semibold">{selectedRelease.id}</span>
                        <span className="text-zinc-400 font-semibold text-[10px] mt-1">{selectedRelease.title}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <h3 className="text-xs font-semibold text-zinc-400 tracking-[0.3em]">Repositório de Arquivos</h3>
                      <div className="h-px flex-1 bg-zinc-900" />
                    </div>

                    <div className="bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800/50 flex justify-between items-center group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gold/10 rounded-2xl flex items-center justify-center border border-gold/5 group-hover:bg-gold/20 transition-colors">
                          <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-white tracking-tight">Arte da Capa</span>
                          <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[200px]">{selectedRelease.coverFileName || 'Pendente'}</span>
                        </div>
                      </div>
                      <Button variant="ghost" onClick={() => handleDownload(selectedRelease.coverFileName, selectedRelease.coverUrl, 'cover')} className="text-[10px] font-semibold text-gold">Download</Button>
                    </div>

                    {selectedRelease.tracks.map((t, idx) => {
                      return (
                        <div key={t.id} className="bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800/50 flex flex-col gap-6 group">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              <span className="text-3xl font-semibold italic text-zinc-800 group-hover:text-gold/20 transition-colors">
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                              <div className="flex flex-col">
                                <div className="flex items-baseline gap-2">
                                  <span className="font-medium text-white tracking-wide">
                                    {selectedRelease.type === 'Single' ? selectedRelease.title : (t.title || selectedRelease.title)}
                                  </span>
                                </div>
                                <span className="text-[9px] text-zinc-500 tracking-widest font-semibold mt-1">ISRC: {t.hasIsrc ? (t.isrc || 'Pendente') : 'Precisa Gerar'}</span>
                              </div>
                            </div>
                            <Button variant="ghost" onClick={() => handleDownload(t.audioFileName, (t as any).audioUrl, 'audio')} className="text-[10px] font-semibold text-gold border border-gold/10 hover:border-gold/30">Baixar Áudio</Button>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-[9px] font-semibold text-zinc-400 mt-2">
                            <div className="bg-black/40 p-4 rounded-2xl border border-zinc-800/50">
                              <span className="text-zinc-500 font-bold uppercase tracking-[0.2em] block mb-2 text-[8px]">Compositores</span>
                              <span className="text-white text-[10px]">{t.composer.join(', ')}</span>
                            </div>
                            <div className="bg-black/40 p-4 rounded-2xl border border-zinc-800/50">
                              <span className="text-zinc-500 font-bold uppercase tracking-[0.2em] block mb-2 text-[8px]">Artistas</span>
                              <span className="text-white text-[10px]">{t.artist.join(', ')}</span>
                            </div>
                          </div>

                          {t.lyrics && (
                            <div className="bg-black/40 p-4 rounded-2xl border border-zinc-800/50">
                              <span className="text-zinc-500 font-bold uppercase tracking-[0.2em] block mb-2 text-[8px]">Letras</span>
                              <pre className="text-white text-[10px] whitespace-pre-wrap font-sans font-medium leading-relaxed">{t.lyrics}</pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-10">
                  <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800/50 space-y-8">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                      <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Checklist de Lançamento</h3>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] pl-2 mb-2 block">Pré-Lançamento & Legal</span>
                        {[
                          { key: 'arquivosConferidos', label: 'Conferência de Arquivos' },
                          { key: 'metadadosVerificados', label: 'Verificação Metadados' }
                        ].map((task) => (
                          <label key={task.key} className="flex items-center gap-4 p-4 rounded-2xl bg-black/30 border border-zinc-800/50 cursor-pointer hover:border-gold/30 hover:bg-black/50 transition-all duration-300">
                            <input
                              type="checkbox"
                              className="w-5 h-5 accent-gold cursor-pointer"
                              checked={(selectedRelease.checklist as any)[task.key]}
                              onChange={(e) => handleStatusUpdate({ ...selectedRelease.checklist, [task.key]: e.target.checked })}
                            />
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest transition-colors",
                              (selectedRelease.checklist as any)[task.key] ? "text-white" : "text-zinc-600"
                            )}>{task.label}</span>
                          </label>
                        ))}
                      </div>

                      <div className="space-y-3">
                        <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] pl-2 mb-2 block mt-6">Distribuição & Pós</span>
                        {[
                          { key: 'enviadoDistribuidora', label: 'Enviado à Distribuidora' },
                          { key: 'shareInEnviado', label: 'Protocolo Share-In' }
                        ].map((task) => (
                          <label key={task.key} className="flex items-center gap-4 p-4 rounded-2xl bg-black/30 border border-zinc-800/50 cursor-pointer hover:border-gold/30 hover:bg-black/50 transition-all duration-300">
                            <input
                              type="checkbox"
                              className="w-5 h-5 accent-gold cursor-pointer"
                              checked={(selectedRelease.checklist as any)[task.key]}
                              onChange={(e) => handleStatusUpdate({ ...selectedRelease.checklist, [task.key]: e.target.checked })}
                            />
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest transition-colors",
                              (selectedRelease.checklist as any)[task.key] ? "text-white" : "text-zinc-600"
                            )}>{task.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Guard */}
      {/* 
        A lógica de Auth guard deve estar no componente pai ou aqui. 
        Para manter o fluxo do código original, o Dashboard renderiza se logado.
        Se não estiver logado, redireciona ou mostra Login. 
        O original não tinha essa lógica explícita aqui, estava no App.
      */}
    </div>
  );
};

export default Dashboard;
const AdminDashboard = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
    </div>
  );

  return isLoggedIn ? <Dashboard /> : <AdminLogin onLogin={() => setIsLoggedIn(true)} />;
};

export { AdminDashboard as AdminRoot };