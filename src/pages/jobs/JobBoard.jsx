import React, { useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Clock } from 'lucide-react';

const columns = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

const getStatusColor = (status) => {
    switch (status) {
        case 'Pending': return 'bg-yellow-500';
        case 'In Progress': return 'bg-blue-500';
        case 'Completed': return 'bg-green-500';
        case 'Cancelled': return 'bg-red-500';
        default: return 'bg-gray-500';
    }
};

function SortableItem({ job }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: job.id,
        data: { ...job }, // Pass job data for overlay
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3 cursor-grab active:cursor-grabbing">
            <JobCard job={job} />
        </div>
    );
}

function JobCard({ job }) {
    return (
        <Card className="hover:shadow-md transition-shadow bg-card">
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-semibold text-sm line-clamp-1">{job.clients?.name || 'Unknown Client'}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">{job.clients?.company}</p>
                    </div>
                    <Badge className={`text-[10px] px-1.5 py-0 ${getStatusColor(job.status)} text-white border-0`}>
                        {job.status}
                    </Badge>
                </div>

                {job.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded-md">
                        {job.notes}
                    </p>
                )}

                <div className="flex flex-col gap-1.5 pt-2 border-t">
                    {job.scheduled_datetime && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(job.scheduled_datetime).toLocaleDateString()}</span>
                        </div>
                    )}
                    {job.assigned_technicians?.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{job.assigned_technicians.length} Assigned</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function DroppableColumn({ id, jobs }) {
    const { setNodeRef } = useSortable({ id });

    return (
        <div ref={setNodeRef} className="flex-1 min-w-[280px] bg-muted/30 rounded-lg p-3 border border-border/50">
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(id)}`} />
                    {id}
                </h3>
                <Badge variant="secondary" className="text-xs">
                    {jobs.length}
                </Badge>
            </div>

            <SortableContext items={jobs.map(j => j.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3 min-h-[500px]">
                    {jobs.map((job) => (
                        <SortableItem key={job.id} job={job} />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
}

export default function JobBoard({ jobs, onStatusChange }) {
    const [activeId, setActiveId] = React.useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const jobsByStatus = useMemo(() => {
        return columns.reduce((acc, status) => {
            acc[status] = jobs.filter(job => job.status === status);
            return acc;
        }, {});
    }, [jobs]);

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            return;
        }

        const jobId = active.id;
        // If dropped on a container (column) directly
        let newStatus = over.id;

        // If dropped on another item, find its container (status)
        if (!columns.includes(over.id)) {
            const overJob = jobs.find(j => j.id === over.id);
            if (overJob) {
                newStatus = overJob.status;
            }
        }

        // Only update if status implies a change
        const currentJob = jobs.find(j => j.id === jobId);

        // We only care if the status is actually valid and different
        if (currentJob && columns.includes(newStatus) && currentJob.status !== newStatus) {
            onStatusChange(jobId, newStatus);
        }

        setActiveId(null);
    };

    const activeJob = jobs.find(j => j.id === activeId);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-250px)]">
                {columns.map((status) => (
                    <DroppableColumn
                        key={status}
                        id={status}
                        jobs={jobsByStatus[status] || []}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeJob ? <JobCard job={activeJob} /> : null}
            </DragOverlay>
        </DndContext>
    );
}
