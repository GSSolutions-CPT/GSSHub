import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export function ClientSearch({ clients = [], value, onSelect, onAddNew }) {
    const [open, setOpen] = React.useState(false)

    const selectedClient = clients.find((client) => client.id === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between bg-slate-50 dark:bg-slate-950 font-normal h-11 border-slate-200 dark:border-slate-800"
                >
                    {selectedClient ? (
                        <span className="flex flex-col items-start text-left truncate">
                            <span className="font-medium text-sm leading-none mb-0.5">{selectedClient.name}</span>
                            {selectedClient.company && (
                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{selectedClient.company}</span>
                            )}
                        </span>
                    ) : (
                        <span className="text-muted-foreground">Select client...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search client..." />
                    <CommandList>
                        <CommandEmpty className="py-6 text-center text-sm">
                            <p className="text-muted-foreground mb-2">No client found.</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={() => {
                                    onAddNew()
                                    setOpen(false)
                                }}
                            >
                                <Plus className="mr-2 h-3 w-3" />
                                Create New Client
                            </Button>
                        </CommandEmpty>
                        <CommandGroup>
                            {clients.map((client) => (
                                <CommandItem
                                    key={client.id}
                                    value={`${client.name} ${client.company || ''}`}
                                    onSelect={() => {
                                        onSelect(client.id)
                                        setOpen(false)
                                    }}
                                    className="flex flex-col items-start gap-1 py-2"
                                >
                                    <div className="flex w-full items-center justify-between">
                                        <span className="font-medium">{client.name}</span>
                                        {value === client.id && <Check className="h-4 w-4 opacity-100" />}
                                    </div>
                                    {client.company && (
                                        <span className="text-xs text-muted-foreground">{client.company}</span>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
