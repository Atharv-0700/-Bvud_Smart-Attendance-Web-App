import { useState, useRef } from 'react';
import { User } from '../App';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Camera, Upload, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadProfilePhoto, deleteProfilePhoto, getDefaultAvatarUrl } from '../../utils/profilePhotoUpload';
import { cn } from './ui/utils';

interface ProfilePhotoUploaderProps {
  user: User;
  photoUrl: string | null;
  onPhotoUpdate: (newUrl: string | null) => void;
  size?: 'small' | 'medium' | 'large';
  showUploadButton?: boolean;
}

export function ProfilePhotoUploader({
  user,
  photoUrl,
  onPhotoUpdate,
  size = 'large',
  showUploadButton = true,
}: ProfilePhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32',
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const result = await uploadProfilePhoto(user.id, user.role, file);

      if (result.success && result.photoUrl) {
        toast.success('Profile photo uploaded successfully!');
        onPhotoUpdate(result.photoUrl);
      } else {
        toast.error(result.error || 'Failed to upload photo');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!photoUrl) return;

    setDeleting(true);

    try {
      const result = await deleteProfilePhoto(user.id, user.role);

      if (result.success) {
        toast.success('Profile photo removed successfully');
        onPhotoUpdate(null);
      } else {
        toast.error(result.error || 'Failed to delete photo');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error('Delete error:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const defaultAvatar = getDefaultAvatarUrl(user.name, user.role);
  const displayUrl = photoUrl || defaultAvatar;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar Display */}
      <div className="relative">
        <Avatar className={cn(sizeClasses[size], 'border-4 border-border shadow-lg')}>
          <AvatarImage src={displayUrl} alt={user.name} />
          <AvatarFallback className="text-2xl font-bold">
            {user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Upload Button Overlay (for large size) */}
        {size === 'large' && showUploadButton && (
          <button
            onClick={handleUploadClick}
            disabled={uploading || deleting}
            className={cn(
              'absolute bottom-0 right-0 w-10 h-10 rounded-full',
              'bg-primary text-primary-foreground',
              'flex items-center justify-center',
              'border-4 border-background shadow-lg',
              'hover:bg-primary/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="Change photo"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      {/* Upload Controls */}
      {showUploadButton && (
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          <Button
            onClick={handleUploadClick}
            disabled={uploading || deleting}
            variant="outline"
            size="sm"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {photoUrl ? 'Change Photo' : 'Upload Photo'}
              </>
            )}
          </Button>

          {photoUrl && (
            <Button
              onClick={handleDelete}
              disabled={uploading || deleting}
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Upload Instructions */}
      {showUploadButton && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            JPG, PNG or WebP • Max 2 MB
          </p>
          <p className="text-xs text-muted-foreground">
            Photo will be cropped to square
          </p>
        </div>
      )}
    </div>
  );
}
