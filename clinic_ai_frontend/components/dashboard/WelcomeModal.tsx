"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";

export function WelcomeModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const hasSeenModal = localStorage.getItem("hasSeenWelcomeModal");
        if (!hasSeenModal) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem("hasSeenWelcomeModal", "true");
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <DialogTitle className="text-center text-2xl">Welcome to MedGeni!</DialogTitle>
                    <DialogDescription className="text-center text-base pt-2">
                        Your practice is now set up and ready to go. Here's what you can do next:
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-blue-600 font-bold text-xs">1</span>
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm text-slate-900">Complete your profile</h4>
                            <p className="text-xs text-slate-500">Add your practice details and logo in Settings.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-purple-600 font-bold text-xs">2</span>
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm text-slate-900">Invite your team</h4>
                            <p className="text-xs text-slate-500">Add staff members to help manage your practice.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-amber-600 font-bold text-xs">3</span>
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm text-slate-900">Start a visit</h4>
                            <p className="text-xs text-slate-500">Create your first patient encounter using our smart templates.</p>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleClose} className="w-full" size="lg">
                        Let's Get Started <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
