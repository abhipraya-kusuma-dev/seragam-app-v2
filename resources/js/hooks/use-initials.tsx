export function getInitials(fullName?: string): string {
    if (!fullName) return 'AU';
    
    const names = fullName.trim().split(' ');
    
    if (names.length === 0) return 'AU';
    if (names.length === 1) return names[0].charAt(0).toUpperCase();

    const firstInitial = names[0].charAt(0);
    const lastInitial = names[names.length - 1].charAt(0);

    return `${firstInitial}${lastInitial}`.toUpperCase();
}
