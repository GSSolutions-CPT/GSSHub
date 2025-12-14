/**
 * Generates an Outlook Calendar Deep Link for a specific event
 * Docs: https://learn.microsoft.com/en-us/microsoft-365/cloud-productivity/calendar-link-formats
 * @param {Object} event
 * @param {string} event.title
 * @param {Date} event.start
 * @param {Date} event.end
 * @param {string} event.description
 * @param {string} event.location
 */
export const generateOutlookLink = (event) => {
    const base = 'https://outlook.office.com/calendar/0/deeplink/compose'
    const params = new URLSearchParams()

    params.append('subject', event.title || 'New Event')
    params.append('body', event.description || '')
    params.append('location', event.location || '')

    if (event.start) {
        params.append('startdt', event.start.toISOString())
    }

    if (event.end) {
        params.append('enddt', event.end.toISOString())
    }

    params.append('path', '/calendar/action/compose')
    params.append('rru', 'addevent')

    return `${base}?${params.toString()}`
}

/**
 * Generates a generic Google Calendar Link
 */
export const generateGoogleCalendarLink = (event) => {
    const base = 'https://calendar.google.com/calendar/render'
    const params = new URLSearchParams()

    params.append('action', 'TEMPLATE')
    params.append('text', event.title || 'New Event')
    params.append('details', event.description || '')
    params.append('location', event.location || '')

    if (event.start && event.end) {
        // Format dates as YYYYMMDDTHHmmSSZ
        const format = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '')
        params.append('dates', `${format(event.start)}/${format(event.end)}`)
    }

    return `${base}?${params.toString()}`
}
