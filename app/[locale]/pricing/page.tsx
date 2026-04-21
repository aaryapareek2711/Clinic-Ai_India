'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to the landing page pricing section
        router.replace('/#pricing');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-cream-50">
            <div className="text-center">
                <div className="text-lg text-slate-600">Redirecting to pricing...</div>
            </div>
        </div>
    );
}
