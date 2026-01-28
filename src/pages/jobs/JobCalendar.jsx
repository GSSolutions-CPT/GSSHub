import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Briefcase, Calendar as CalendarIcon, Receipt, ExternalLink, Clock, MapPin, User, ChevronLeft, ChevronRight } from 'lucide-react'
import { generateOutlookLink } from '@/lib/calendar-utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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

// Custom Toolbar Component
const CustomToolbar = (toolbar) => {
    const goToBack = () => {
        toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
        toolbar.onNavigate('NEXT');
    };

    const goToCurrent = () => {
        toolbar.onNavigate('TODAY');
    };

    const label = () => {
        const date = toolbar.date;
        return (
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100 capitalize">
                {format(date, 'MMMM yyyy')}
            </span>
        );
    };

    return (
        <div className="flex items-center justify-between mb-4 p-2">
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToBack} className="h-8 w-8 rounded-full">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToCurrent} className="text-xs h-8 rounded-full">
                    Today
                </Button>
                <Button variant="outline" size="icon" onClick={goToNext} className="h-8 w-8 rounded-full">
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="ml-4">{label()}</div>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                {['month', 'week', 'day', 'agenda'].map(view => (
                    <button
                        key={view}
                        onClick={() => toolbar.onView(view)}
                        className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                            toolbar.view === view
                                ? "bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm"
                                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                        )}
                    >
                        {view.charAt(0).toUpperCase() + view.slice(1)}
                    </button>
                ))}
            </div>
        </div>
    );
};

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
                .select(`*, clients (name, address)`)
                .not('scheduled_datetime', 'is', null)

            if (jobsError) throw jobsError

            // Fetch invoices with due dates
            const { data: invoices, error: invoicesError } = await supabase
                .from('invoices')
                .select(`*, clients (name)`)
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

    const getEventStyle = (event) => {
        let bgClass = "bg-slate-600";
        if (event.source === 'job') {
            switch (event.status) {
                case 'Pending': bgClass = "bg-gradient-to-r from-amber-500 to-amber-600 border-amber-400"; break;
                case 'In Progress': bgClass = "bg-gradient-to-r from-blue-500 to-indigo-600 border-blue-400"; break;
                case 'Completed': bgClass = "bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-400"; break;
                case 'Cancelled': bgClass = "bg-gradient-to-r from-rose-500 to-rose-600 border-rose-400"; break;
                default: bgClass = "bg-slate-600";
            }
        } else if (event.source === 'invoice') {
            switch (event.status) {
                case 'Paid': bgClass = "bg-gradient-to-r from-green-500 to-emerald-600 border-green-400"; break;
                case 'Overdue': bgClass = "bg-gradient-to-r from-red-500 to-rose-600 border-red-400"; break;
                default: bgClass = "bg-gradient-to-r from-orange-400 to-orange-500 border-orange-300"; break;
            }
        } else {
            bgClass = "bg-gradient-to-r from-purple-500 to-violet-600 border-purple-400";
        }

        return {
            className: `${bgClass} text-white border text-xs shadow-sm rounded-md hover:scale-[1.02] transition-transform`,
            style: {
                opacity: 0.9,
                fontSize: '0.75rem',
                borderWidth: '0px 0px 0px 3px'
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
        <Card className="h-[calc(100vh-220px)] border-0 shadow-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <CardContent className="p-4 h-full">
                <style>{`
                    .rbc-calendar { font-family: inherit; }
                    .rbc-header { padding: 8px; font-weight: 600; font-size: 0.875rem; color: #64748b; border-bottom: 0px; }
                    .rbc-month-view { border: 1px solidhsl(var(--border) / 0.5); border-radius: 12px; overflow: hidden; }
                    .rbc-day-bg { border-left: 1px solid hsl(var(--border) / 0.5); }
                    .rbc-off-range-bg { background: transparent; opacity: 0.5; }
                    .rbc-today { background: hsl(var(--primary) / 0.05); }
                    .rbc-event { padding: 2px 4px; border-radius: 4px; }
                `}</style>
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    eventPropGetter={getEventStyle}
                    views={['month', 'week', 'day', 'agenda']}
                    components={{
                        toolbar: CustomToolbar
                    }}
                    onSelectEvent={handleSelectEvent}
                />
            </CardContent>

            <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
                <DialogContent className="sm:max-w-md border-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl shadow-2xl">
                    <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-80" />
                    <DialogHeader className="pt-6">
                        <DialogTitle className="flex items-start gap-3 text-xl">
                            <div className={cn(
                                "p-2 rounded-lg shadow-inner",
                                selectedEvent?.type === 'Job' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
                                    selectedEvent?.type === 'Invoice' ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" :
                                        "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                            )}>
                                {selectedEvent?.type === 'Job' && <Briefcase className="h-6 w-6" />}
                                {selectedEvent?.type === 'Invoice' && <Receipt className="h-6 w-6" />}
                                {selectedEvent?.source === 'calendar' && <CalendarIcon className="h-6 w-6" />}
                            </div>
                            <div className="space-y-1">
                                <div>{selectedEvent?.title}</div>
                                <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    {selectedEvent?.start && format(selectedEvent.start, 'PPP p')}
                                </div>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-muted-foreground">
                                {selectedEvent?.type}
                            </Badge>
                            {selectedEvent?.status && (
                                <Badge className={cn(
                                    "border-0",
                                    selectedEvent.status === 'Completed' || selectedEvent.status === 'Paid' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                        selectedEvent.status === 'Pending' || selectedEvent.status === 'Draft' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                )}>
                                    {selectedEvent?.status}
                                </Badge>
                            )}
                        </div>

                        {selectedEvent?.resource?.clients && (
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                <div>
                                    <div className="text-sm font-medium">{selectedEvent.resource.clients.name}</div>
                                    {selectedEvent.resource.clients.address && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                            <MapPin className="h-3 w-3" />
                                            {selectedEvent.resource.clients.address}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}


                        {selectedEvent?.resource?.notes && (
                            <div className="text-sm text-slate-600 dark:text-slate-300 italic">
                                &quot; {selectedEvent.resource.notes} &quot;
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button onClick={() => openOutlook(selectedEvent)} className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Add to Outlook
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
