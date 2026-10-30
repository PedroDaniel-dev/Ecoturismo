import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export function Layout({ children }) {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  // Toda página nova abre no topo. 'instant' porque o html tem scroll-behavior: smooth, e a rolagem suave era
  // interrompida pela troca de página (a trilha abria no meio, perto do mapa). Voltar/avançar (POP) mantém a posição.
  useLayoutEffect(() => {
    if (navigationType !== 'POP') window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, navigationType]);

  return (
    <div className="min-h-screen flex flex-col bg-base">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
