import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FlaskConical, Loader2, LogIn, Shield, User } from 'lucide-react';

const TEST_ACCOUNTS = [
  {
    email: 'ewqcpzal@minimax.com',
    password: 'qfKV18aOyT',
    role: 'Operator',
    description: 'Оператор',
  },
  {
    email: 'ybcfvhsp@minimax.com',
    password: 'ESXubKtQGu',
    role: 'Admin',
    description: 'Администратор',
  },
];

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setError('Неверный email или пароль');
    }
    setLoading(false);
  };

  const quickLogin = async (account: typeof TEST_ACCOUNTS[0]) => {
    setError('');
    setLoadingAccount(account.email);
    const { error } = await signIn(account.email, account.password);
    if (error) {
      setError('Ошибка входа');
    }
    setLoadingAccount(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <FlaskConical className="text-blue-600" size={40} />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white ml-3">GMP LabWork</h1>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Войти'}
          </button>
        </form>

        {/* Quick Login Section */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                Быстрый вход
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {TEST_ACCOUNTS.map(account => (
              <div
                key={account.email}
                className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${account.role === 'Admin' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                      {account.role === 'Admin' ? (
                        <Shield size={18} className="text-purple-600 dark:text-purple-400" />
                      ) : (
                        <User size={18} className="text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800 dark:text-white">
                          {account.description}
                        </span>
                        {account.role === 'Admin' && (
                          <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{account.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => quickLogin(account)}
                    disabled={loadingAccount !== null}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
                  >
                    {loadingAccount === account.email ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <>
                        <LogIn size={14} />
                        Войти
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
