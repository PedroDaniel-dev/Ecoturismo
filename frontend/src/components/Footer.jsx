import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container mx-auto px-4 py-10 flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div>
          <p className="font-editorial text-xl font-semibold tracking-[0.12em] text-ink">ECOTURISMO <span className="text-brand">RIO</span></p>
          <p className="text-sm text-ink-muted mt-1 max-w-sm">{t('footer_text')}</p>
        </div>
        <div className="flex gap-6 text-sm font-semibold">
          <Link to="/" className="text-ink-muted hover:text-brand">{t('home')}</Link>
          <Link to="/trilhas" className="text-ink-muted hover:text-brand">{t('trails')}</Link>
        </div>
        <p className="text-xs text-ink-muted">© {new Date().getFullYear()} Ecoturismo Rio. {t('rights')}</p>
      </div>
    </footer>
  );
}
