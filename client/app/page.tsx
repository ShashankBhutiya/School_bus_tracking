'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        if (data.user.role === 'admin') router.push('/admin');
        else if (data.user.role === 'driver') router.push('/driver');
        else if (data.user.role === 'parent') router.push('/parent');
      } else {
        alert('Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      alert('Login failed');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-100 dark:bg-gray-900">
      <div className="z-10 w-full max-w-sm items-center justify-center font-mono text-sm bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">BusTrack Login</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email (e.g. admin@school.com)"
            className="p-3 border rounded-lg dark:bg-gray-700 dark:text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="p-3 border rounded-lg dark:bg-gray-700 dark:text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold">
            Login
          </button>
        </form>
        <div className="mt-4 text-xs text-gray-500">
          <p>Demo Credentials:</p>
          <p>Admin: admin@school.com / 123</p>
          <p>Driver: driver@school.com / 123</p>
          <p>Parent: parent@school.com / 123</p>
        </div>
      </div>
    </div>
  );
}
