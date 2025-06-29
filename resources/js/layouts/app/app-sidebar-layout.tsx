import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';


export default function AppSidebarLayout({ children }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <AppShell variant="sidebar">
            <AppContent variant="sidebar" className="overflow-x-hidden">
                {children}
            </AppContent>
        </AppShell>
    );
}
