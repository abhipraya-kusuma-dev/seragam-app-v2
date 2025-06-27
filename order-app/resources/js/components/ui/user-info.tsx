import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/hooks/use-initials";

interface UserInfoProps {
    fullName: string;
    avatarUrl?: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function UserInfo({ 
    fullName, 
    avatarUrl, 
    className = "", 
    size = 'md' 
}: UserInfoProps) {
    const initials = getInitials(fullName || '');
    const sizeClasses = {
        sm: 'h-8 w-8 text-sm',
        md: 'h-10 w-10 text-base',
        lg: 'h-12 w-12 text-lg'
    };

    return (
        <Avatar className={`${className} ${sizeClasses[size]}`}>
            {avatarUrl ? (
                <AvatarImage 
                    src={avatarUrl} 
                    alt={`${fullName || 'User avatar'}'s profile picture`} 
                    onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.src = '/default-avatar.png';
                    }}
                />
            ) : (
                <AvatarFallback className="uppercase bg-primary/10 dark:bg-primary/20">
                    {initials}
                </AvatarFallback>
            )}
        </Avatar>
    );
}
