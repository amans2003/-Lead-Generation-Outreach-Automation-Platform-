import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserX,
  Clock,
  Search,
  Send,
  Mail,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'All Leads',
    path: '/leads',
    icon: Users,
    children: [
      { label: 'Good Leads',     path: '/leads/good',          icon: UserCheck },
      { label: 'Not Interested', path: '/leads/not-interested', icon: UserX },
      { label: 'Processing',     path: '/leads/processing',     icon: Clock },
    ],
  },
  {
    label: 'Scraper',
    path: '/scraper',
    icon: Search,
  },
  {
    label: 'Outreach',
    path: '/outreach',
    icon: Send,
  },
  {
    label: 'Campaigns',
    path: '/campaigns',
    icon: Mail,
  },
  {
    label: 'Analytics',
    path: '/analytics',
    icon: BarChart2,
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: Settings,
  },
];

function NavItem({ item, collapsed }) {
  const location = useLocation();
  const [open, setOpen] = useState(() =>
    item.children
      ? item.children.some((c) => location.pathname.startsWith(c.path))
      : false
  );

  const isParentActive =
    item.children
      ? item.children.some((c) => location.pathname.startsWith(c.path))
      : location.pathname === item.path;

  const Icon = item.icon;

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen((prev) => !prev)}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isParentActive
              ? 'bg-primary-100 text-primary-700'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
          title={collapsed ? item.label : undefined}
        >
          <Icon size={18} className="shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronRight
                size={14}
                className={clsx(
                  'transition-transform duration-200',
                  open && 'rotate-90'
                )}
              />
            </>
          )}
        </button>

        {!collapsed && open && (
          <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-3">
            {item.children.map((child) => {
              const ChildIcon = child.icon;
              return (
                <NavLink
                  key={child.path}
                  to={child.path}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                    )
                  }
                >
                  <ChildIcon size={15} className="shrink-0" />
                  <span>{child.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary-100 text-primary-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        )
      }
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}

NavItem.propTypes = {
  item: PropTypes.shape({
    label: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    children: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        path: PropTypes.string.isRequired,
        icon: PropTypes.elementType.isRequired,
      })
    ),
  }).isRequired,
  collapsed: PropTypes.bool.isRequired,
};

function Sidebar({ mobileOpen, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-gray-200 transition-all duration-300',
          collapsed ? 'w-16' : 'w-60',
          // Mobile: slide in/out
          'md:static md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div
          className={clsx(
            'flex items-center h-16 px-4 border-b border-gray-200 shrink-0',
            collapsed ? 'justify-center' : 'gap-2'
          )}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-600 shrink-0">
            <Zap size={16} className="text-white" />
          </div>
          {!collapsed && (
            <span className="text-base font-bold text-gray-900 leading-tight">
              LeadGen
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.path} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="hidden md:flex items-center justify-center h-10 border-t border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>
    </>
  );
}

Sidebar.propTypes = {
  mobileOpen: PropTypes.bool,
  onMobileClose: PropTypes.func,
};

Sidebar.defaultProps = {
  mobileOpen: false,
  onMobileClose: () => {},
};

export default Sidebar;
