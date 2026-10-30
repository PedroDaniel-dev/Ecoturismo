import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User, CalendarDays } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { commons } from '../utils/commons';

function Field({ icon: Ic, ...props }) {
  return (
    <div className="relative">
      <Ic size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
      <input {...props} className="input pl-11" />
    </div>
  );
}

export function Login() {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ nome: '', email: '', senha: '', dataNascimento: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.senha);
      else await register(form.nome, form.email, form.senha, form.dataNascimento);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      // sem status = o fetch nem chegou ao backend; 5xx = proxy do Vite sem backend do outro lado
      const key = { 401: 'login_error', 403: 'login_error', 409: 'email_taken', 400: 'register_invalid' }[err.status];
      setError(t(key || 'server_unreachable'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="pt-32 pb-20 px-4">
        <div className="mx-auto max-w-5xl grid md:grid-cols-2 rounded-[2rem] overflow-hidden border border-border bg-surface shadow-xl">
          <div className="relative hidden md:block min-h-[520px]">
            <img src={commons('Rio skyline and Cristo Redentor from Sugarloaf Mountain, Brazil.jpg', 1280)} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <p className="absolute bottom-8 left-8 right-8 font-display text-5xl font-semibold text-white leading-none tracking-tight">Ecoturismo <span className="italic text-[#E3C27A]">Rio</span></p>
          </div>
          <form onSubmit={submit} className="p-8 md:p-12 flex flex-col justify-center gap-4">
            <h1 className="font-display text-4xl font-semibold text-ink tracking-tight">{mode === 'login' ? t('login_title') : t('register_title')}</h1>
            <p className="text-ink-muted -mt-2 mb-2">{t('login_subtitle')}</p>
            {mode === 'register' && <Field icon={User} required placeholder={t('name')} value={form.nome} onChange={set('nome')} />}
            <Field icon={Mail} required type="email" placeholder={t('email')} value={form.email} onChange={set('email')} autoComplete="email" />
            <Field icon={Lock} required type="password" minLength={6} placeholder={t('password')} value={form.senha} onChange={set('senha')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            {mode === 'register' && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">{t('birth_date')}</span>
                <Field icon={CalendarDays} required type="date" max={new Date().toISOString().slice(0, 10)} value={form.dataNascimento} onChange={set('dataNascimento')} autoComplete="bday" />
              </label>
            )}
            {error && <p className="text-sm font-semibold text-trail-hard">{error}</p>}
            <button disabled={loading} className="btn-primary mt-2 disabled:opacity-60">{mode === 'login' ? t('enter') : t('create_account')}</button>
            <button type="button" onClick={() => { setMode(m => (m === 'login' ? 'register' : 'login')); setError(''); }} className="text-sm font-semibold text-brand hover:underline">
              {mode === 'login' ? t('no_account') : t('have_account')}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
