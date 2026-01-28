import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Brain, Sparkles, Calculator, Wand2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function SmartEstimator({ onApply }) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState('input') // input, calculating, result
    const [inputs, setInputs] = useState({
        hours: 4,
        technicians: 1,
        materialCost: 0,
        markup: 'medium', // low=1.2, medium=1.35, high=1.5
        rate: 450 // Default hourly rate (e.g., R450 or $450)
    })

    // Mock "AI" Processing
    const calculateEstimate = () => {
        setStep('calculating')
        setTimeout(() => {
            setStep('result')
        }, 1500)
    }

    const getResults = () => {
        const labor = inputs.hours * inputs.technicians * inputs.rate
        const markupMap = { low: 0.2, medium: 0.35, high: 0.5 }
        const materialMarkup = inputs.materialCost * (1 + markupMap[inputs.markup])
        const total = labor + materialMarkup

        return {
            labor,
            materialMarkup,
            total,
            rawMaterial: inputs.materialCost
        }
    }

    const handleApply = () => {
        const { labor, materialMarkup } = getResults()

        // Create line items
        const items = []

        if (labor > 0) {
            items.push({
                description: `Labor (${inputs.hours}hrs x ${inputs.technicians} techs)`,
                quantity: 1,
                unit_price: labor,
                cost_price: 0 // Internal labor cost could be tracked, but for now 0
            })
        }

        if (materialMarkup > 0) {
            items.push({
                description: `Materials & Hardware (w/ Handling)`,
                quantity: 1,
                unit_price: materialMarkup,
                cost_price: inputs.materialCost
            })
        }

        onApply(items)
        setOpen(false)
        setStep('input')
        setInputs({ hours: 4, technicians: 1, materialCost: 0, markup: 'medium', rate: 450 })
    }

    const results = getResults()

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0 shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    AI Estimate
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500" />
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <Brain className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        Smart Job Estimator
                    </DialogTitle>
                    <DialogDescription>
                        Use AI to calculate the perfect price based on market rates and complexity.
                    </DialogDescription>
                </DialogHeader>

                {step === 'input' && (
                    <div className="grid gap-5 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Est. Hours</Label>
                                <Input
                                    type="number"
                                    value={inputs.hours}
                                    onChange={(e) => setInputs({ ...inputs, hours: parseFloat(e.target.value) || 0 })}
                                    className="bg-slate-50 dark:bg-slate-900"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Technicians</Label>
                                <Input
                                    type="number"
                                    value={inputs.technicians}
                                    onChange={(e) => setInputs({ ...inputs, technicians: parseInt(e.target.value) || 1 })}
                                    className="bg-slate-50 dark:bg-slate-900"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Base Material Cost</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-500">R</span>
                                <Input
                                    className="pl-7 bg-slate-50 dark:bg-slate-900"
                                    type="number"
                                    value={inputs.materialCost}
                                    onChange={(e) => setInputs({ ...inputs, materialCost: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Complexity / Markup</Label>
                            <Select
                                value={inputs.markup}
                                onValueChange={(v) => setInputs({ ...inputs, markup: v })}
                            >
                                <SelectTrigger className="bg-slate-50 dark:bg-slate-900">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Simple (20% Markup)</SelectItem>
                                    <SelectItem value="medium">Standard (35% Markup)</SelectItem>
                                    <SelectItem value="high">Complex (50% Markup)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Hourly Rate (Base)</Label>
                            <Input
                                className="h-8 text-xs bg-slate-50 dark:bg-slate-900"
                                type="number"
                                value={inputs.rate}
                                onChange={(e) => setInputs({ ...inputs, rate: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>
                )}

                {step === 'calculating' && (
                    <div className="py-12 flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in duration-500">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse rounded-full" />
                            <div className="relative bg-white dark:bg-slate-900 p-4 rounded-full shadow-xl border border-indigo-100 dark:border-indigo-900">
                                <Wand2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                            </div>
                        </div>
                        <div className="space-y-2 text-center">
                            <h3 className="font-semibold text-lg">Crunching Numbers...</h3>
                            <p className="text-sm text-muted-foreground">Analyzing materials, labor, and profit margins.</p>
                        </div>
                    </div>
                )}

                {step === 'result' && (
                    <div className="py-4 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-100 dark:border-indigo-900 overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                                <Sparkles className="h-24 w-24" />
                            </div>
                            <CardContent className="pt-6 relative">
                                <div className="flex justify-between items-end mb-4">
                                    <span className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold tracking-wide uppercase">Recommended Quote</span>
                                    <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                                        R{results.total.toFixed(2)}
                                    </span>
                                </div>
                                <div className="space-y-2 pt-4 border-t border-indigo-200 dark:border-indigo-800/50">
                                    <div className="flex justify-between text-sm text-indigo-900/70 dark:text-indigo-200/70">
                                        <span>Labor ({inputs.hours}h x {inputs.technicians})</span>
                                        <span className="font-mono">R{results.labor.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-indigo-900/70 dark:text-indigo-200/70">
                                        <span>Materials (+Markup)</span>
                                        <span className="font-mono">R{results.materialMarkup.toFixed(2)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <p className="text-xs text-muted-foreground text-center bg-slate-50 dark:bg-slate-900 py-2 rounded-lg">
                            Includes calculated profit margin of <span className="font-semibold text-green-600">R{(results.total - (results.labor * 0.7) - inputs.materialCost).toFixed(2)}</span>
                        </p>
                    </div>
                )}

                <DialogFooter>
                    {step === 'input' && (
                        <Button onClick={calculateEstimate} size="lg" className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100">
                            <Calculator className="mr-2 h-4 w-4" />
                            Calculate Estimate
                        </Button>
                    )}
                    {step === 'result' && (
                        <div className="flex gap-3 w-full">
                            <Button variant="outline" onClick={() => setStep('input')} className="flex-1">
                                Adjust Inputs
                            </Button>
                            <Button onClick={handleApply} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/20">
                                Apply to Quote
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
