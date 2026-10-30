import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { partyApi } from '../utils/partyApi';

// Convites recebidos, compartilhados entre o sino da navbar e a aba Convites de /parties:
// responder num lugar atualiza o outro.
const InvitesContext = createContext(null);

export function InvitesProvider({ children }) {
  const { token, isLoggedIn } = useAuth();
  const [invites, setInvites] = useState(null); // null = carregando

  const reload = useCallback(() => {
    if (!token) return Promise.resolve();
    return partyApi(token).received().then(setInvites).catch(() => setInvites(list => list || []));
  }, [token]);

  useEffect(() => {
    if (isLoggedIn) reload();
    else setInvites(null);
  }, [isLoggedIn, reload]);

  // aceitar ou recusar troca o convite pela versão respondida que o backend devolve
  const respond = useCallback(async (id, accept) => {
    const p = partyApi(token);
    const updated = await (accept ? p.accept(id) : p.decline(id));
    setInvites(list => list.map(c => (c.id === id ? updated : c)));
    return updated;
  }, [token]);

  const value = useMemo(() => {
    const list = invites || [];
    return { invites, pending: list.filter(c => c.status === 'PENDENTE'), reload, respond };
  }, [invites, reload, respond]);

  return <InvitesContext.Provider value={value}>{children}</InvitesContext.Provider>;
}

export const useInvites = () => useContext(InvitesContext);
