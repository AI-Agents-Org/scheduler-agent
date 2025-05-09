// Helper function to parse natural language dates
export function parseNaturalDate(naturalDate: string): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Basic handling of some common natural language expressions
    if (naturalDate.toLowerCase().includes('tomorrow') || naturalDate.toLowerCase().includes('amanhã')) {
        const hourMatch = naturalDate.match(/(\d+)(?::(\d+))?\s*(am|pm)?/i);
        if (hourMatch) {
            const hour = parseInt(hourMatch[1]);
            const minute = hourMatch[2] ? parseInt(hourMatch[2]) : 0;
            const isPM = hourMatch[3]?.toLowerCase() === 'pm';

            tomorrow.setHours(isPM && hour !== 12 ? hour + 12 : (hour === 12 && !isPM ? 0 : hour), minute, 0, 0);
        } else {
            // Default to 9 AM if no time specified
            tomorrow.setHours(9, 0, 0, 0);
        }
        return tomorrow.toISOString();
    }

    if (naturalDate.toLowerCase().includes('today') || naturalDate.toLowerCase().includes('hoje')) {
        const hourMatch = naturalDate.match(/(\d+)(?::(\d+))?\s*(am|pm)?/i);
        if (hourMatch) {
            const hour = parseInt(hourMatch[1]);
            const minute = hourMatch[2] ? parseInt(hourMatch[2]) : 0;
            const isPM = hourMatch[3]?.toLowerCase() === 'pm';

            now.setHours(isPM && hour !== 12 ? hour + 12 : (hour === 12 && !isPM ? 0 : hour), minute, 0, 0);
        } else {
            // Default to current time if no time specified
            now.setMinutes(0, 0, 0);
        }
        return now.toISOString();
    }

    // Default to current time if can't parse
    return new Date().toISOString();
}