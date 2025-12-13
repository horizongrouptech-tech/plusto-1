import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PackagePlus } from 'lucide-react';

export default function CatalogCreationFormModal({ isOpen, onClose, onSubmit }) {
    const [catalogName, setCatalogName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!catalogName.trim()) return;
        setIsLoading(true);
        try {
            await onSubmit(catalogName);
        } finally {
            setIsLoading(false);
            setCatalogName('');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-horizon-dark border-horizon text-horizon-text" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PackagePlus className="w-6 h-6 text-horizon-primary" />
                        יצירת קטלוג חדש
                    </DialogTitle>
                    <DialogDescription className="text-right mt-2 text-horizon-accent">
                        הזן שם לקטלוג החדש שלך. תוכל להוסיף מוצרים לקטלוג זה לאחר יצירתו.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="catalog-name" className="text-right col-span-1">
                                שם הקטלוג
                            </Label>
                            <Input
                                id="catalog-name"
                                value={catalogName}
                                onChange={(e) => setCatalogName(e.target.value)}
                                className="col-span-3 bg-horizon-card border-horizon"
                                placeholder="לדוגמה: קטלוג קיץ 2024"
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            ביטול
                        </Button>
                        <Button type="submit" disabled={isLoading || !catalogName.trim()}>
                            {isLoading ? 'יוצר...' : 'צור קטלוג'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}