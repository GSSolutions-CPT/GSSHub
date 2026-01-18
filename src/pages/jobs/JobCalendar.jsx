import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Briefcase, Calendar as CalendarIcon, Receipt, ExternalLink } from 'lucide-react'
import { generateOutlookLink } from '@/lib/calendar-utils'
import { toast } from 'sonner'

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

export default function JobCalendar() {
    const [events, setEvents] = useState([])
    const [selectedEvent, setSelectedEvent] = useState(null)

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        try {
            // Fetch calendar events
            const { data: calendarEvents, error: calendarError } = await supabase
                .from('calendar_events')
                .select('*')

            if (calendarError) throw calendarError

            // Fetch jobs with scheduled dates
            const { data: jobs, error: jobsError } = await supabase
                .from('jobs')
                .select(`
                    *,
                    clients (name)
                `)
                .not('scheduled_datetime', 'is', null)

            if (jobsError) throw jobsError

            // Fetch invoices with due dates
            const { data: invoices, error: invoicesError } = await supabase
                .from('invoices')
                .select(`
                    *,
                    clients (name)
                `)
                .not('due_date', 'is', null)

            if (invoicesError) throw invoicesError

            // Combine all events
            const allEvents = [
                ...(calendarEvents || []).map(e => ({
                    id: e.id,
                    title: e.title,
                    start: new Date(e.datetime),
                    end: new Date(new Date(e.datetime).getTime() + 60 * 60 * 1000), // 1 hour default
                    type: e.event_type || 'Event',
                    resource: e,
                    source: 'calendar'
                })),
                ...(jobs || []).map(j => ({
                    id: j.id,
                    title: `${j.clients?.name} - ${j.status}`,
                    start: new Date(j.scheduled_datetime),
                    end: new Date(new Date(j.scheduled_datetime).getTime() + 60 * 60 * 1000), // 1 hour default
                    type: 'Job',
                    resource: j,
                    source: 'job',
                    status: j.status
                })),
                ...(invoices || []).map(i => ({
                    id: i.id,
                    title: `Due: ${i.invoice_number} (${i.clients?.name})`,
                    start: new Date(i.due_date),
                    end: new Date(new Date(i.due_date).getTime() + 60 * 60 * 1000), // 1 hour default
                    type: 'Invoice',
                    resource: i,
                    source: 'invoice',
                    status: i.status
                }))
            ]
            setEvents(allEvents)
        } catch (error) {
            console.error('Error fetching events:', error)
            toast.error('Failed to load calendar events')
        }
    }

    const getEventColor = (event) => {
        if (event.source === 'job') {
            switch (event.status) {
                case 'Pending': return '#eab308'; // yellow-500
                case 'In Progress': return '#3b82f6'; // blue-500
                case 'Completed': return '#22c55e'; // green-500
                case 'Cancelled': return '#ef4444'; // red-500
                default: return '#6b7280';
            }
        }
        if (event.source === 'invoice') {
            switch (event.status) {
                case 'Paid': return '#22c55e';
                case 'Overdue': return '#ef4444';
                default: return '#f97316'; // orange-500
            }
        }
        return '#a855f7'; // purple-500
    }

    const eventStyleGetter = (event) => {
        const backgroundColor = getEventColor(event);
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

    const handleSelectEvent = (event) => {
        setSelectedEvent(event)
    }

    const openOutlook = (event) => {
        const link = generateOutlookLink({
            title: event.title,
            start: event.start,
            end: event.end,
            description: event.resource.notes || event.title,
            location: event.resource.clients?.address || ''
        })
        window.open(link, '_blank')
    }

    return (
        <div className="h-[calc(100vh-250px)] bg-card rounded-lg border p-4 shadow-sm text-foreground">
            <style>{`
                .rbc-calendar { color: inherit; }
                .rbc-off-range-bg { background: transparent; opacity: 0.3; }
                .rbc-today { background: hsl(var(--muted)/0.5); }
                .rbc-toolbar-label { font-weight: bold; }
            `}</style>
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                eventPropGetter={eventStyleGetter}
                views={['month', 'week', 'day', 'agenda']}
                onSelectEvent={handleSelectEvent}
            />

            <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedEvent?.type === 'Job' && <Briefcase className="h-5 w-5" />}
                            {selectedEvent?.type === 'Invoice' && <Receipt className="h-5 w-5" />}
                            {selectedEvent?.source === 'calendar' && <CalendarIcon className="h-5 w-5" />}
                            {selectedEvent?.title}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedEvent?.start.toLocaleString()}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="flex gap-2">
                            <Badge style={{ backgroundColor: selectedEvent && getEventColor(selectedEvent) }} className="text-white">
                                {selectedEvent?.status || selectedEvent?.type}
                            </Badge>
                            <Badge variant="outline">{selectedEvent?.type}</Badge>
                        </div>

                        {selectedEvent?.resource?.notes && (
                            <div className="bg-muted p-3 rounded text-sm">
                                {selectedEvent.resource.notes}
                            </div>
                        )}

                        {selectedEvent?.resource?.clients && (
                            <div className="text-sm">
                                <span className="font-semibold">Client:</span> {selectedEvent.resource.clients.name}
                            </div>
                        )}

                        <div className="flex flex-col gap-2 pt-4">
                            <Button onClick={() => openOutlook(selectedEvent)} className="w-full">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Add to Outlook Calendar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
