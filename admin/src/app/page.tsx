// Admin Dashboard - SkillPlay
'use client';
import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      setStats(data);
      setError(false);
    } catch (err) {
      console.error('fetchStats error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className='flex items-center justify-center h-screen'>Cargando...</div>;
  if (error) return <div className='flex items-center justify-center h-screen text-red-500'>Error cargando datos</div>;

  return (
    <div className='min-h-screen bg-gray-50 p-6'>
      <div className='max-w-7xl mx-auto'>
        <h1 className='text-2xl font-bold text-gray-900 mb-8'>SkillPlay Admin</h1>
        
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
          <div className='bg-white p-4 rounded-lg shadow'>
            <p className='text-sm text-gray-500'>Usuarios totales</p>
            <p className='text-2xl font-bold'>{stats?.users?.total ?? 0}</p>
          </div>
          <div className='bg-white p-4 rounded-lg shadow'>
            <p className='text-sm text-gray-500'>KYC verificados</p>
            <p className='text-2xl font-bold'>{stats?.users?.verified ?? 0}</p>
          </div>
          <div className='bg-white p-4 rounded-lg shadow'>
            <p className='text-sm text-gray-500'>En revisión</p>
            <p className='text-2xl font-bold text-red-500'>{stats?.security?.pendingReviews ?? 0}</p>
          </div>
          <div className='bg-white p-4 rounded-lg shadow'>
            <p className='text-sm text-gray-500'>Saldo total</p>
            <p className='text-2xl font-bold'>{stats?.finance?.totalUserBalance ?? 0} €</p>
          </div>
        </div>
      </div>
    </div>
  );
}

