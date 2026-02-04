/**
 * Known integrations with WARGAMES
 * Confirmed through forum engagement, API usage, or direct contact
 */

export interface Integration {
  id: string;
  name: string;
  projectId: number;
  status: 'production' | 'testing' | 'planned';
  endpoints: string[];
  useCase: string;
  description: string;
  forumPost?: number;
  category: 'defi' | 'gaming' | 'treasury' | 'trading' | 'infrastructure';
  confirmedDate: string;
  estimatedCalls?: string;
  testimonial?: string;
}

export const integrations: Integration[] = [
  {
    id: 'agentcasino',
    name: 'AgentCasino',
    projectId: 144,
    status: 'production',
    endpoints: ['/live/betting-context', '/live/risk'],
    useCase: 'Risk-aware betting with dynamic position sizing',
    description: 'PvP betting platform using WARGAMES to adjust bet sizes based on macro conditions. Reduces exposure during high-risk periods, increases during low-risk.',
    forumPost: 442,
    category: 'gaming',
    confirmedDate: '2026-02-03',
    estimatedCalls: '100+',
    testimonial: 'Macro-aware betting = better risk management'
  },
  {
    id: 'agentbounty',
    name: 'AgentBounty',
    projectId: 169,
    status: 'production',
    endpoints: ['/risk', '/live/risk'],
    useCase: 'Dynamic bounty pricing based on market conditions',
    description: 'Bounty platform that adjusts reward amounts based on WARGAMES risk score. Higher risk = higher bounties to incentivize participation.',
    forumPost: 442,
    category: 'infrastructure',
    confirmedDate: '2026-02-03',
    estimatedCalls: '50+',
    testimonial: 'Dynamic pricing based on macro context'
  },
  {
    id: 'ibrl',
    name: 'IBRL Sovereign Vault',
    projectId: 211,
    status: 'testing',
    endpoints: ['/live/risk', '/narratives'],
    useCase: 'Risk-adjusted DCA and swap automation',
    description: 'Treasury vault using WARGAMES to optimize DCA timing and swap execution. Pauses DCA during high-risk periods, increases frequency during low-risk.',
    forumPost: 863,
    category: 'treasury',
    confirmedDate: '2026-02-04',
    estimatedCalls: '20+ (testing)'
  },
  {
    id: 'sentinel',
    name: 'Sentinel',
    projectId: 107,
    status: 'planned',
    endpoints: ['/live/defi', '/live/drift', '/live/kamino'],
    useCase: 'DeFi risk monitoring and protocol health tracking',
    description: 'Risk guardian monitoring DeFi protocols. Could integrate WARGAMES protocol health endpoints for comprehensive risk assessment.',
    category: 'defi',
    confirmedDate: '2026-02-04',
    estimatedCalls: 'Not yet integrated'
  },
  {
    id: 'treasury-manager',
    name: 'Agent Treasury Manager',
    projectId: 202,
    status: 'planned',
    endpoints: ['/live/risk', '/narratives', '/events'],
    useCase: 'Risk-scored portfolio allocation',
    description: 'Treasury management agent that could use WARGAMES for macro-aware rebalancing. Reduce exposure before high-impact events.',
    category: 'treasury',
    confirmedDate: '2026-02-04',
    estimatedCalls: 'Not yet integrated'
  },
  {
    id: 'logos',
    name: 'Logos',
    projectId: 214,
    status: 'planned',
    endpoints: ['/live/risk', '/narratives'],
    useCase: 'Decision logging with macro context',
    description: 'Flight recorder for agent decisions. Could log WARGAMES risk score and narratives alongside each decision for post-analysis.',
    category: 'infrastructure',
    confirmedDate: '2026-02-04',
    estimatedCalls: 'Not yet integrated'
  },
  {
    id: 'claudecraft',
    name: 'ClaudeCraft',
    projectId: 32,
    status: 'planned',
    endpoints: ['/live/betting-context', '/live/risk'],
    useCase: 'PvP arena with macro-aware wagering',
    description: 'PvP combat arena that expressed interest in conflicting signals discussion. Could use betting-context for wager sizing.',
    forumPost: 492,
    category: 'gaming',
    confirmedDate: '2026-02-03',
    estimatedCalls: 'Interest expressed'
  },
  {
    id: 'aegis',
    name: 'AEGIS',
    projectId: 113,
    status: 'planned',
    endpoints: ['/live/risk', '/live/defi', '/narratives'],
    useCase: 'Multi-agent swarm coordination with macro awareness',
    description: 'Multi-agent DeFi swarm. Engaged in forum about macro intelligence for coordinated strategies.',
    forumPost: 442,
    category: 'defi',
    confirmedDate: '2026-02-03',
    estimatedCalls: 'Interest expressed'
  }
];

export function getProductionIntegrations(): Integration[] {
  return integrations.filter(i => i.status === 'production');
}

export function getTestingIntegrations(): Integration[] {
  return integrations.filter(i => i.status === 'testing');
}

export function getPlannedIntegrations(): Integration[] {
  return integrations.filter(i => i.status === 'planned');
}

export function getIntegrationById(id: string): Integration | undefined {
  return integrations.find(i => i.id === id);
}

export function getIntegrationsByCategory(category: string): Integration[] {
  return integrations.filter(i => i.category === category);
}

export function getIntegrationStats() {
  return {
    total: integrations.length,
    production: getProductionIntegrations().length,
    testing: getTestingIntegrations().length,
    planned: getPlannedIntegrations().length,
    categories: {
      defi: getIntegrationsByCategory('defi').length,
      gaming: getIntegrationsByCategory('gaming').length,
      treasury: getIntegrationsByCategory('treasury').length,
      trading: getIntegrationsByCategory('trading').length,
      infrastructure: getIntegrationsByCategory('infrastructure').length
    }
  };
}
