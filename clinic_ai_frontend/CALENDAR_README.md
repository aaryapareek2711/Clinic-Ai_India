# Calendar View Implementation

## Overview

A comprehensive calendar system for the Healthcare Application dashboard inspired by SimplePractice's calendar interface. The calendar includes monthly, weekly, and daily views with full appointment management capabilities.

## Features

### Calendar Views
- **Month View**: Grid layout showing all days in the month with mini appointment cards
- **Week View**: 7-column time grid with hourly slots (7 AM - 8 PM)
- **Day View**: Detailed single-day view with expanded time grid
- **View Switching**: Easy toggle between month/week/day views
- **Navigation**: Previous/Next buttons and "Today" quick navigation

### Appointment Management
- **Color-coded Appointments**: Different colors for appointment types (new-patient, follow-up, therapy, etc.)
- **Status Indicators**: Visual indicators for scheduled, completed, cancelled, no-show
- **Appointment Cards**: Three variants (mini, compact, full) for different views
- **Click Handlers**: Click to view details, create appointments, or select time slots
- **Conflict Detection**: Helper functions to detect double-booking

### Dashboard Integration
- **Upcoming Appointments Widget**: Shows next 5 appointments on the dashboard
- **Calendar Settings**: Configure working hours, days, and preferences
- **Responsive Design**: Works on mobile, tablet, and desktop

## File Structure

```
frontend/
├── lib/
│   ├── types/
│   │   └── calendar.ts                 # TypeScript interfaces and types
│   ├── utils/
│   │   └── calendar.ts                 # Calendar utility functions
│   └── mock/
│       └── appointments.ts             # Mock data and API functions
├── components/
│   ├── calendar/
│   │   ├── index.ts                    # Barrel exports
│   │   ├── CalendarView.tsx           # Main calendar component
│   │   ├── MonthView.tsx              # Month grid view
│   │   ├── WeekView.tsx               # Week time grid view
│   │   ├── DayView.tsx                # Single day view
│   │   ├── TimeGrid.tsx               # Time slot grid component
│   │   └── AppointmentCard.tsx        # Appointment display component
│   ├── dashboard/
│   │   └── UpcomingAppointments.tsx   # Dashboard widget
│   └── settings/
│       └── CalendarSettings.tsx        # Settings component
└── app/
    └── dashboard/
        ├── page.tsx                    # Dashboard with widget
        ├── calendar/
        │   └── page.tsx                # Full calendar page
        └── settings/
            └── calendar/
                └── page.tsx            # Calendar settings page
```

## Component API

### CalendarView

Main calendar component with view switching.

```tsx
<CalendarView
  appointments={appointments}
  initialView="month"                    // 'month' | 'week' | 'day'
  initialDate={new Date()}
  onAppointmentClick={(apt) => {...}}
  onCreateAppointment={(date, hour) => {...}}
  onDayClick={(date) => {...}}
  startHour={7}
  endHour={20}
  weekStartsOn={1}                       // 0=Sunday, 1=Monday, 6=Saturday
  showCreateButton={true}
/>
```

### MonthView

Monthly calendar grid.

```tsx
<MonthView
  currentDate={new Date()}
  appointments={appointments}
  onDayClick={(date) => {...}}
  onAppointmentClick={(apt) => {...}}
  weekStartsOn={1}
/>
```

### WeekView

Weekly time grid with 7 days.

```tsx
<WeekView
  currentDate={new Date()}
  appointments={appointments}
  startHour={7}
  endHour={20}
  weekStartsOn={1}
  onSlotClick={(date, hour) => {...}}
  onAppointmentClick={(apt) => {...}}
/>
```

### DayView

Single day detailed view.

```tsx
<DayView
  currentDate={new Date()}
  appointments={appointments}
  startHour={7}
  endHour={20}
  onSlotClick={(date, hour) => {...}}
  onAppointmentClick={(apt) => {...}}
/>
```

### AppointmentCard

Display appointment information.

```tsx
<AppointmentCard
  appointment={appointment}
  variant="full"                         // 'full' | 'compact' | 'mini'
  showTime={true}
  showPatient={true}
  onClick={(apt) => {...}}
/>
```

### UpcomingAppointments

Dashboard widget for upcoming appointments.

```tsx
<UpcomingAppointments
  appointments={appointments}
  limit={5}
  showViewAll={true}
/>
```

## Type Definitions

### Appointment

```typescript
interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  type: AppointmentType;
  title?: string;
  description?: string;
  start: Date;
  end: Date;
  status: AppointmentStatus;
  location?: string;
  notes?: string;
  isRecurring?: boolean;
  color?: string;
}

type AppointmentType =
  | 'new-patient'
  | 'follow-up'
  | 'therapy'
  | 'consultation'
  | 'telehealth'
  | 'lab-review';

type AppointmentStatus =
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'no-show';
```

### CalendarSettings

```typescript
interface CalendarSettings {
  startTime: number;                     // hour (0-23)
  endTime: number;                       // hour (0-23)
  slotDuration: number;                  // minutes
  weekStartsOn: 0 | 1 | 6;              // 0=Sunday, 1=Monday, 6=Saturday
  workingDays: number[];                 // 0-6
  defaultAppointmentDuration: number;    // minutes
  allowDoubleBooking: boolean;
  showWeekends: boolean;
}
```

## Utility Functions

