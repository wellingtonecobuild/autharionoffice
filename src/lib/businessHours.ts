/**
 * Parse business hours string and determine if currently open
 * Supports various formats like:
 * - "Mon-Fri: 8am-5pm"
 * - "Monday - Friday: 8:00 AM - 5:00 PM"
 * - "Mon-Fri 8-5, Sat 9-1"
 * - "24/7"
 * - "Always Open"
 */

interface OpenStatus {
  isOpen: boolean;
  statusText: string;
  nextChange?: string; // e.g., "Opens at 8am" or "Closes at 5pm"
}

// NZ timezone
const NZ_TIMEZONE = 'Pacific/Auckland';

const dayAbbreviations: Record<string, number> = {
  'sun': 0, 'sunday': 0,
  'mon': 1, 'monday': 1,
  'tue': 2, 'tues': 2, 'tuesday': 2,
  'wed': 3, 'wednesday': 3,
  'thu': 4, 'thur': 4, 'thurs': 4, 'thursday': 4,
  'fri': 5, 'friday': 5,
  'sat': 6, 'saturday': 6,
};

function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  const cleaned = timeStr.toLowerCase().trim();
  
  // Handle common formats
  // "8am", "8:00am", "8:00 am", "08:00", "8"
  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;
  
  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3];
  
  if (ampm === 'pm' && hours < 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;
  
  // Handle 24-hour format
  if (!ampm && hours > 12 && hours <= 24) {
    // Already 24-hour format
  }
  
  return { hours, minutes };
}

function getDayRange(dayStr: string): number[] {
  const cleaned = dayStr.toLowerCase().trim();
  
  // Handle ranges like "mon-fri"
  if (cleaned.includes('-')) {
    const [start, end] = cleaned.split('-').map(d => d.trim());
    const startDay = dayAbbreviations[start];
    const endDay = dayAbbreviations[end];
    
    if (startDay !== undefined && endDay !== undefined) {
      const days: number[] = [];
      let current = startDay;
      while (true) {
        days.push(current);
        if (current === endDay) break;
        current = (current + 1) % 7;
        if (days.length > 7) break; // Safety
      }
      return days;
    }
  }
  
  // Single day
  const day = dayAbbreviations[cleaned];
  return day !== undefined ? [day] : [];
}

export function getOpenStatus(hoursString: string | null | undefined): OpenStatus {
  if (!hoursString || hoursString.trim() === '') {
    return { isOpen: false, statusText: 'Hours not specified', nextChange: undefined };
  }
  
  const hours = hoursString.toLowerCase().trim();
  
  // Handle 24/7 or always open
  if (hours.includes('24/7') || hours.includes('always open') || hours.includes('24 hours')) {
    return { isOpen: true, statusText: 'Open 24/7', nextChange: undefined };
  }
  
  // Get current time in NZ
  const now = new Date();
  const nzFormatter = new Intl.DateTimeFormat('en-NZ', {
    timeZone: NZ_TIMEZONE,
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  
  const parts = nzFormatter.formatToParts(now);
  const weekday = parts.find(p => p.type === 'weekday')?.value?.toLowerCase() || '';
  const hourPart = parts.find(p => p.type === 'hour')?.value || '0';
  const minutePart = parts.find(p => p.type === 'minute')?.value || '0';
  
  const currentDayIndex = dayAbbreviations[weekday] ?? new Date().getDay();
  const currentHour = parseInt(hourPart, 10);
  const currentMinute = parseInt(minutePart, 10);
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  
  // Parse hours - try to find pattern like "Mon-Fri: 8am-5pm" or "Mon-Fri 8-5"
  // Split by common separators
  const segments = hours.split(/[,;]/).map(s => s.trim());
  
  for (const segment of segments) {
    // Try to match "days: times" or "days times"
    const dayTimeMatch = segment.match(/^([a-z\-\s]+?)[\s:]+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)$/i);
    
    if (dayTimeMatch) {
      const daysStr = dayTimeMatch[1];
      const openTime = parseTime(dayTimeMatch[2]);
      const closeTime = parseTime(dayTimeMatch[3]);
      
      if (openTime && closeTime) {
        const days = getDayRange(daysStr);
        
        if (days.includes(currentDayIndex)) {
          const openMinutes = openTime.hours * 60 + openTime.minutes;
          const closeMinutes = closeTime.hours * 60 + closeTime.minutes;
          
          if (currentTimeInMinutes >= openMinutes && currentTimeInMinutes < closeMinutes) {
            const closeHour = closeTime.hours > 12 ? closeTime.hours - 12 : closeTime.hours;
            const closeAmPm = closeTime.hours >= 12 ? 'pm' : 'am';
            return { 
              isOpen: true, 
              statusText: 'Open Now',
              nextChange: `Closes at ${closeHour}${closeAmPm}`
            };
          } else if (currentTimeInMinutes < openMinutes) {
            const openHour = openTime.hours > 12 ? openTime.hours - 12 : openTime.hours;
            const openAmPm = openTime.hours >= 12 ? 'pm' : 'am';
            return { 
              isOpen: false, 
              statusText: 'Closed',
              nextChange: `Opens at ${openHour}${openAmPm}`
            };
          } else {
            return { 
              isOpen: false, 
              statusText: 'Closed',
              nextChange: 'Opens tomorrow'
            };
          }
        }
      }
    }
  }
  
  // If we couldn't parse, show hours as-is
  return { isOpen: false, statusText: 'See hours below', nextChange: undefined };
}

export function formatOpenStatus(status: OpenStatus): { label: string; color: 'green' | 'gray' | 'yellow' } {
  if (status.statusText === 'Open 24/7' || status.statusText === 'Open Now') {
    return { label: status.statusText, color: 'green' };
  }
  if (status.statusText === 'Closed') {
    return { label: status.nextChange ? `Closed · ${status.nextChange}` : 'Closed', color: 'gray' };
  }
  return { label: status.statusText, color: 'yellow' };
}