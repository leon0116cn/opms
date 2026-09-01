import type { ReactNode } from 'react';

export type Route = 'annual-plan' | 'scheme-template';

interface AppLayoutProps {
  route: Route;
  onNavigate: (route: Route) => void;
  children: ReactNode;
}

const navigation: Array<{
  label: string;
  children: Array<{ label: string; route: Route }>;
}> = [
  {
    label: '方案管理',
    children: [
      { label: '年度考核计划', route: 'annual-plan' },
      { label: '方案模板', route: 'scheme-template' },
    ],
  },
  { label: '过程跟踪', children: [] },
  { label: '绩效评价', children: [] },
];

export default function AppLayout({ route, onNavigate, children }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">组织绩效管理</div>
        <nav className="menu">
          {navigation.map((item) => (
            <div className="menu-group" key={item.label}>
              <div className="menu-title">{item.label}</div>
              {item.children.map((child) => (
                <button
                  className={route === child.route ? 'menu-item active' : 'menu-item'}
                  onClick={() => onNavigate(child.route)}
                  key={child.label}
                  type="button"
                >
                  {child.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
