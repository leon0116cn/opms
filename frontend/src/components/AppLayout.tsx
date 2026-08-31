import type { ReactNode } from 'react';

const navigation = [
  {
    label: '方案管理',
    children: [
      { label: '年度考核计划', href: '#', active: true },
    ],
  },
  { label: '过程跟踪', children: [] },
  { label: '绩效评价', children: [] },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">组织绩效管理</div>
        <nav className="menu">
          {navigation.map((item) => (
            <div className="menu-group" key={item.label}>
              <div className="menu-title">{item.label}</div>
              {item.children.map((child) => (
                <a
                  className={child.active ? 'menu-item active' : 'menu-item'}
                  href={child.href}
                  key={child.label}
                >
                  {child.label}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
