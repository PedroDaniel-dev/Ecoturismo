import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Home } from './pages/Home';
import { Trails } from './pages/Trails';
import { TrailDetails } from './pages/TrailDetails';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { Dangers } from './pages/Dangers';
import { Parties } from './pages/Parties';
import { PartyForm } from './pages/PartyForm';
import { PartyDetails } from './pages/PartyDetails';

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/trilhas', element: <Trails /> },
  { path: '/trilhas/:id', element: <TrailDetails /> },
  { path: '/login', element: <Login /> },
  { path: '/perfil', element: <Profile /> },
  { path: '/usuarios/:id', element: <Profile /> },
  { path: '/avisos', element: <Dangers /> },
  { path: '/parties', element: <Parties /> },
  { path: '/parties/nova', element: <PartyForm /> },
  { path: '/parties/:id', element: <PartyDetails /> },
  { path: '/parties/:id/editar', element: <PartyForm /> },
  { path: '*', element: <Home /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