### Date Navigation

```typescript
navigatePrevious(date, viewType);      // Go to previous month/week/day
navigateNext(date, viewType);          // Go to next month/week/day
```

### Date Formatting

```typescript
formatMonthYear(date);                 // "January 2024"
formatWeekRange(date, weekStartsOn);   // "Jan 15 - 21, 2024"
formatDayHeader(date);                 // "Monday, January 15, 2024"
formatTime(date);                      // "9:00 AM"
formatTimeRange(start, end);           // "9:00 AM - 10:00 AM"
formatRelativeDate(date);              // "Today", "Tomorrow", "Jan 15"
```

### Grid Generation

```typescript
getDaysInMonthGrid(date, weekStartsOn);  // Get all dates for month view
getDaysInWeek(date, weekStartsOn);       // Get 7 days for week view
generateTimeSlots(date, start, end);     // Generate hourly time slots
```

### Appointment Filtering

```typescript
getAppointmentsForDate(appointments, date);              // Filter by date
getAppointmentsForRange(appointments, start, end);       // Filter by range
getUpcomingAppointments(appointments, limit);            // Get future appointments
getTodaysAppointments(appointments);                     // Get today's appointments
```

### Conflict Detection

```typescript
appointmentsOverlap(apt1, apt2);                        // Check if two overlap
detectConflicts(newApt, existingApts);                  // Find all conflicts
```

### Grid Positioning

```typescript
calculateGridPosition(start, end, dayStart, dayEnd);    // Calculate CSS position %
```

## Styling

The calendar uses Tailwind CSS with a clean, professional design:

- **Color Scheme**: Blue primary, gray neutrals
- **Appointment Colors**: Type-based color coding
  - New Patient: Blue
  - Follow-up: Green
  - Therapy: Purple
  - Consultation: Orange
  - Telehealth: Cyan
  - Lab Review: Pink

- **Status Colors**:
  - Scheduled: Blue
  - Completed: Green
  - Cancelled: Red
  - No-show: Gray

- **Hover States**: Subtle shadows and background changes
- **Responsive**: Mobile-first design with breakpoints

## Usage Examples

### Basic Calendar Page

```tsx
'use client';

import { useState, useEffect } from 'react';
import { CalendarView } from '@/components/calendar';
import { Appointment } from '@/lib/types/calendar';
import { mockAppointments } from '@/lib/mock/appointments';

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    setAppointments(mockAppointments);
  }, []);

  return (
    <CalendarView
      appointments={appointments}
      initialView="month"
      onAppointmentClick={(apt) => console.log('Clicked:', apt)}
      onCreateAppointment={(date, hour) => console.log('Create:', date, hour)}
    />
  );
}
```

### Dashboard Widget

```tsx
import UpcomingAppointments from '@/components/dashboard/UpcomingAppointments';
import { mockAppointments } from '@/lib/mock/appointments';

export default function Dashboard() {
  return (
    <div>
      <UpcomingAppointments
        appointments={mockAppointments}
        limit={5}
      />
    </div>
  );
}
```

### Settings Page

```tsx
import CalendarSettings from '@/components/settings/CalendarSettings';

export default function SettingsPage() {
  return <CalendarSettings />;
}
```

## Future Enhancements

### Phase 1 (Current)
- ✅ Month/Week/Day views
- ✅ Appointment cards with color coding
- ✅ Dashboard widget
- ✅ Settings page
- ✅ Mock data

### Phase 2 (Planned)
- [ ] Drag and drop to reschedule
- [ ] Appointment modal/drawer for details
- [ ] Create appointment form
- [ ] Recurring appointments
- [ ] Integration with backend API
- [ ] Real-time updates with WebSocket
- [ ] Export to ICS/Google Calendar
- [ ] Print view

### Phase 3 (Advanced)
- [ ] AI-powered scheduling suggestions
- [ ] Conflict resolution wizard
- [ ] Patient portal booking widget
- [ ] SMS/Email reminders integration
- [ ] Analytics and reporting
- [ ] Multi-provider calendar view
- [ ] Resource booking (rooms, equipment)

## Testing

### Component Tests

```bash
npm test components/calendar
```

### E2E Tests

```bash
npm run test:e2e -- calendar
```

### Manual Testing Checklist

- [ ] Month view displays correctly
- [ ] Week view shows time grid
- [ ] Day view shows detailed schedule
- [ ] View switching works
- [ ] Navigation (prev/next/today) works
- [ ] Appointment cards render properly
- [ ] Color coding is correct
- [ ] Click handlers fire correctly
- [ ] Dashboard widget displays
- [ ] Settings page saves preferences
- [ ] Responsive on mobile
- [ ] No console errors

## Dependencies

- **date-fns**: Date manipulation and formatting
- **lucide-react**: Icons
- **Next.js 14**: React framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support
- Color contrast meets WCAG AA standards
- Screen reader friendly

## Performance

- Virtualization for large appointment lists (future)
- Memoization of date calculations
- Lazy loading of calendar views
- Optimized re-renders with React.memo

## Contributing

When adding new features:

1. Update type definitions in `lib/types/calendar.ts`
2. Add utility functions to `lib/utils/calendar.ts`
3. Create new components in `components/calendar/`
4. Update this README
5. Add tests
6. Update mock data if needed

## License

MIT

---

Built with ❤️ for the Healthcare Application
