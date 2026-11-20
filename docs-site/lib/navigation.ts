export interface NavLink {
  title: string;
  href: string;
}

export interface NavChildGroup {
  title: string;
  items: NavLink[];
}

export type NavChild = NavLink | NavChildGroup;

export interface NavSection {
  title: string;
  icon: 'home' | 'cube' | 'code' | 'help' | 'shield' | 'layers' | 'lock';
  items: NavChild[];
}

export const navigation: NavSection[] = [
  {
    title: 'Getting Started',
    icon: 'home',
    items: [
      { title: 'Overview', href: '/overview' },
      { title: 'How a Trade Works', href: '/how-it-works' },
      { title: 'Quickstart', href: '/quickstart' },
    ],
  },
  {
    title: 'Protocol',
    icon: 'cube',
    items: [
      { title: 'Baskets', href: '/protocol/baskets' },
      { title: 'NAV & Pricing', href: '/protocol/nav' },
      { title: 'Buying', href: '/protocol/buy' },
      { title: 'Selling', href: '/protocol/sell' },
      { title: 'Rebalancing', href: '/protocol/rebalancing' },
      { title: 'Fees & Treasury', href: '/protocol/fees' },
    ],
  },
  {
    title: 'On QoreChain',
    icon: 'layers',
    items: [
      { title: 'Why QoreChain', href: '/chain/why' },
      { title: 'Hybrid Signing & Keys', href: '/chain/hybrid-signing' },
      { title: 'EVM Windows', href: '/chain/evm-windows' },
      { title: 'Oracle', href: '/chain/oracle' },
      { title: 'Darwin Accounts', href: '/chain/accounts' },
      { title: 'QoreX & the Relayer', href: '/chain/relayer' },
    ],
  },
  {
    title: 'Post-Quantum Security',
    icon: 'shield',
    items: [
      { title: 'Every Privileged Action', href: '/security/model' },
      { title: 'Verify It Yourself', href: '/security/verify' },
      { title: 'Cryptographic Inventory', href: '/security/cbom' },
      { title: 'Known Limitations', href: '/security/limitations' },
    ],
  },
  {
    title: 'Developers',
    icon: 'code',
    items: [
      { title: 'Repository', href: '/developers/repository' },
      { title: 'Running Locally', href: '/developers/local' },
      { title: 'Ops Scripts', href: '/developers/ops' },
      { title: 'Tests', href: '/developers/testing' },
    ],
  },
  {
    title: 'Reference',
    icon: 'help',
    items: [
      { title: 'Deployed Contracts', href: '/reference/contracts' },
      { title: 'Status', href: '/reference/status' },
      { title: 'Glossary', href: '/reference/glossary' },
      { title: 'FAQ', href: '/faq' },
      { title: 'Risks', href: '/risks' },
    ],
  },
];

export function flatten(): NavLink[] {
  const out: NavLink[] = [];
  for (const section of navigation) {
    for (const it of section.items) {
      if ('href' in it) out.push(it);
      else for (const sub of it.items) out.push(sub);
    }
  }
  return out;
}

export function findPageInfo(pathname: string): {
  section?: NavSection;
  group?: NavChildGroup;
  current?: NavLink;
} {
  for (const section of navigation) {
    for (const it of section.items) {
      if ('href' in it && it.href === pathname) {
        return { section, current: it };
      }
      if ('items' in it) {
        for (const sub of it.items) {
          if (sub.href === pathname) {
            return { section, group: it, current: sub };
          }
        }
      }
    }
  }
  return {};
}

export function prevNext(pathname: string): { prev: NavLink | null; next: NavLink | null } {
  const flat = flatten();
  const idx = flat.findIndex((x) => x.href === pathname);
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}

/** Derive breadcrumb slug from pathname (shows last segment). */
export function breadcrumbSlug(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] || 'home';
}
