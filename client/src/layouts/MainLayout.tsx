import { Outlet } from 'react-router-dom';

export default function MainLayout() {
  return (
    <div className="platform-shell min-h-screen bg-gray-950 text-white">
      <Outlet />
    </div>
  );
}
