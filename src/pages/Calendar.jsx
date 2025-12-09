import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarIcon, Briefcase, Receipt, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function Calendar() {
  const [events, setEvents] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date())

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      // Fetch calendar events
      const { data: calendarEvents, error: calendarError } = await supabase
        .from('calendar_events')
        .select('*')
        .order('datetime', { ascending: true })
      
      if (calendarError) throw calendarError

      // Fetch jobs with scheduled dates
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          *,
          clients (name)
        `)
        .not('scheduled_datetime', 'is', null)
        .order('scheduled_datetime', { ascending: true })
      
      if (jobsError) throw jobsError

      // Fetch invoices with due dates
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          clients (name)
        `)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
      
      if (invoicesError) throw invoicesError

      // Combine all events
      const allEvents = [
        ...(calendarEvents || []).map(e => ({
          id: e.id,
          title: e.title,
          datetime: new Date(e.datetime),
          type: e.event_type,
          source: 'calendar'
        })),
        ...(jobs || []).map(j => ({
          id: j.id,
          title: `Job: ${j.clients?.name || 'Unknown'}`,
          datetime: new Date(j.scheduled_datetime),
          type: 'Job',
          source: 'job',
          status: j.status
        })),
        ...(invoices || []).map(i => ({
          id: i.id,
          title: `Invoice Due: ${i.clients?.name || 'Unknown'}`,
          datetime: new Date(i.due_date),
          type: 'Invoice Due',
          source: 'invoice',
          status: i.status
        }))
      ].sort((a, b) => a.datetime - b.datetime)

      setEvents(allEvents)
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  // Group events by date
  const groupEventsByDate = () => {
    const grouped = {}
    events.forEach(event => {
      const dateKey = event.datetime.toDateString()
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(event)
    })
    return grouped
  }

  const groupedEvents = groupEventsByDate()

  // Get upcoming events (next 30 days)
  const getUpcomingEvents = () => {
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    return events.filter(e => e.datetime >= now && e.datetime <= thirtyDaysFromNow)
  }

  const upcomingEvents = getUpcomingEvents()

  const getEventIcon = (type) => {
    switch (type) {
      case 'Job':
        return <Briefcase className="h-4 w-4" />
      case 'Invoice Due':
        return <Receipt className="h-4 w-4" />
      default:
        return <CalendarIcon className="h-4 w-4" />
    }
  }

  const getEventColor = (event) => {
    if (event.source === 'job') {
      switch (event.status) {
        case 'Pending': return 'bg-yellow-500'
        case 'In Progress': return 'bg-blue-500'
        case 'Completed': return 'bg-green-500'
        default: return 'bg-gray-500'
      }
    }
    if (event.source === 'invoice') {
      switch (event.status) {
        case 'Paid': return 'bg-green-500'
        case 'Overdue': return 'bg-red-500'
        default: return 'bg-orange-500'
      }
    }
    return 'bg-purple-500'
  }

  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isPast = (date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingEvents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Next 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Jobs</CardTitle>
            <Briefcase className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {upcomingEvents.filter(e => e.source === 'job').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Upcoming</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Invoices</CardTitle>
            <Receipt className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {upcomingEvents.filter(e => e.source === 'invoice').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Upcoming</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline View */}
      <Card>
        <CardHeader>
          <CardTitle>Event Timeline</CardTitle>
          <CardDescription>Upcoming events and scheduled activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(groupedEvents)
              .filter(([dateKey]) => {
                const date = new Date(dateKey)
                const thirtyDaysFromNow = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000)
                return date <= thirtyDaysFromNow
              })
              .slice(0, 15)
              .map(([dateKey, dateEvents]) => {
                const date = new Date(dateKey)
                return (
                  <div key={dateKey} className="border-l-2 border-border pl-4 pb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`font-semibold ${isToday(date) ? 'text-primary' : isPast(date) ? 'text-muted-foreground' : ''}`}>
                        {date.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      {isToday(date) && (
                        <Badge variant="default">Today</Badge>
                      )}
                      {isPast(date) && !isToday(date) && (
                        <Badge variant="secondary">Past</Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      {dateEvents.map((event) => (
                        <Card key={`${event.source}-${event.id}`} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <div className={`p-2 rounded-lg ${getEventColor(event)} bg-opacity-10`}>
                                  {getEventIcon(event.type)}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium">{event.title}</p>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {event.datetime.toLocaleTimeString('en-US', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Badge className={`${getEventColor(event)} text-white`}>
                                {event.type}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              })}
            
            {Object.keys(groupedEvents).length === 0 && (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No events scheduled. Events will appear here when you create jobs or invoices with dates.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

