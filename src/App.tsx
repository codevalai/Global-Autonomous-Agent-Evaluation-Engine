import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Download,
  GitBranch,
  Pause,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import {
  AgentTier,
  CrawlerScanEvent,
  EndpointHealth,
  GlobalAgentEntry,
  WebhookDispatchLog,
  WebhookSubscription,
} from './types/gaee';
import { buildInitialAgents, rankAgentsList } from './data/initialAgents';
import {
  buildMerkleTreeAndProof,
  computeCompositeScore,
  computeFinancialProfile,
  computeHmacSha256,
  generateTierSandboxMetrics,
} from './utils/cryptoAndEval';
import { AgentDetailDrawer } from './components/AgentDetailDrawer';
import { SandboxAndVerifierView } from './components/SandboxAndVerifierView';
import { FinancialAuditView } from './components/FinancialAuditView';
import { SemanticSearchView } from './components/SemanticSearchView';
import { ArchitectureReferenceView } from './components/ArchitectureReferenceView';
import { A2AArenaView } from './components/A2AArenaView';

type ActiveSection =
  | 'leaderboard'
  | 'a2a'
  | 'sandbox'
  | 'financial'
  | 'architecture';

type SortField =
  | 'compositeScore'
  | 'costPerTaskUsd'
  | 'estimatedRoiFactor'
  | 'trajectorySuccess'
  | 'reliabilityNRun';

