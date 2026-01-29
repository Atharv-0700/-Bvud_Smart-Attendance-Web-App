import React, { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from '../App';
import { Button } from './ui/button';
import { LogOut, BookOpen, Menu, X, Moon, Sun, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './ui/utils';
import { useTheme } from 'next-themes';
import { ProfileAvatar } from './ProfileAvatar';
import { getProfilePhotoUrl } from '../../utils/profilePhotoUpload';

interface DashboardLayoutProps {
  user: User;
  onLogout: () => void;
  children: ReactNode;
  navItems: Array<{
    label: string;
    icon: ReactNode;
    path: string;
  }>;
}

export function DashboardLayout({ user, onLogout, children, navItems }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const loadProfilePhoto = async () => {
      try {
        const url = await getProfilePhotoUrl(user.id);
        setProfilePhotoUrl(url);
      } catch (error) {
        console.error('Error loading profile photo:', error);
      }
    };
    
    loadProfilePhoto();
  }, [user.id]);

  const getRoleBadgeColor = () => {
    switch (user.role) {
      case 'student':
        return 'bg-primary/10 text-primary';
      case 'teacher':
        return 'bg-secondary/10 text-secondary';
      case 'admin':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const SidebarContent = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Logo & App Name */}
      <div className={cn("p-6 border-b border-border", isCollapsed && "p-4")}>
        <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <h2 className="font-semibold truncate">Smart Attendance</h2>
              <p className="text-xs text-muted-foreground truncate">BVDU BCA</p>
            </div>
          )}
        </div>
      </div>

      {/* User Info & Role Badge */}
      {!isCollapsed && (
        <div className="p-6 border-b border-border">
          <div className="space-y-2">
            <h3 className="font-semibold truncate">{user.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <div className={cn('inline-flex px-3 py-1 rounded-full text-xs font-medium', getRoleBadgeColor())}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              {user.semester && ` • Sem ${user.semester}`}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-foreground',
                isCollapsed && 'justify-center'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="flex-shrink-0">
                {item.icon}
              </div>
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggle & Logout */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="ghost"
          className={cn("w-full gap-3", isCollapsed ? "justify-center px-2" : "justify-start")}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={isCollapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>Light Mode</span>}
            </>
          ) : (
            <>
              <Moon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>Dark Mode</span>}
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          className={cn("w-full gap-3 text-destructive hover:text-destructive hover:bg-destructive/10", isCollapsed ? "justify-center px-2" : "justify-start")}
          onClick={onLogout}
          title={isCollapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden md:block h-full transition-all duration-300 ease-in-out relative",
        sidebarCollapsed ? "w-20" : "w-72"
      )}>
        <SidebarContent isCollapsed={sidebarCollapsed} />
        
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border border-border bg-card shadow-md hover:bg-muted"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-background animate-in slide-in-from-left">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Now visible on both mobile and desktop */}
        <div className="flex items-center justify-between gap-4 p-4 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            
            {/* Desktop toggle button (alternative location) */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h1 className="font-semibold">Smart Attendance</h1>
            </div>
          </div>
          
          {/* User info on desktop */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
            </div>
            <ProfileAvatar 
              user={user} 
              photoUrl={profilePhotoUrl} 
              size="md" 
              showBorder 
            />
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}