import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface IconAvatarProps {
    iconUrl: string;
    fallbackText: string;
    className?: string;
}

export function IconAvatar({ iconUrl, fallbackText, className = "" }: IconAvatarProps) {
    return (
        <Avatar className={className}>
            <AvatarImage src={iconUrl} alt={fallbackText} />
            <AvatarFallback>{fallbackText}</AvatarFallback>
        </Avatar>
    );
}
