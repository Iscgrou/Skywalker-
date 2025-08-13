import React from 'react';

interface CRMLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  contextPanel?: React.ReactNode;
  headerExtras?: React.ReactNode;
}

/**
 * CRMLayout: ساختار چند ناحیه‌ای برای داشبورد CRM
 * Zones: Rail | Sidebar | Header | Main | Context Drawer (future)
 */
export function CRMLayout({ children, sidebar, contextPanel, headerExtras }: CRMLayoutProps) {
  return (
    <div className="min-h-screen flex bg-[--crm-surface-base] text-[--crm-text-primary] font-sans" data-theme="crm-dark" dir="rtl">
      {/* Rail */}
      <nav className="crm-nav-rail">
        <button className="crm-nav-btn crm-nav-btn-active" aria-label="Dashboard">🏠</button>
        <button className="crm-nav-btn" aria-label="Invoices">🧾</button>
        <button className="crm-nav-btn" aria-label="Contacts">👥</button>
        <button className="crm-nav-btn" aria-label="AI">🤖</button>
      </nav>
      {/* Sidebar */}
      {sidebar && (
        <aside className="hidden md:flex flex-col w-60 border-r border-[--crm-border] bg-[--crm-surface-alt] p-4 gap-4">
          {sidebar}
        </aside>
      )}
      {/* Main + Header */}
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-20 backdrop-blur-md bg-[--crm-surface-base]/70 border-b border-[--crm-border] px-4 py-3 flex items-center gap-4">
          <div className="flex-1 flex items-center gap-3">
            <h1 className="text-sm font-semibold tracking-tight">CRM Panel</h1>
            <div className="hidden lg:flex gap-2">
              <div className="crm-chip-active text-[10px]">Real-time Sync</div>
              <div className="crm-chip text-[10px]">AI Assist</div>
              <div className="crm-chip text-[10px]">Insights</div>
            </div>
          </div>
          {headerExtras}
        </header>
        <main className="p-4 md:p-6 flex-1">
          {children}
        </main>
      </div>
      {contextPanel && (
        <div className="hidden xl:block w-72 border-l border-[--crm-border] bg-[--crm-surface-alt] p-4">
          {contextPanel}
        </div>
      )}
    </div>
  );
}

export default CRMLayout;
