import React, { useState } from 'react';
import { LogIn, UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { verifyPassword } from '../lib/crypto';
import type { Account } from '../types';

interface AccountScreenProps {
  accounts: Account[];
  onLogin: (accountName: string) => void;
  onCreateAccount: (email: string, password: string) => Promise<boolean>;
}

export const AccountScreen: React.FC<AccountScreenProps> = ({ accounts, onLogin, onCreateAccount }) => {
    const [view, setView] = useState<'login' | 'create'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const account = accounts.find(acc => acc.name.toLowerCase() === email.toLowerCase());
        if (!account) {
            setError('No account found with this email.');
            setIsLoading(false);
            return;
        }

        const isValid = await verifyPassword(password, account.salt, account.hash);
        setIsLoading(false);
        if (isValid) {
            onLogin(account.name);
        } else {
            setError('Incorrect password. Please try again.');
        }
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 4) {
            setError('Password must be at least 4 characters long.');
            return;
        }
        setError('');
        setIsLoading(true);
        const success = await onCreateAccount(email, password);
        setIsLoading(false);
        if (!success) {
            setError('An account with this email already exists.');
        }
        // On success, the parent component handles the login
    };

    const renderLoginForm = () => (
        <>
            <h2 className="text-2xl font-bold text-center mb-6">Login to Your Account</h2>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email-login" className="block text-sm font-medium mb-1">Email</label>
                    <input
                        id="email-login"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        className="w-full px-3 py-2 bg-tesla-gray-100 dark:bg-tesla-gray-500 border border-tesla-gray-300 dark:border-tesla-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-tesla-blue"
                    />
                </div>
                <div>
                    <label htmlFor="password-login" className="block text-sm font-medium mb-1">Password</label>
                    <div className="relative">
                        <input
                            id="password-login"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-3 py-2 pr-10 bg-tesla-gray-100 dark:bg-tesla-gray-500 border border-tesla-gray-300 dark:border-tesla-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-tesla-blue"
                        />
                        <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute inset-y-0 right-0 px-3 flex items-center text-tesla-gray-400">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-tesla-blue text-white font-semibold rounded-md hover:bg-opacity-80 transition-colors disabled:bg-opacity-50">
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={18} />}
                    {isLoading ? 'Logging In...' : 'Login'}
                </button>
            </form>
            <p className="text-center text-sm text-tesla-gray-400 mt-4">
                Don't have an account?{' '}
                <button onClick={() => { setView('create'); setError(''); }} className="font-semibold text-tesla-blue hover:underline">
                    Create one
                </button>
            </p>
        </>
    );

    const renderCreateForm = () => (
        <>
            <h2 className="text-2xl font-bold text-center mb-6">Create a New Account</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email-create" className="block text-sm font-medium mb-1">Email</label>
                    <input
                        id="email-create"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        className="w-full px-3 py-2 bg-tesla-gray-100 dark:bg-tesla-gray-500 border border-tesla-gray-300 dark:border-tesla-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-tesla-blue"
                    />
                </div>
                <div>
                    <label htmlFor="password-create" className="block text-sm font-medium mb-1">Password</label>
                     <div className="relative">
                        <input
                            id="password-create"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min. 4 characters"
                            required
                            className="w-full px-3 py-2 pr-10 bg-tesla-gray-100 dark:bg-tesla-gray-500 border border-tesla-gray-300 dark:border-tesla-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-tesla-blue"
                        />
                        <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute inset-y-0 right-0 px-3 flex items-center text-tesla-gray-400">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>
                <div>
                    <label htmlFor="password-confirm" className="block text-sm font-medium mb-1">Confirm Password</label>
                    <input
                        id="password-confirm"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-tesla-gray-100 dark:bg-tesla-gray-500 border border-tesla-gray-300 dark:border-tesla-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-tesla-blue"
                    />
                </div>
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-tesla-blue text-white font-semibold rounded-md hover:bg-opacity-80 transition-colors disabled:bg-opacity-50">
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={18} />}
                    {isLoading ? 'Creating...' : 'Create Account'}
                </button>
            </form>
             <p className="text-center text-sm text-tesla-gray-400 mt-4">
                Already have an account?{' '}
                <button onClick={() => { setView('login'); setError(''); }} className="font-semibold text-tesla-blue hover:underline">
                    Login
                </button>
            </p>
        </>
    );

    return (
        <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[60vh] px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
                {/* Column 1: Welcome Text */}
                <div className="text-left hidden md:block">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
                        Welcome to Tesla Log Analyzer
                    </h2>
                    <p className="text-base text-tesla-gray-500 dark:text-tesla-gray-300 mb-6">
                        Turn Your TeslaFi Data into Insight. Want to understand your Tesla’s performance, charging habits, and driving trends? It’s easy to get started:
                    </p>
                    <ol className="space-y-4 text-base text-tesla-gray-500 dark:text-tesla-gray-300">
                        <li className="flex items-start">
                            <div className="bg-tesla-blue text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm mr-3 mt-1 flex-shrink-0">1</div>
                            <div>
                                <span className="font-semibold text-tesla-dark dark:text-tesla-gray-100">Export your raw driving and charging data from TeslaFi.com</span> as a CSV file.
                            </div>
                        </li>
                        <li className="flex items-start">
                            <div className="bg-tesla-blue text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm mr-3 mt-1 flex-shrink-0">2</div>
                            <div>
                                <span className="font-semibold text-tesla-dark dark:text-tesla-gray-100">Create a free account and upload your file</span> to Tesla Log Analyzer.
                            </div>
                        </li>
                    </ol>
                    <p className="text-base text-tesla-gray-500 dark:text-tesla-gray-300 mt-6">
                        We'll take care of the rest—processing your data into clean, interactive dashboards so you can explore your vehicle’s history like never before.
                    </p>
                </div>

                {/* Column 2: Login/Create Form */}
                <div className="w-full bg-white dark:bg-tesla-gray-600 rounded-xl shadow-2xl p-8">
                    {view === 'login' ? renderLoginForm() : renderCreateForm()}
                </div>
            </div>
        </div>
    );
};