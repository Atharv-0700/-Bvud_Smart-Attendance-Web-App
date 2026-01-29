import { User } from '../App';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getDefaultAvatarUrl } from '../../utils/profilePhotoUpload';
import { cn } from './ui/utils';

interface ProfileAvatarProps {
  user: User;
  photoUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
}

export function ProfileAvatar({
  user,
  photoUrl,
  size = 'md',
  className,
  showBorder = false,
}: ProfileAvatarProps) {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };

  const defaultAvatar = getDefaultAvatarUrl(user.name, user.role);
  const displayUrl = photoUrl || defaultAvatar;

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

  return (
    <Avatar
      className={cn(
        sizeClasses[size],
        showBorder && 'border-2 border-border',
        className
      )}
    >
      <AvatarImage src={displayUrl} alt={user.name} />
      <AvatarFallback className={cn('font-semibold', getRoleBadgeColor())}>
        {user.name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
