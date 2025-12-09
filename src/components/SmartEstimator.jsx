import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Brain, Sparkles, Calculator } from 'lucide-react'
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
                <Button variant="outline" className="gap-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50">
                    <Sparkles className="h-4 w-4" />
                    AI Estimate
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-indigo-600" />
                        Smart Job Estimator
                    </DialogTitle>
                    <DialogDescription>
                        Enter job parameters and let the system calculate suggested pricing.
                    </DialogDescription>
                </DialogHeader>

                {step === 'input' && (
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Est. Hours</Label>
                                <Input
                                    type="number"
                                    value={inputs.hours}
                                    onChange={(e) => setInputs({ ...inputs, hours: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Technicians</Label>
                                <Input
                                    type="number"
                                    value={inputs.technicians}
                                    onChange={(e) => setInputs({ ...inputs, technicians: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Base Material Cost</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-500">R</span>
                                <Input
                                    className="pl-7"
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
                                <SelectTrigger>
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
                            <Label className="text-muted-foreground text-xs">Hourly Rate (Base)</Label>
                            <Input
                                className="h-8 text-xs"
                                type="number"
                                value={inputs.rate}
                                onChange={(e) => setInputs({ ...inputs, rate: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>
                )}

                {step === 'calculating' && (
                    <div className="py-12 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse rounded-full" />
                            <Brain className="h-12 w-12 text-indigo-600 animate-bounce" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Analyzing market rates...</p>
                    </div>
                )}

                {step === 'result' && (
                    <div className="py-4 space-y-4 animate-in slide-in-from-bottom-4">
                        <Card className="bg-indigo-50 border-indigo-100">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-sm text-indigo-600 font-medium">Recommended Quote</span>
                                    <span className="text-3xl font-bold text-indigo-900">R{results.total.toFixed(2)}</span>
                                </div>
                                <div className="space-y-1 pt-2 border-t border-indigo-200">
                                    <div className="flex justify-between text-xs text-indigo-700">
                                        <span>Labor ({inputs.hours}h x {inputs.technicians})</span>
                                        <span>R{results.labor.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-indigo-700">
                                        <span>Materials (+Markup)</span>
                                        <span>R{results.materialMarkup.toFixed(2)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <p className="text-xs text-muted-foreground text-center">
                            Includes calculated profit margin of R{(results.total - (results.labor * 0.7) - inputs.materialCost).toFixed(2)}
                        </p>
                    </div>
                )}

                <DialogFooter>
                    {step === 'input' && (
                        <Button onClick={calculateEstimate} className="w-full bg-indigo-600 hover:bg-indigo-700">
                            <Calculator className="mr-2 h-4 w-4" />
                            Calculate Estimate
                        </Button>
                    )}
                    {step === 'result' && (
                        <div className="flex gap-2 w-full">
                            <Button variant="ghost" onClick={() => setStep('input')} className="flex-1">
                                Edit
                            </Button>
                            <Button onClick={handleApply} className="flex-1 bg-green-600 hover:bg-green-700">
                                Apply to Quote
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
