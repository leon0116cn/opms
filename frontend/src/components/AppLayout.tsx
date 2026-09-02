import { useState } from 'react';
import type { ReactNode } from 'react';

export type Route =
  | 'annual-plan'
  | 'scheme-template'
  | 'organization'
  | 'performance-plan';

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
      { label: '组织架构', route: 'organization' },
      { label: '组织绩效方案', route: 'performance-plan' },
    ],
  },
  { label: '过程跟踪', children: [] },
  { label: '绩效评价', children: [] },
];

export default function AppLayout({ route, onNavigate, children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={collapsed ? 'app-shell sidebar-collapsed' : 'app-shell'}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <span className="brand-icon">O</span>
            <span className="brand-text">组织绩效管理</span>
          </div>
          <button
            aria-label={collapsed ? '展开菜单' : '收起菜单'}
            className="sidebar-toggle"
            onClick={() => setCollapsed((current) => !current)}
            type="button"
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>
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
                  <span className="menu-icon">{child.label.slice(0, 1)}</span>
                  <span className="menu-label">{child.label}</span>
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
