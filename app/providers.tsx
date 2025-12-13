'use client';

import { ReactNode } from 'react';
import { ProjectsProvider } from '@/contexts';

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <ProjectsProvider>
            {children}
        </ProjectsProvider>
    );
}
