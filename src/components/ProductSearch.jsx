import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
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
import { useCurrency } from "@/lib/use-currency"

export function ProductSearch({ products = [], value, onSelect }) {
    const [open, setOpen] = React.useState(false)
    const [selectedCategory, setSelectedCategory] = React.useState("All")
    const { formatCurrency } = useCurrency()

    const selectedProduct = products.find((product) => product.id === value)

    const categories = React.useMemo(() => {
        const cats = new Set(products.map(p => p.category).filter(Boolean))
        return ["All", ...Array.from(cats).sort()]
    }, [products])

    const filteredProducts = React.useMemo(() => {
        if (selectedCategory === "All") return products
        return products.filter(p => p.category === selectedCategory)
    }, [products, selectedCategory])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between bg-white dark:bg-slate-950 font-normal px-3"
                >
                    {value === "custom"
                        ? "Custom Item"
                        : selectedProduct
                            ? selectedProduct.name
                            : "Select product..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[500px] p-0" align="start">
                <div className="flex items-center border-b p-2 overflow-x-auto gap-2 bg-slate-50/50 dark:bg-slate-900/50 no-scrollbar">
                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={cn(
                                "flex-none px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                                selectedCategory === category
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-white dark:bg-slate-800 text-muted-foreground border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
                            )}
                        >
                            {category}
                        </button>
                    ))}
                </div>
                <Command>
                    <CommandInput placeholder="Search by name, code or category..." />
                    <CommandList>
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup>
                            <CommandItem
                                value="custom item create new"
                                onSelect={() => {
                                    onSelect("custom")
                                    setOpen(false)
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        value === "custom" ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                Custom Item
                            </CommandItem>
                            {filteredProducts.map((product) => (
                                <CommandItem
                                    key={product.id}
                                    value={`${product.name} ${product.code} ${product.category} ${product.description || ''}`}
                                    onSelect={() => {
                                        onSelect(product.id)
                                        setOpen(false)
                                    }}
                                    className="flex flex-col items-start gap-1 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
                                >
                                    <div className="flex w-full items-center justify-between">
                                        <span className="font-medium truncate pr-2">{product.name}</span>
                                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                            {formatCurrency(product.retail_price)}
                                        </span>
                                    </div>
                                    <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Check
                                                className={cn(
                                                    "h-3 w-3",
                                                    value === product.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex gap-2">
                                                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] tracking-wider">
                                                    {product.code}
                                                </span>
                                                {selectedCategory === "All" && (
                                                    <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                                                        {product.category}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
