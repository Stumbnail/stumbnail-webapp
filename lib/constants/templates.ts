import { Template } from '@/types';

// Template data for the dashboard
export const TEMPLATES: Template[] = [
    {
        id: '1',
        title: 'Tech Review Template',
        description: 'Generate instantly with AI',
        image: '/assets/dashboard/template1.png'
    },
    {
        id: '2',
        title: 'Travel Vlog Template',
        description: 'Generate instantly with AI',
        image: '/assets/dashboard/template2.png'
    },
    {
        id: '3',
        title: 'Gaming Reaction Template',
        description: 'Generate instantly with AI',
        image: '/assets/dashboard/template3.png'
    },
    {
        id: '4',
        title: 'Cinematic Look',
        description: 'Generate instantly with AI',
        image: '/assets/dashboard/template4.png'
    },
];

// Pagination constants
export const TEMPLATES_PER_PAGE = 8;