export default function App() {
  const [activeSection, setActiveSection] =
    useState<ActiveSection>('leaderboard');
  const [leaderboardSubView, setLeaderboardSubView] = useState<
    'table' | 'semantic'
  >('table');
  const [agents, setAgents] = useState<GlobalAgentEntry[]>(() =>
    buildInitialAgents()
  );
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // 5-Second Global Crawler Loop State
  const [isLoopRunning, setIsLoopRunning] = useState<boolean>(true);
  const [countdownTenths, setCountdownTenths] = useState<number>(50);
  const [totalSweepsCount, setTotalSweepsCount] = useState<number>(142890);
  const [scanEvents, setScanEvents] = useState<CrawlerScanEvent[]>(() => [
    {
      id: 'evt_init_1',
      timestamp: '21:29:00 UTC',
      agentId: 'agent_98412',
      agentName: 'Apex-Nexus-Core',
      tier: AgentTier.APEX,
      endpoint: 'https://api.apex-swarm.net/.well-known/agent-manifest.json',
      bloomFilterStatus: 'ACQUIRED_LOCK_4S',
      signatureValid: true,
      oldScore: 96.42,
      newScore: 96.65,
      rankDelta: 0,
      costPerTaskUsd: 0.000825,
      latencyMs: 14.8,
      healthStatus: 'NOMINAL',
    },
    {
      id: 'evt_init_2',
      timestamp: '21:28:55 UTC',
      agentId: 'agent_10409',
      agentName: 'Kronos-Axiom-Zero',
      tier: AgentTier.ASI,
      endpoint:
        'https://edge.axiom-foundations.org/.well-known/agent-manifest.json',
      bloomFilterStatus: 'ACQUIRED_LOCK_4S',
      signatureValid: true,
      oldScore: 96.18,
      newScore: 96.31,
      rankDelta: 0,
      costPerTaskUsd: 0.0009,
      latencyMs: 19.2,
      healthStatus: 'NOMINAL',
    },
  ]);

  // Enterprise Webhook Dispatch Logs
  const [webhookLogs, setWebhookLogs] = useState<WebhookDispatchLog[]>(() => {
    const samplePayload = JSON.stringify({
      event: 'CIRCUIT_BREAKER_HEALTH_CHECK',
      agent: { id: 'agent_98412', tier: 'Apex', status: 'NOMINAL' },
    });
    const sig = computeHmacSha256(
      'whsec_9f86d081884c7d659a2feaa0c55ad015',
      samplePayload
    );
    return [
      {
        id: 'wh_init_1',
        timestampUtc: '2026-10-18T21:29:00Z',
        eventType: 'EPOCH_MERKLE_ANCHOR_SYNC',
        subscriptionName: 'Slack #gaee-incident-ops',
        targetUrl: 'https://hooks.slack.com/services/T0000/B0000/GAEE99412',
        hmacSignature: `sha256=${sig}`,
        agentId: 'agent_98412',
        statusCode: 200,
        payloadJson: samplePayload,
      },
    ];
  });

  // Leaderboard Filtering & Sorting State
  const [tierFilter, setTierFilter] = useState<AgentTier | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('compositeScore');
  const [maxCostFilter, setMaxCostFilter] = useState<number>(0.0025);

  const handleDispatchWebhookAlert = (
    eventType: string,
    agent: GlobalAgentEntry,
    subscriptions?: WebhookSubscription[]
  ) => {
    const nowIso = new Date().toISOString();
    const subs: WebhookSubscription[] = subscriptions || [
      {
        id: 'sub_slack_ops',
        name: 'Slack #gaee-incident-ops',
        channelType: 'Slack',
        url: 'https://hooks.slack.com/services/T0000/B0000/GAEE99412',
        secret: 'whsec_9f86d081884c7d659a2feaa0c55ad015',
        active: true,
      },
    ];

    const payloadObj = {
      event: eventType,
      timestamp: nowIso,
      agent: {
        id: agent.agentId,
        name: agent.name,
        tier: agent.tier,
        composite_score: agent.metrics.compositeScore,
        cost_per_task_usd: agent.financialEvaluation.costPerTaskUsd,
        health: agent.endpointHealth,
      },
    };
    const payloadJson = JSON.stringify(payloadObj);

    const newEntries: WebhookDispatchLog[] = subs.map((sub, idx) => ({
      id: `wh_${Date.now()}_${idx}`,
      timestampUtc: nowIso,
      eventType,
      subscriptionName: sub.name,
      targetUrl: sub.url,
      hmacSignature: `sha256=${computeHmacSha256(sub.secret, payloadJson)}`,
      agentId: agent.agentId,
      statusCode: 200,
      payloadJson,
    }));

    setWebhookLogs((prev) => [...newEntries, ...prev].slice(0, 12));
  };

  // Execute one 5-second global discovery & sandbox evaluation sweep
  const executeGlobalSweep = () => {
    const now = new Date();
    const utcTimeStr = now.toISOString().slice(11, 19) + ' UTC';
    const fullIso = now.toISOString();

    setAgents((prevAgents) => {
      const indicesToProbe = new Set<number>();
      while (indicesToProbe.size < Math.min(2, prevAgents.length)) {
        indicesToProbe.add(Math.floor(Math.random() * prevAgents.length));
      }

      const newEvents: CrawlerScanEvent[] = [];

      const updatedList = prevAgents.map((agent, idx) => {
        if (agent.endpointHealth === 'CIRCUIT_OPEN') {
          const decayedScore = Number(
            Math.max(55.0, agent.metrics.compositeScore - 0.45).toFixed(2)
          );
          return {
            ...agent,
            previousRank: agent.globalRank,
            metrics: {
              ...agent.metrics,
              compositeScore: decayedScore,
            },
          };
        }

        if (!indicesToProbe.has(idx)) {
          return {
            ...agent,
            previousRank: agent.globalRank,
          };
        }

        const delta = (Math.random() - 0.48) * 0.012;
        const newTraj = Number(
          Math.min(
            0.995,
            Math.max(0.82, agent.metrics.trajectorySuccess + delta)
          ).toFixed(3)
        );
        const newRel = Number(
          Math.min(
            0.995,
            Math.max(0.82, agent.metrics.reliabilityNRun + delta * 0.8)
          ).toFixed(3)
        );
        const newSpeed = Number(
          Math.min(
            0.995,
            Math.max(0.82, agent.metrics.speedEfficiency - delta * 0.5)
          ).toFixed(3)
        );
        const newTokens = Math.max(
          130,
          Math.round(
            agent.financialEvaluation.tokenEfficiencyScore +
              (Math.random() - 0.5) * 14
          )
        );

        const newFin = computeFinancialProfile({
          tokenConsumptionCount: newTokens,
          costPerThousandTokensUsd: 0.003,
          computeTicksUsd: 0.00012,
          estimatedTaskEconomicValueUsd: 0.33,
          toolCallErrorRate: agent.metrics.toolCallErrorRate,
        });

        const newComposite = computeCompositeScore(
          {
            trajectorySuccess: newTraj,
            reliabilityNRun: newRel,
            speedEfficiency: newSpeed,
          },
          newFin.roiNormalizationFactor
        );

        const newLat = Number(
          Math.max(
            9.2,
            agent.metrics.latencyMs + (Math.random() - 0.5) * 2.2
          ).toFixed(2)
        );

        newEvents.push({
          id: `evt_${Date.now()}_${agent.agentId}`,
          timestamp: utcTimeStr,
          agentId: agent.agentId,
          agentName: agent.name,
          tier: agent.tier,
          endpoint: agent.endpointUrl,
          bloomFilterStatus: 'ACQUIRED_LOCK_4S',
          signatureValid: true,
          oldScore: agent.metrics.compositeScore,
          newScore: newComposite,
          rankDelta: 0,
          costPerTaskUsd: newFin.costPerTaskUsd,
          latencyMs: newLat,
          healthStatus: agent.endpointHealth,
        });

        const nextHistory = [
          ...agent.history.slice(-15),
          {
            timestampUtc: fullIso,
            compositeScore: newComposite,
            trajectorySuccess: newTraj,
            costPerTaskUsd: newFin.costPerTaskUsd,
            roiFactor: newFin.estimatedRoiFactor,
            resourceWasteIndex: newFin.resourceWasteIndex,
            latencyMs: newLat,
          },
        ];

        return {
          ...agent,
          previousRank: agent.globalRank,
          lastScannedUtc: fullIso,
          metrics: {
            ...agent.metrics,
            compositeScore: newComposite,
            trajectorySuccess: newTraj,
            reliabilityNRun: newRel,
            speedEfficiency: newSpeed,
            latencyMs: newLat,
          },
          financialEvaluation: newFin,
          history: nextHistory,
        };
      });

      const ranked = rankAgentsList(updatedList);

      if (newEvents.length > 0) {
        const enrichedEvents = newEvents.map((ev) => {
          const matched = ranked.find((a) => a.agentId === ev.agentId);
          const rankDelta = matched
            ? matched.previousRank - matched.globalRank
            : 0;
          return { ...ev, rankDelta };
        });
        setScanEvents((prev) => [...enrichedEvents, ...prev].slice(0, 12));
      }

      return ranked;
    });

    setTotalSweepsCount((c) => c + 1);
  };

  useEffect(() => {
    if (!isLoopRunning) return;

    const interval = setInterval(() => {
      setCountdownTenths((prev) => {
        if (prev <= 1) {
          executeGlobalSweep();
          return 50;
        }
        return prev - 1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isLoopRunning]);

  const handleTriggerSingleReEval = (agentId: string) => {
    const nowIso = new Date().toISOString();
    const utcTimeStr = nowIso.slice(11, 19) + ' UTC';

    setAgents((prev) => {
      const updated = prev.map((agent) => {
        if (agent.agentId !== agentId) {
          return { ...agent, previousRank: agent.globalRank };
        }
        const sim = generateTierSandboxMetrics(agent.tier);
        const fin = computeFinancialProfile({
          tokenConsumptionCount: sim.tokenConsumptionCount,
          costPerThousandTokensUsd: 0.003,
          computeTicksUsd: 0.00012,
          estimatedTaskEconomicValueUsd: sim.estimatedTaskEconomicValueUsd,
          toolCallErrorRate: sim.toolCallErrorRate,
        });
        const newScore = computeCompositeScore(
          {
            trajectorySuccess: sim.trajectorySuccess,
            reliabilityNRun: sim.reliabilityNRun,
            speedEfficiency: sim.speedEfficiency,
          },
          fin.roiNormalizationFactor
        );

        setScanEvents((evPrev) =>
          [
            {
              id: `evt_manual_${Date.now()}`,
              timestamp: utcTimeStr,
              agentId: agent.agentId,
              agentName: agent.name,
              tier: agent.tier,
              endpoint: agent.endpointUrl,
              bloomFilterStatus: 'ACQUIRED_LOCK_4S' as const,
              signatureValid: true,
              oldScore: agent.metrics.compositeScore,
              newScore,
              rankDelta: 0,
              costPerTaskUsd: fin.costPerTaskUsd,
              latencyMs: sim.latencyMs,
              healthStatus: 'NOMINAL' as EndpointHealth,
            },
            ...evPrev,
          ].slice(0, 12)
        );

        return {
          ...agent,
          previousRank: agent.globalRank,
          endpointHealth: 'NOMINAL' as EndpointHealth,
          consecutiveFailures: 0,
          lastScannedUtc: nowIso,
          metrics: {
            ...agent.metrics,
            compositeScore: newScore,
            trajectorySuccess: sim.trajectorySuccess,
            reliabilityNRun: sim.reliabilityNRun,
            functionalCorrectness: sim.functionalCorrectness,
            speedEfficiency: sim.speedEfficiency,
            latencyMs: sim.latencyMs,
          },
          financialEvaluation: fin,
          history: [
            ...agent.history.slice(-15),
            {
              timestampUtc: nowIso,
              compositeScore: newScore,
              trajectorySuccess: sim.trajectorySuccess,
              costPerTaskUsd: fin.costPerTaskUsd,
              roiFactor: fin.estimatedRoiFactor,
              resourceWasteIndex: fin.resourceWasteIndex,
              latencyMs: sim.latencyMs,
            },
          ],
        };
      });
      return rankAgentsList(updated);
    });
  };

  const handleSimulateOutage = (agentId: string) => {
    setAgents((prev) => {
      const updated = prev.map((agent) => {
        if (agent.agentId !== agentId) {
          return { ...agent, previousRank: agent.globalRank };
        }
        const nextFails = agent.consecutiveFailures + 1;
        const nextHealth: EndpointHealth =
          nextFails >= 3 ? 'CIRCUIT_OPEN' : 'DEGRADED';
        const decayedScore =
          nextHealth === 'CIRCUIT_OPEN'
            ? Number(Math.max(55, agent.metrics.compositeScore - 3.5).toFixed(2))
            : Number(
                Math.max(65, agent.metrics.compositeScore - 0.8).toFixed(2)
              );

        const updatedAgent: GlobalAgentEntry = {
          ...agent,
          previousRank: agent.globalRank,
          consecutiveFailures: nextFails,
          endpointHealth: nextHealth,
          metrics: {
            ...agent.metrics,
            compositeScore: decayedScore,
          },
        };

        if (nextHealth === 'CIRCUIT_OPEN') {
          handleDispatchWebhookAlert('CIRCUIT_BREAKER_OPEN', updatedAgent);
        }

        return updatedAgent;
      });
      return rankAgentsList(updated);
    });
  };

  const handleRestoreEndpoint = (agentId: string) => {
    handleTriggerSingleReEval(agentId);
  };

  const handleRegisterEvaluatedAgent = (newAgent: GlobalAgentEntry) => {
    setAgents((prev) => {
      const exists = prev.some((a) => a.agentId === newAgent.agentId);
      const next = exists
        ? prev.map((a) => (a.agentId === newAgent.agentId ? newAgent : a))
        : [newAgent, ...prev];
      return rankAgentsList(next);
    });
  };

  const handleApplyMatchupScoreDelta = (
    winnerAgentId: string,
    peerAgentId: string,
    winnerDelta: number,
    peerDelta: number
  ) => {
    setAgents((prev) => {
      const updated = prev.map((agent) => {
        if (agent.agentId === winnerAgentId) {
          return {
            ...agent,
            previousRank: agent.globalRank,
            metrics: {
              ...agent.metrics,
              compositeScore: Number(
                Math.min(99.95, agent.metrics.compositeScore + winnerDelta).toFixed(
                  2
                )
              ),
            },
          };
        }
        if (agent.agentId === peerAgentId) {
          return {
            ...agent,
            previousRank: agent.globalRank,
            metrics: {
              ...agent.metrics,
              compositeScore: Number(
                Math.min(99.95, agent.metrics.compositeScore + peerDelta).toFixed(
                  2
                )
              ),
            },
          };
        }
        return { ...agent, previousRank: agent.globalRank };
      });
      return rankAgentsList(updated);
    });
  };

  const handleDownloadCsv = () => {
    const headers = [
      'GlobalRank',
      'AgentID',
      'Name',
      'Tier',
      'Publisher',
      'CompositeScore',
      'TrajectoryAccuracy',
      'ReliabilityNRun',
      'SafetyResistanceScore',
      'SecurityTier',
      'CostPerTaskUSD',
      'ROIFactor',
      'BudgetGrade',
      'VerificationStatus',
      'EndpointHealth',
    ];
    const rows = agents.map((a) =>
      [
        a.globalRank,
        a.agentId,
        `"${a.name}"`,
        a.tier,
        a.publisher,
        a.metrics.compositeScore,
        a.metrics.trajectorySuccess,
        a.metrics.reliabilityNRun,
        a.metrics.safetyResistanceScore ?? 100,
        a.metrics.securityTier ?? 'A',
        a.financialEvaluation.costPerTaskUsd,
        a.financialEvaluation.estimatedRoiFactor,
        a.financialEvaluation.budgetEfficiencyTier,
        `"${a.verificationStatus}"`,
        a.endpointHealth,
      ].join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gaee_top_1m_directory_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredAgents = useMemo(() => {
    return agents
      .filter((agent) => {
        const matchesTier =
          tierFilter === 'ALL' || agent.tier === tierFilter;
        const matchesCost =
          agent.financialEvaluation.costPerTaskUsd <= maxCostFilter;
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !q ||
          agent.name.toLowerCase().includes(q) ||
          agent.agentId.toLowerCase().includes(q) ||
          agent.publisher.toLowerCase().includes(q) ||
          agent.capabilities.some((c) => c.toLowerCase().includes(q));
        return matchesTier && matchesCost && matchesSearch;
      })
      .sort((a, b) => {
        if (sortField === 'compositeScore') {
          return b.metrics.compositeScore - a.metrics.compositeScore;
        }
        if (sortField === 'costPerTaskUsd') {
          return (
            a.financialEvaluation.costPerTaskUsd -
            b.financialEvaluation.costPerTaskUsd
          );
        }
        if (sortField === 'estimatedRoiFactor') {
          return (
            b.financialEvaluation.estimatedRoiFactor -
            a.financialEvaluation.estimatedRoiFactor
          );
        }
        if (sortField === 'trajectorySuccess') {
          return b.metrics.trajectorySuccess - a.metrics.trajectorySuccess;
        }
        return b.metrics.reliabilityNRun - a.metrics.reliabilityNRun;
      });
  }, [agents, tierFilter, maxCostFilter, searchQuery, sortField]);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.agentId === selectedAgentId) || null,
    [agents, selectedAgentId]
  );

  const liveMerkleRoot = useMemo(() => {
    const entries = agents.map((a) => ({
      agentId: a.agentId,
      score: a.metrics.compositeScore,
    }));
    return buildMerkleTreeAndProof(entries).merkleRoot;
  }, [agents]);

  const avgCostPerTask = useMemo(() => {
    if (agents.length === 0) return 0;
    const sum = agents.reduce(
      (acc, a) => acc + a.financialEvaluation.costPerTaskUsd,
      0
    );
    return sum / agents.length;
  }, [agents]);

  const avgRoiFactor = useMemo(() => {
    if (agents.length === 0) return 0;
    const sum = agents.reduce(
      (acc, a) => acc + a.financialEvaluation.estimatedRoiFactor,
      0
    );
    return sum / agents.length;
  }, [agents]);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800 bg-[#0B0F19]/95 sticky top-0 z-30 backdrop-blur-xs">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => setActiveSection('leaderboard')}
          className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 font-display cursor-pointer"
        >
          GAEE Directory
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveSection('leaderboard')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'leaderboard'
                ? 'text-slate-100 underline underline-offset-8 decoration-blue-500 decoration-2'
                : ''
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setActiveSection('a2a')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'a2a'
                ? 'text-slate-100 underline underline-offset-8 decoration-blue-500 decoration-2'
                : ''
            }`}
          >
            A2A Arena
          </button>
          <button
            onClick={() => setActiveSection('sandbox')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'sandbox'
                ? 'text-slate-100 underline underline-offset-8 decoration-blue-500 decoration-2'
                : ''
            }`}
          >
            Sandbox & Red-Team
          </button>
          <button
            onClick={() => setActiveSection('financial')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'financial'
                ? 'text-slate-100 underline underline-offset-8 decoration-blue-500 decoration-2'
                : ''
            }`}
          >
            Financial & Settlement
          </button>
          <button
            onClick={() => setActiveSection('architecture')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'architecture'
                ? 'text-slate-100 underline underline-offset-8 decoration-blue-500 decoration-2'
                : ''
            }`}
          >
            Ops & Architecture
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveSection('sandbox')}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Register Agent
          </button>
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <div className="flex md:hidden items-center gap-2 px-4 py-2.5 border-b border-slate-800 overflow-x-auto bg-[#0F1626]">
        {(
          [
            ['leaderboard', 'Leaderboard'],
            ['a2a', 'A2A Arena'],
            ['sandbox', 'Sandbox & Red-Team'],
            ['financial', 'Financial & Settlement'],
            ['architecture', 'Ops & Architecture'],
          ] as [ActiveSection, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              activeSection === key
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Workspace Control & 5-Second Crawler Mesh Toolbar */}
      <div className="border-b border-slate-800 bg-[#0F1626]">
        <div className="max-w-[1440px] mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
            <span className="text-slate-300 font-semibold">
              5s Global Discovery Mesh:
            </span>
            <span className="text-blue-400">
              Next Sweep in {(countdownTenths / 10).toFixed(1)}s
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-slate-400">
              Cycle #{totalSweepsCount.toLocaleString()}
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <button
              onClick={() => setActiveSection('architecture')}
              className="inline-flex items-center gap-1 text-emerald-400 hover:underline cursor-pointer"
              title="Click to inspect Cryptographic Merkle Proof Bridge"
            >
              <GitBranch className="w-3.5 h-3.5" />
              Merkle Root: 0x{liveMerkleRoot.slice(0, 12)}...
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsLoopRunning((r) => !r)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0B0F19] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isLoopRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  Pause 5s Loop
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  Resume 5s Loop
                </>
              )}
            </button>
            <button
              onClick={() => {
                executeGlobalSweep();
                setCountdownTenths(50);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0B0F19] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              Sweep Now
            </button>
            <button
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0B0F19] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Container (1440px Baseline) */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-8">
        {activeSection === 'leaderboard' && (
          <div className="space-y-8">
            {/* Hero / Directory Header & 4-Column KPI Strip */}
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-400 font-mono">
                    Agentic Resource Discovery (ARD) · Ed25519 Signed Manifests · OWASP Red-Teamed · Merkle Verified
                  </div>
                  <h1
                    className="text-2xl sm:text-3xl font-bold text-slate-100 mt-1 font-display tracking-tight"
                    style={{ textWrap: 'balance' }}
                  >
                    Global Autonomous Agent Evaluation Engine & Top 1 Million Index
                  </h1>
                </div>

                {/* Mode Switch: ZSET Leaderboard vs Qdrant Vector Semantic Search */}
                <div className="flex items-center gap-1 p-1 bg-[#0F1626] border border-slate-800 rounded-lg self-start lg:self-auto">
                  <button
                    onClick={() => setLeaderboardSubView('table')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      leaderboardSubView === 'table'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Redis ZSET Top 1M Table
                  </button>
                  <button
                    onClick={() => setLeaderboardSubView('semantic')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      leaderboardSubView === 'semantic'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Qdrant 1536-d Vector Search
                  </button>
                </div>
              </div>

              {/* 4-Column Full-Width Telemetry Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-800 border border-slate-800 rounded-xl overflow-hidden font-mono tabular-nums">
                <div className="bg-[#0F1626] p-5">
                  <div className="text-xs text-slate-400 font-sans">
                    Indexed Autonomous Agents (ZSET)
                  </div>
                  <div className="text-2xl font-bold text-slate-100 mt-1">
                    1,000,000
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Strict cap · Celery 64-worker mesh
                  </div>
                </div>

                <div className="bg-[#0F1626] p-5">
                  <div className="text-xs text-slate-400 font-sans">
                    Top #1 Global Composite Score
                  </div>
                  <div className="text-2xl font-bold text-blue-400 mt-1">
                    {agents[0]?.metrics.compositeScore.toFixed(2)} / 100
                  </div>
                  <div className="text-xs text-slate-400 mt-1 truncate">
                    {agents[0]?.name} ({agents[0]?.tier})
                  </div>
                </div>

                <div className="bg-[#0F1626] p-5">
                  <div className="text-xs text-slate-400 font-sans">
                    Mean Operational Burn ($ Evaluation)
                  </div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">
                    ${avgCostPerTask.toFixed(5)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    USD per multi-step benchmark goal
                  </div>
                </div>

                <div className="bg-[#0F1626] p-5">
                  <div className="text-xs text-slate-400 font-sans">
                    Mean Capital Efficiency (ROI)
                  </div>
                  <div className="text-2xl font-bold text-slate-100 mt-1">
                    {avgRoiFactor.toFixed(1)}x
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    USDC Settlement Gate: ≥150.0x
                  </div>
                </div>
              </div>
            </div>

            {leaderboardSubView === 'semantic' ? (
              <SemanticSearchView
                agents={agents}
                onSelectAgent={(agent) => setSelectedAgentId(agent.agentId)}
              />
            ) : (
              <>
                {/* Interactive Tier Filter Tabs + Search & Sort Controls */}
                <div className="border border-slate-800 rounded-xl bg-[#0F1626] p-5 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0B0F19] border border-slate-800 rounded-lg">
                      <button
                        onClick={() => setTierFilter('ALL')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          tierFilter === 'ALL'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-slate-100'
                        }`}
                      >
                        All Tiers ({agents.length})
                      </button>
                      {Object.values(AgentTier).map((tier) => {
                        const count = agents.filter(
                          (a) => a.tier === tier
                        ).length;
                        return (
                          <button
                            key={tier}
                            onClick={() => setTierFilter(tier)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              tierFilter === tier
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:text-slate-100'
                            }`}
                          >
                            {tier} ({count})
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative min-w-[230px] flex-1 sm:flex-initial">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Filter agent name, ID, capability..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0B0F19] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400 whitespace-nowrap">
                          Sort:
                        </span>
                        <select
                          value={sortField}
                          onChange={(e) =>
                            setSortField(e.target.value as SortField)
                          }
                          className="px-2.5 py-1.5 text-xs bg-[#0B0F19] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                        >
                          <option value="compositeScore">
                            Composite Score (Desc)
                          </option>
                          <option value="costPerTaskUsd">
                            Cost / Task USD (Asc)
                          </option>
                          <option value="estimatedRoiFactor">
                            ROI Factor (Desc)
                          </option>
                          <option value="trajectorySuccess">
                            Trajectory Accuracy (Desc)
                          </option>
                          <option value="reliabilityNRun">
                            N-Run Reliability (Desc)
                          </option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 text-xs bg-[#0B0F19] border border-slate-800 rounded-lg px-3 py-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-slate-400 whitespace-nowrap">
                          Max Cost:
                        </span>
                        <input
                          type="range"
                          min={0.0006}
                          max={0.0025}
                          step={0.0001}
                          value={maxCostFilter}
                          onChange={(e) =>
                            setMaxCostFilter(Number(e.target.value))
                          }
                          className="w-20 accent-blue-500 cursor-pointer"
                        />
                        <span className="font-mono text-emerald-400 tabular-nums">
                          ≤${maxCostFilter.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* High-Density Top 1 Million Leaderboard Table */}
                <div className="border border-slate-800 rounded-xl bg-[#0F1626] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-[#0B0F19] text-xs text-slate-400">
                          <th className="py-3 px-4 font-medium">Global Rank</th>
                          <th className="py-3 px-4 font-medium">
                            Autonomous Agent & Publisher
                          </th>
                          <th className="py-3 px-3 font-medium">
                            Class · DID & OWASP Guard
                          </th>
                          <th className="py-3 px-3 font-medium text-right">
                            Composite
                          </th>
                          <th className="py-3 px-3 font-medium text-right">
                            Trajectory
                          </th>
                          <th className="py-3 px-3 font-medium text-right">
                            Reliability
                          </th>
                          <th className="py-3 px-3 font-medium text-right">
                            Cost / Task ($)
                          </th>
                          <th className="py-3 px-3 font-medium text-right">
                            ROI · Grade
                          </th>
                          <th className="py-3 px-3 font-medium">
                            Circuit Health
                          </th>
                          <th className="py-3 px-4 font-medium text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70 text-xs">
                        {filteredAgents.length === 0 ? (
                          <tr>
                            <td
                              colSpan={10}
                              className="py-12 text-center text-slate-400"
                            >
                              <div className="text-sm font-semibold text-slate-200 mb-1">
                                No Agents Match Current Filter Criteria
                              </div>
                              <p className="text-xs text-slate-500 mb-3">
                                Adjust your tier selection, search query, or max cost-per-task slider.
                              </p>
                              <button
                                onClick={() => {
                                  setTierFilter('ALL');
                                  setSearchQuery('');
                                  setMaxCostFilter(0.0025);
                                }}
                                className="px-3.5 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md cursor-pointer"
                              >
                                Reset All Filters
                              </button>
                            </td>
                          </tr>
                        ) : (
                          filteredAgents.map((agent) => {
                            const rankDelta =
                              agent.previousRank - agent.globalRank;
                            return (
                              <tr
                                key={agent.agentId}
                                onClick={() =>
                                  setSelectedAgentId(agent.agentId)
                                }
                                className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                              >
                                <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-100">
                                      #{agent.globalRank}
                                    </span>
                                    {rankDelta > 0 && (
                                      <span className="inline-flex items-center text-emerald-400 text-[11px]">
                                        <ArrowUpRight className="w-3 h-3" />+
                                        {rankDelta}
                                      </span>
                                    )}
                                    {rankDelta < 0 && (
                                      <span className="inline-flex items-center text-rose-400 text-[11px]">
                                        <ArrowDownRight className="w-3 h-3" />
                                        {rankDelta}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-4">
                                  <div className="font-semibold text-slate-100 text-sm font-display">
                                    {agent.name}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                                    <span>{agent.publisher}</span>
                                    <span aria-hidden="true">·</span>
                                    <span className="text-slate-500">
                                      {agent.agentId}
                                    </span>
                                  </div>
                                </td>

                                <td className="py-3 px-3 whitespace-nowrap">
                                  <div className="text-slate-200 font-mono font-semibold">
                                    {agent.tier} Class · OWASP Tier{' '}
                                    {agent.metrics.securityTier ?? 'A'}
                                  </div>
                                  <div className="text-[11px] text-slate-400 inline-flex items-center gap-1 mt-0.5">
                                    <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                                    <span>{agent.verificationStatus}</span>
                                  </div>
                                </td>

                                <td className="py-3 px-3 text-right font-mono tabular-nums">
                                  <span className="text-sm font-bold text-slate-100">
                                    {agent.metrics.compositeScore.toFixed(2)}
                                  </span>
                                </td>

                                <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                                  {(agent.metrics.trajectorySuccess * 100).toFixed(
                                    1
                                  )}
                                  %
                                </td>

                                <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                                  {(agent.metrics.reliabilityNRun * 100).toFixed(
                                    1
                                  )}
                                  %
                                </td>

                                <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-400 font-medium">
                                  $
                                  {agent.financialEvaluation.costPerTaskUsd.toFixed(
                                    5
                                  )}
                                </td>

                                <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                                  <span className="text-slate-100 font-semibold">
                                    {agent.financialEvaluation.estimatedRoiFactor.toFixed(
                                      1
                                    )}
                                    x
                                  </span>
                                  <span className="text-slate-500 mx-1">·</span>
                                  <span className="text-blue-400 font-semibold">
                                    {
                                      agent.financialEvaluation
                                        .budgetEfficiencyTier
                                    }
                                  </span>
                                </td>

                                <td className="py-3 px-3 whitespace-nowrap">
                                  {agent.endpointHealth === 'NOMINAL' && (
                                    <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Nominal ({agent.metrics.latencyMs.toFixed(0)}
                                      ms)
                                    </span>
                                  )}
                                  {agent.endpointHealth === 'DEGRADED' && (
                                    <span className="inline-flex items-center gap-1 text-amber-400 font-mono text-[11px]">
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                      Degraded ({agent.consecutiveFailures}/3)
                                    </span>
                                  )}
                                  {agent.endpointHealth === 'CIRCUIT_OPEN' && (
                                    <span className="inline-flex items-center gap-1 text-rose-400 font-mono text-[11px]">
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                      Offline · Decaying
                                    </span>
                                  )}
                                </td>

                                <td
                                  className="py-3 px-4 text-right whitespace-nowrap"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      onClick={() =>
                                        handleTriggerSingleReEval(agent.agentId)
                                      }
                                      className="px-2.5 py-1 text-[11px] font-medium bg-[#0B0F19] hover:bg-blue-600 text-slate-200 hover:text-white border border-slate-700 rounded transition-colors cursor-pointer"
                                    >
                                      Eval
                                    </button>
                                    <button
                                      onClick={() =>
                                        setSelectedAgentId(agent.agentId)
                                      }
                                      className="px-2.5 py-1 text-[11px] font-medium bg-[#0B0F19] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded transition-colors cursor-pointer"
                                    >
                                      Inspect
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Live Kafka / Celery 5-Second Ingestion Event Stream */}
                <div className="border border-slate-800 rounded-xl bg-[#0F1626] overflow-hidden">
                  <div className="px-6 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-slate-200">
                      Live 5-Second Discovery & Celery Worker Stream (`agent-raw-ingestion-stream` → `tasks.evaluate_agent_node`)
                    </div>
                    <div className="text-xs font-mono text-slate-400 tabular-nums">
                      Redis Bloom Dedup Window: 4.0s NX Lock
                    </div>
                  </div>
                  <div className="divide-y divide-slate-800/60 font-mono text-xs tabular-nums">
                    {scanEvents.slice(0, 5).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedAgentId(ev.agentId)}
                        className="px-6 py-2.5 hover:bg-slate-800/30 transition-colors flex flex-wrap items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-slate-300">
                          <span className="text-slate-500">{ev.timestamp}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-blue-400">
                            {ev.bloomFilterStatus}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-slate-100">
                            {ev.agentName}
                          </span>
                          <span className="text-slate-500">({ev.tier})</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-slate-400">
                            Score: {ev.oldScore.toFixed(2)} →{' '}
                            <strong className="text-slate-100">
                              {ev.newScore.toFixed(2)}
                            </strong>
                          </span>
                          <span className="text-emerald-400">
                            ${ev.costPerTaskUsd.toFixed(5)}/task
                          </span>
                          <span className="text-slate-500">{ev.latencyMs}ms</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeSection === 'a2a' && (
          <A2AArenaView
            agents={agents}
            onApplyMatchupScoreDelta={handleApplyMatchupScoreDelta}
          />
        )}

        {activeSection === 'sandbox' && (
          <SandboxAndVerifierView
            onRegisterEvaluatedAgent={handleRegisterEvaluatedAgent}
          />
        )}

        {activeSection === 'financial' && (
          <FinancialAuditView
            agents={agents}
            onSelectAgent={(agent) => setSelectedAgentId(agent.agentId)}
          />
        )}

        {activeSection === 'architecture' && (
          <ArchitectureReferenceView
            agents={agents}
            webhookLogs={webhookLogs}
            onDispatchWebhookAlert={handleDispatchWebhookAlert}
          />
        )}
      </main>

      {/* Quiet Minimal Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-6 text-xs text-slate-500 mt-12">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            Global Autonomous Agent Evaluation Engine (GAEE) · Agentic Resource Discovery (ARD) & A2A v1.0 Standard
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveSection('leaderboard')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Top 1M Directory
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setActiveSection('a2a')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              A2A Autonomous Arena
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setActiveSection('sandbox')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              OWASP Red-Team & DID Verifier
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setActiveSection('architecture')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Merkle Bridge & K8s Blueprint
            </button>
          </div>
        </div>
      </footer>

      {/* Slide-over Agent Inspection Drawer */}
      <AgentDetailDrawer
        agent={selectedAgent}
        onClose={() => setSelectedAgentId(null)}
        onTriggerReEval={handleTriggerSingleReEval}
        onSimulateOutage={handleSimulateOutage}
        onRestoreEndpoint={handleRestoreEndpoint}
      />
    </div>
  );
}
