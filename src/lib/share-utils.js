import { toast } from 'sonner'

export async function shareLink(title, text, url) {
    if (navigator.share) {
        try {
            await navigator.share({
                title,
                text,
                url,
            })
            toast.success('Shared successfully!')
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error sharing:', error)
                fallbackCopyOnly(url)
            }
        }
    } else {
        fallbackCopyOnly(url)
    }
}

function fallbackCopyOnly(url) {
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard!')
}
