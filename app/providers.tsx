'use client';

import { ReactNode } from 'react';
import { ConsentProvider, ProjectsProvider } from '@/contexts';
import { AnalyticsProvider } from '@/components/providers/AnalyticsProvider';
import { ConsentBanner } from '@/components/providers/ConsentBanner';

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <ConsentProvider>
            <ProjectsProvider>
                <AnalyticsProvider>{children}</AnalyticsProvider>
            </ProjectsProvider>
            <ConsentBanner />
        </ConsentProvider>
    );
}
