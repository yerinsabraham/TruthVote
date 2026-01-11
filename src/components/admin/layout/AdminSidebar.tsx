// src/components/admin/layout/AdminSidebar.tsx
'use client';

import { 
  LayoutDashboard, 
  Newspaper, 
  FileText, 
  CheckCircle, 
  FolderOpen,
  Settings,
  Plus,
  Archive,
  UserSearch,
  Award,
  Rss,
  Activity,
  Users,
  Inbox
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

interface AdminSidebarProps {
  isOpen: boolean;
  activeSection: string;
  activeItem: string;
  onNavigate: (section: string, item: string) => void;
  pendingResolutions?: number;
}

const navigationConfig: NavSection[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'activity', label: 'Activity Feed', icon: Activity },
    ]
  },
  {
    id: 'content',
    title: 'Content',
    items: [
      { id: 'trending', label: 'Trending Topics', icon: Newspaper },
      { id: 'create', label: 'Create Prediction', icon: Plus },
      { id: 'manage', label: 'All Predictions', icon: FileText },
    ]
  },
  {
    id: 'resolution',
    title: 'Resolution',
    items: [
      { id: 'pending', label: 'Pending', icon: CheckCircle },
      { id: 'history', label: 'History', icon: Archive },
    ]
  },
  {
    id: 'users',
    title: 'Users',
    items: [
      { id: 'table', label: 'All Users', icon: Users },
      { id: 'search', label: 'Search Users', icon: UserSearch },
      { id: 'ranks', label: 'Rank Management', icon: Award },
    ]
  },
  {
    id: 'support',
    title: 'Support',
    items: [
      { id: 'tickets', label: 'Support Tickets', icon: Inbox },
    ]
  },
  {
    id: 'settings',
    title: 'Settings',
    items: [
      { id: 'categories', label: 'Categories', icon: FolderOpen },
      { id: 'sources', label: 'News Sources', icon: Rss },
      { id: 'general', label: 'General', icon: Settings },
    ]
  }
];

export default function AdminSidebar({ 
  isOpen, 
  activeSection, 
  activeItem, 
  onNavigate,
  pendingResolutions = 0
}: AdminSidebarProps) {
  // Add badge to pending resolutions
  const navWithBadges = navigationConfig.map(section => ({
    ...section,
    items: section.items.map(item => {
      if (section.id === 'resolution' && item.id === 'pending' && pendingResolutions > 0) {
        return { ...item, badge: pendingResolutions };
      }
      return item;
    })
  }));

  return (
    <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
      <nav className="py-2">
        {navWithBadges.map((section) => (
          <div key={section.id} className="admin-sidebar-section">
            <div className="admin-sidebar-section-title">
              {section.title}
            </div>
            
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === section.id && activeItem === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(section.id, item.id)}
                  className={`admin-nav-item w-full ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} className="admin-nav-item-icon" />
                  <span className="admin-nav-item-label">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="admin-nav-item-badge">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
