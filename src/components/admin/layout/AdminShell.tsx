// src/components/admin/layout/AdminShell.tsx
'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import '@/app/admin/admin.css';

export interface AdminShellProps {
  children: ReactNode;
  activeSection: string;
  activeItem: string;
  onNavigate: (section: string, item: string) => void;
  pendingResolutions?: number;
}

export default function AdminShell({ 
  children, 
  activeSection,
  activeItem,
  onNavigate,
  pendingResolutions = 0
}: AdminShellProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const handleNavigate = (section: string, item: string) => {
    onNavigate(section, item);
    if (!isDesktop) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="admin-shell">
      <AdminHeader 
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        onHomeClick={() => router.push('/')}
      />
      
      <div className="flex">
        <AdminSidebar 
          isOpen={isDesktop || sidebarOpen}
          activeSection={activeSection}
          activeItem={activeItem}
          onNavigate={handleNavigate}
          pendingResolutions={pendingResolutions}
        />
        
        <main className="admin-content flex-1">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {!isDesktop && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
