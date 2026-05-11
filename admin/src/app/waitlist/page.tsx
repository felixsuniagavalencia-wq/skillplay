// Waitlist Page - SkillPlay
'use client';
import { useState } from 'react';

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      setStatus('error');
      setMessage('Introduce un email válido');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setStatus('success');
        setMessage(data.position ? ¡Apuntado! Eres el número  : '¡Ya estás en la lista!');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Error al apuntarse');
      }
    } catch {
      setStatus('error');
      setMessage('Error de conexión');
    }
  };

  if (status === 'success') {
    return (
      <div className='max-w-md mx-auto text-center p-6'>
        <div className='bg-green-100 rounded-2xl p-6'>
          <p className='text-green-800 font-semibold'>¡Apuntado!</p>
          <p className='text-green-600 text-sm'>{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-md mx-auto p-6'>
      <form onSubmit={handleSubmit} className='flex flex-col gap-3'>
        <input
          type='email'
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder='tu@email.com'
          disabled={status === 'loading'}
          className='border rounded-xl px-4 py-3'
        />
        <button
          type='submit'
          disabled={status === 'loading'}
          className='bg-violet-600 text-white rounded-xl px-6 py-3 font-semibold'
        >
          {status === 'loading' ? 'Apuntando...' : 'Unirme a la lista'}
        </button>
      </form>
      {status === 'error' && <p className='text-red-500 text-sm mt-2'>{message}</p>}
    </div>
  );
}

