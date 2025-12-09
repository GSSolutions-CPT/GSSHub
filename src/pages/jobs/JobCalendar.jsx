import React from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/components/ui/calendar-custom.css'; // Will create this for dark mode support

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const getStatusColor = (status) => {
    switch (status) {
        case 'Pending': return '#eab308'; // yellow-500
        case 'In Progress': return '#3b82f6'; // blue-500
        case 'Completed': return '#22c55e'; // green-500
        case 'Cancelled': return '#ef4444'; // red-500
        default: return '#6b7280';
    }
};

export default function JobCalendar({ jobs }) {
    // Transform jobs to calendar events
    const events = jobs
        .filter(job => job.scheduled_datetime)
        .map(job => ({
            id: job.id,
            title: `${job.clients?.name} - ${job.status}`,
            start: new Date(job.scheduled_datetime),
            end: new Date(new Date(job.scheduled_datetime).getTime() + 60 * 60 * 1000), // Default 1 hour duration if not specified
            resource: job,
        }));

    const eventStyleGetter = (event) => {
        const backgroundColor = getStatusColor(event.resource.status);
        return {
            style: {
                backgroundColor,
                borderRadius: '4px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block'
            }
        };
    };

    return (
        <div className="h-[calc(100vh-250px)] bg-card rounded-lg border p-4 shadow-sm">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                eventPropGetter={eventStyleGetter}
                views={['month', 'week', 'day', 'agenda']}
            />
        </div>
    );
}
