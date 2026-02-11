/**
 * Format a date as a relative time string (e.g., "2 hours ago", "Just now", "Yesterday")
 */
export const formatRelativeTime = (date: Date | string | null | undefined): string => {
    if (!date) return 'Never';

    const cleanDate = new Date(date);
    if (isNaN(cleanDate.getTime())) return 'Invalid Date';

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - cleanDate.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return 'Just now';
    }

    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    if (days < 30) {
        const weeks = Math.floor(days / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }

    // Default to readable date string for older dates
    return cleanDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};
