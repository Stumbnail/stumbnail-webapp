'use client';

import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProjectCanvas } from '@/app/project/[id]/ProjectCanvas';

export default function SharePage() {
  const params = useParams();
  const projectId = params.id as string;

  // IMPORTANT: Pass false to prevent redirect to login
  // This allows unauthenticated users to view shared projects
  const { user, loading } = useAuth(false);

  // Pass user and loading to ProjectCanvas to avoid duplicate useAuth() calls
  // This prevents race conditions that cause login redirects
  return <ProjectCanvas projectId={projectId} viewMode={true} user={user} authLoading={loading} />;
}
