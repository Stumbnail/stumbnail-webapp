'use client';

import { ReactNode } from 'react';
import { ProjectsProvider } from '@/contexts';
import { AnalyticsProvider } from '@/components/providers/AnalyticsProvider';

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <ProjectsProvider>
            <AnalyticsProvider>{children}</AnalyticsProvider>
        </ProjectsProvider>
    );
}
