import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AdminProvider, useResourceList } from '@fuyuan9/cape-react';
import { ResourcePage, Badge } from '@fuyuan9/cape-shadcn';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Users, Shield, User, Search, Loader2, LogOut } from 'lucide-react';

const queryClient = new QueryClient();

function CustomDashboardDemo() {
  const [search, setSearch] = useState('');
  const { data: usersData, isLoading } = useResourceList('users', {
    page: 1,
    pageSize: 12,
    search: search || undefined,
  });

  const usersList = usersData?.data || [];
  const totalUsers = usersData?.total || 0;
  const adminCount = usersList.filter((u) => u.role === 'admin').length;
  const memberCount = usersList.filter((u) => u.role === 'member').length;

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Custom UI Dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">
          This page renders user data using custom React code and logical hooks, demonstrating how to bypass the
          standard table UI.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-slate-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-md">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Total Users</div>
            <div className="text-2xl font-bold text-slate-900">{totalUsers}</div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-slate-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-md">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Administrators</div>
            <div className="text-2xl font-bold text-slate-900">{adminCount}</div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-slate-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-md">
            <User className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Standard Members</div>
            <div className="text-2xl font-bold text-slate-900">{memberCount}</div>
          </div>
        </div>
      </div>

      {/* Custom Card Grid */}
      <div className="space-y-4">
        <div className="flex justify-between items-center gap-4">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter cards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full rounded-md border border-slate-200 bg-white h-9 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <div className="text-xs text-slate-500">Showing {usersList.length} items</div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Loading user cards...</div>
        ) : usersList.length === 0 ? (
          <div className="text-center py-12 text-slate-400 border border-dashed rounded-lg">
            No cards match the search query
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {usersList.map((user: any) => {
              const initials = user.name
                ? user.name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                : '?';
              return (
                <div
                  key={user.id}
                  className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs tracking-wider">
                        {initials}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{user.name}</h3>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                    <span>Registered user #{user.id}</span>
                    <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [emailValue, setEmailValue] = useState('admin@example.com');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: emailValue, password }),
      });
      const isJson = res.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await res.json() : null;
      if (res.ok && data.success) {
        onLoginSuccess();
      } else {
        setError(data?.error || 'Login failed. Please try again.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.15),transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.1),transparent_40%)]" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <Shield className="h-8 w-8 text-indigo-400 animate-pulse" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Cape Demo Console</h1>
          <p className="mt-2 text-sm text-slate-400">Please sign in to access the admin dashboard</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold animate-in fade-in duration-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Main() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('cape_demo_logged_in') === 'true');
  const [activeTab, setActiveTab] = useState<'standard' | 'custom'>('standard');

  useEffect(() => {
    localStorage.setItem('cape_demo_logged_in', String(isLoggedIn));
  }, [isLoggedIn]);

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Ignored
    }
    setIsLoggedIn(false);
    queryClient.clear();
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/custom')) {
        setActiveTab('custom');
      } else {
        setActiveTab('standard');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tab: 'standard' | 'custom') => {
    if (tab === 'custom') {
      window.location.hash = '/custom';
    } else {
      window.location.hash = '/';
    }
  };

  const sendMockNotification = () => {
    const channel = new BroadcastChannel('cape-notifications');
    channel.postMessage({
      type: 'notification',
      payload: {
        message: 'This is a mock push notification sent from Service Worker!',
        type: 'info',
      },
    });
    channel.close();
  };

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      {/* Top Demo Bar */}
      <div className="bg-slate-900 text-slate-300 px-6 py-2 flex justify-between items-center text-xs border-b border-slate-800">
        <span className="font-bold text-white tracking-wider uppercase">Cape Framework Demo</span>
        <div className="flex items-center gap-4">
          <button
            onClick={sendMockNotification}
            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors cursor-pointer"
          >
            Trigger Push Notification (Mock)
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => handleTabChange('standard')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'standard' ? 'bg-slate-800 text-white font-semibold' : 'hover:text-white'
              }`}
            >
              Standard UI
            </button>
            <button
              onClick={() => handleTabChange('custom')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'custom' ? 'bg-slate-800 text-white font-semibold' : 'hover:text-white'
              }`}
            >
              Custom UI (Cards Grid)
            </button>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {activeTab === 'standard' ? (
          <ResourcePage
            useHashRouting={true}
            logo={
              <div className="flex items-center gap-2 font-bold text-indigo-400">
                <span className="text-xl">🌊</span>
                <span>Cape Custom</span>
              </div>
            }
            theme={{
              primary: '#4f46e5',
              primaryForeground: '#ffffff',
              sidebarBg: '#111827',
              sidebarText: '#9ca3af',
              sidebarActiveBg: '#1e293b',
              sidebarActiveText: '#ffffff',
              sidebarBorder: '#1f2937',
            }}
          />
        ) : (
          <CustomDashboardDemo />
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AdminProvider apiUri="/admin/api">
        <Main />
      </AdminProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
