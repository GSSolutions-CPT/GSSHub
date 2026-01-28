import React, { useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Download, GripVertical, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const columns = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

const getColumnConfig = (status) => {
    switch (status) {
        case 'Pending':
            return {
                color: 'text-amber-600 dark:text-amber-400',
                bg: 'bg-amber-50 dark:bg-amber-950/30',
                border: 'border-amber-100 dark:border-amber-900/50',
                headerGradient: 'from-amber-500/10 to-transparent',
                icon: AlertCircle
            };
        case 'In Progress':
            return {
                color: 'text-blue-600 dark:text-blue-400',
                bg: 'bg-blue-50 dark:bg-blue-950/30',
                border: 'border-blue-100 dark:border-blue-900/50',
                headerGradient: 'from-blue-500/10 to-transparent',
                icon: Clock
            };
        case 'Completed':
            return {
                color: 'text-emerald-600 dark:text-emerald-400',
                bg: 'bg-emerald-50 dark:bg-emerald-950/30',
                border: 'border-emerald-100 dark:border-emerald-900/50',
                headerGradient: 'from-emerald-500/10 to-transparent',
                icon: CheckCircle2
            };
        case 'Cancelled':
            return {
                color: 'text-rose-600 dark:text-rose-400',
                bg: 'bg-rose-50 dark:bg-rose-950/30',
                border: 'border-rose-100 dark:border-rose-900/50',
                headerGradient: 'from-rose-500/10 to-transparent',
                icon: XCircle
            };
        default:
            return {
                color: 'text-slate-600',
                bg: 'bg-slate-50',
                border: 'border-slate-100',
                headerGradient: 'from-slate-500/10 to-transparent',
                icon: AlertCircle
            };
    }
};

const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
};

function SortableItem({ job }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: job.id,
        data: { ...job },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3 outline-none touch-none">
            <JobCard job={job} />
        </div>
    );
}

function JobCard({ job, isOverlay }) {

    return (
        <Card className={cn(
            "transition-all duration-200 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900",
            isOverlay ? "shadow-2xl shadow-blue-500/20 rotate-2 scale-105 cursor-grabbing" : "hover:shadow-md hover:-translate-y-0.5 cursor-grab active:cursor-grabbing shadow-sm"
        )}>
            <CardContent className="p-3 space-y-3">
                <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1">
                        <h4 className="font-semibold text-sm leading-tight text-slate-800 dark:text-slate-200 line-clamp-2">
                            {job.clients?.name || 'Unknown Client'}
                        </h4>
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide line-clamp-1">
                            {job.clients?.company}
                        </p>
                    </div>
                    {/* Handle Icon for visual cue */}
                    <GripVertical className="h-4 w-4 text-slate-300" />
                </div>

                {job.notes && (
                    <div className="relative text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-md border border-slate-100 dark:border-slate-800/50 italic">
                        <span className="line-clamp-2">{job.notes}</span>
                    </div>
                )}

                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            <span>{job.scheduled_datetime ? new Date(job.scheduled_datetime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Unscheduled'}</span>
                        </div>
                        {job.assigned_technicians?.length > 0 && (
                            <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{job.assigned_technicians.length}</span>
                            </div>
                        )}
                    </div>
                    {job.quotations?.payment_proof && (
                        <Button
                            size="xs"
                            variant="ghost"
                            className="w-full text-[10px] h-6 mt-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50"
                            onClick={(e) => {
                                e.stopPropagation();
                                const link = document.createElement('a');
                                link.href = job.quotations.payment_proof;
                                link.download = `PaymentProof_${job.id.substring(0, 6)}`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }}
                        >
                            <Download className="mr-1.5 h-3 w-3" />
                            Proof of Payment
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function DroppableColumn({ id, jobs }) {
    const { setNodeRef } = useSortable({ id });
    const config = getColumnConfig(id);
    const Icon = config.icon;

    return (
        <div ref={setNodeRef} className={cn(
            "flex-1 min-w-[280px] rounded-xl border p-2 flex flex-col h-full",
            config.bg,
            config.border
        )}>
            <div className={cn("p-3 mb-2 rounded-lg bg-gradient-to-b border border-white/50 dark:border-white/5", config.headerGradient)}>
                <div className="flex items-center justify-between">
                    <h3 className={cn("font-bold text-sm flex items-center gap-2", config.color)}>
                        <Icon className="h-4 w-4" />
                        {id}
                    </h3>
                    <Badge variant="secondary" className="bg-white/50 dark:bg-black/20 text-xs backdrop-blur-sm border-0">
                        {jobs.length}
                    </Badge>
                </div>
            </div>

            <SortableContext items={jobs.map(j => j.id)} strategy={verticalListSortingStrategy}>
                <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[200px] scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
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
        let newStatus = over.id;

        if (!columns.includes(over.id)) {
            const overJob = jobs.find(j => j.id === over.id);
            if (overJob) {
                newStatus = overJob.status;
            }
        }

        const currentJob = jobs.find(j => j.id === jobId);

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
            <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-220px)] snap-x">
                {columns.map((status) => (
                    <DroppableColumn
                        key={status}
                        id={status}
                        jobs={jobsByStatus[status] || []}
                    />
                ))}
            </div>

            <DragOverlay dropAnimation={dropAnimation}>
                {activeJob ? <JobCard job={activeJob} isOverlay /> : null}
            </DragOverlay>
        </DndContext>
    );
}
