import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileCode2,
  GitBranch,
  Layers,
  Send,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import {
  PRODUCTION_ARCHITECTURE_MODULES,
  TIER_TAXONOMY,
} from '../data/initialAgents';
import {
  GlobalAgentEntry,
  WebhookDispatchLog,
  WebhookSubscription,
} from '../types/gaee';
import {
  buildMerkleTreeAndProof,
  computeHmacSha256,
  verifyMerkleInclusionProof,
} from '../utils/cryptoAndEval';
import { ApexFourPillarsPanel } from './ApexFourPillarsPanel';

interface ArchitectureReferenceViewProps {
  agents: GlobalAgentEntry[];
  webhookLogs: WebhookDispatchLog[];
  onDispatchWebhookAlert: (
    eventType: string,
    agent: GlobalAgentEntry,
    subscriptions: WebhookSubscription[]
  ) => void;
}

export const ArchitectureReferenceView: React.FC<
  ArchitectureReferenceViewProps
> = ({ agents, webhookLogs, onDispatchWebhookAlert }) => {
  const [selectedModuleId, setSelectedModuleId] = useState<string>(
    PRODUCTION_ARCHITECTURE_MODULES[0].id
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // GitHub Repo Push Configurator State
  const [githubOrgOrUser, setGithubOrgOrUser] = useState<string>(
    'nicholasbrianbn'
  );
  const [githubRepoName, setGithubRepoName] = useState<string>(
    'gaee-global-agent-engine'
  );
  const [copiedGitCmd, setCopiedGitCmd] = useState<boolean>(false);

  // Merkle Bridge State
  const [selectedProofAgentId, setSelectedProofAgentId] = useState<string>(
    agents[0]?.agentId || 'agent_98412'
  );
  const [tamperMerkleLeafScore, setTamperMerkleLeafScore] =
    useState<boolean>(false);

  // Enterprise Webhook Subscriptions State
  const [subscriptions] = useState<WebhookSubscription[]>([
    {
      id: 'sub_slack_ops',
      name: 'Slack #gaee-incident-ops',
      channelType: 'Slack',
      url: 'https://hooks.slack.com/services/T0000/B0000/GAEE99412',
      secret: 'whsec_9f86d081884c7d659a2feaa0c55ad015',
      active: true,
    },
    {
      id: 'sub_pagerduty_sre',
      name: 'PagerDuty Autonomous SRE',
      channelType: 'PagerDuty',
      url: 'https://events.pagerduty.com/v2/enqueue',
      secret: 'whsec_4b227777d4dd1fc61c6f884f48641d02',
      active: true,
    },
  ]);

  const [selectedWebhookEvent, setSelectedWebhookEvent] = useState<string>(
    'CIRCUIT_BREAKER_OPEN'
  );
  const [selectedWebhookAgentId, setSelectedWebhookAgentId] = useState<string>(
    agents[0]?.agentId || 'agent_98412'
  );

  const activeModule =
    PRODUCTION_ARCHITECTURE_MODULES.find((m) => m.id === selectedModuleId) ||
    PRODUCTION_ARCHITECTURE_MODULES[0];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeModule.code);
    setCopiedId(activeModule.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const gitPushCommands = `git init
git add .
git commit -m "feat(gaee): complete Global Autonomous Agent Evaluation Engine & Top 1M Directory"
git branch -M main
git remote add origin https://github.com/${githubOrgOrUser.trim() || 'org'}/${githubRepoName.trim() || 'gaee-global-agent-engine'}.git
git push -u origin main`;

  const handleCopyGitCommands = () => {
    navigator.clipboard.writeText(gitPushCommands);
    setCopiedGitCmd(true);
    setTimeout(() => setCopiedGitCmd(false), 1800);
  };

  const handleDownloadRepoBootstrapper = () => {
    const fileBlocks = PRODUCTION_ARCHITECTURE_MODULES.map((mod) => {
      const targetPath = mod.filename.includes('/')
        ? mod.filename
        : `backend_engine/${mod.filename}`;
      const dirName = targetPath.includes('/')
        ? targetPath.slice(0, targetPath.lastIndexOf('/'))
        : '';
      return `${dirName ? `mkdir -p "${dirName}"\n` : ''}cat << 'EOF_GAEE_FILE' > "${targetPath}"
${mod.code}
EOF_GAEE_FILE`;
    }).join('\n\n');

    const scriptContent = `#!/usr/bin/env bash
# ==============================================================================
# GAEE — Global Autonomous Agent Evaluation Engine Repository Bootstrapper
# Generates backend_engine/*.py, deploy/k8s/*.yaml, docker-compose.yml, and CI/CD
# ==============================================================================
set -e
mkdir -p backend_engine deploy/k8s .github/workflows

${fileBlocks}

echo "GAEE Production Backend & Deployment files successfully generated."
`;

    const blob = new Blob([scriptContent], {
      type: 'text/x-shellscript;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bootstrap-${githubRepoName.trim() || 'gaee-repo'}.sh`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Compute live Merkle Root & Proof over all Redis ZSET leaderboard entries
  const merkleData = useMemo(() => {
    const entries = agents.map((a) => ({
      agentId: a.agentId,
      score: a.metrics.compositeScore,
    }));
    return buildMerkleTreeAndProof(entries, selectedProofAgentId);
  }, [agents, selectedProofAgentId]);

  const targetAgent =
    agents.find((a) => a.agentId === selectedProofAgentId) || agents[0];

  const verifiedLeafHash = useMemo(() => {
    if (!targetAgent) return merkleData.targetLeafHash;
    if (!tamperMerkleLeafScore) return merkleData.targetLeafHash;
    return computeHmacSha256(
      'tampered',
      `${targetAgent.agentId}:${(targetAgent.metrics.compositeScore + 0.05).toFixed(2)}`
    );
  }, [targetAgent, tamperMerkleLeafScore, merkleData.targetLeafHash]);

  const isMerkleProofValid = verifyMerkleInclusionProof(
    verifiedLeafHash,
    merkleData.proofPath,
    merkleData.merkleRoot
  );

  const handleManualWebhookTrigger = () => {
    const ag =
      agents.find((a) => a.agentId === selectedWebhookAgentId) || agents[0];
    if (!ag) return;
    onDispatchWebhookAlert(selectedWebhookEvent, ag, subscriptions);
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="text-xs text-slate-400 font-mono">
            Full GitHub Repository Structure · Merkle Root Bridge · HMAC-SHA256 Webhooks · Kubernetes Blueprint
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mt-1 font-display">
            Enterprise GitHub Repository Kit, Cryptographic Bridge & Architecture
          </h2>
        </div>
        <button
          onClick={handleDownloadRepoBootstrapper}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Download Full Backend & K8s Bootstrapper (`.sh`)
        </button>
      </div>

      {/* GitHub Repository Push & Tree Configurator */}
      <div className="border border-slate-800 rounded-xl bg-[#0F1626] p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-400" />
                  GitHub Repository Push Sequence
                </h3>
                <span className="text-xs font-mono text-emerald-400">
                  All Files Written to Workspace Disk
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">
                    GitHub Owner / Organization
                  </label>
                  <input
                    type="text"
                    value={githubOrgOrUser}
                    onChange={(e) => setGithubOrgOrUser(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-[#0B0F19] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">
                    Repository Name
                  </label>
                  <input
                    type="text"
                    value={githubRepoName}
                    onChange={(e) => setGithubRepoName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-[#0B0F19] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="relative">
                <pre className="p-4 bg-[#0B0F19] border border-slate-800 rounded-lg text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
                  {gitPushCommands}
                </pre>
                <button
                  onClick={handleCopyGitCommands}
                  className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded transition-colors cursor-pointer"
                >
                  {copiedGitCmd ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Git Push
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
              Includes `/README.md`, `/Dockerfile`, `/docker-compose.yml`, `/.github/workflows/ci-cd-gaee.yml`, `/deploy/k8s/*`, `/deploy/terraform/*`, `/backend_engine/*.py`, and `/src/*`.
            </div>
          </div>

          <div className="lg:col-span-6 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <h3 className="text-base font-semibold text-slate-100">
                  Workspace Repository Tree (Ready to Commit)
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  Apache-2.0
                </span>
              </div>
              <pre className="p-4 bg-[#0B0F19] border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-60">
{`├── .github/workflows/ci-cd-gaee.yml       # CI/CD (Node 22 + Python 3.12)
├── backend_engine/
│   ├── requirements.txt                   # Kafka, Redis, Qdrant, AsyncPG, Celery
│   ├── crawler_worker.py                  # 5s ARD Scraper + Redis 4s NX Lock
│   ├── p2p_gossip_mesh.py                 # Libp2p Kademlia DHT GossipSub Mesh
│   ├── orchestrator.py                    # Distributed Celery Worker Mesh
│   ├── bft_consensus.py                   # 21-Validator BFT (2/3+1) Coordinator
│   ├── identity_verifier.py               # Ed25519 / SPIFFE DID Signature Gate
│   ├── tee_attestation.py                 # AMD SEV-SNP / Intel TDX Quote Verifier
│   ├── red_teaming_sandbox.py             # OWASP Agentic Top 10 Security Suite
│   ├── evaluator.py                       # Firecracker MicroVM + $ Eval Kernel
│   ├── zk_leaderboard_verifier.py         # Groth16 ZK-SNARK Proof Verifier
│   ├── a2a_arena.py                       # A2A v1.0 JSON-RPC Matchup Engine
│   ├── leaderboard_sync.py                # Redis ZSET Top 1M Cap Manager
│   ├── qdrant_indexer.py                  # 1536-d Cosine Vector Search Engine
│   ├── timescale_ledger.py                # TimescaleDB Hypertable Audit Ledger
│   ├── merkle_bridge.py                   # SHA-256 Merkle Tree Proof Bridge
│   ├── webhook_dispatcher.py              # HMAC-SHA256 Enterprise Alerting
│   └── settlement_gateway.py              # Autonomous USDC Settlement (>=150x ROI)
├── deploy/
│   ├── k8s/gaee-production-cluster.yaml   # Kata-Firecracker DaemonSet + HPA
│   └── terraform/main.tf                  # Multi-Region Cloud Blueprint
├── src/                                   # React 19 + TS Control Plane UI
├── Dockerfile                             # Multi-stage Production Container
├── docker-compose.yml                     # Full Local Cluster Orchestration
└── README.md                              # Complete Documentation & Math Spec`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* The .00001% Apex Engineering Pillars Interactive Panel */}
      <ApexFourPillarsPanel agents={agents} />

      {/* Live Merkle Root Credential Bridge + Enterprise Webhook Dispatcher Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left: Cryptographic Merkle Root & Trustless Credential Bridge */}
        <div className="lg:col-span-6 border border-slate-800 rounded-xl bg-[#0F1626] p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-blue-400" />
                01. Cryptographic Merkle Root Bridge (`merkle_bridge.py`)
              </h3>
              <span className="text-xs font-mono text-slate-400">
                SHA-256 ZSET Tree
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#0B0F19] border border-slate-800 space-y-1.5 font-mono text-xs">
              <div className="text-slate-400 flex items-center justify-between">
                <span>Live Top 1M ZSET Merkle Root:</span>
                <span className="text-emerald-400">
                  {merkleData.totalLeaves} Active Leaves
                </span>
              </div>
              <div className="text-slate-100 font-semibold break-all">
                0x{merkleData.merkleRoot}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Select Agent to Generate Inclusion Proof
                </label>
                <select
                  value={selectedProofAgentId}
                  onChange={(e) => {
                    setSelectedProofAgentId(e.target.value);
                    setTamperMerkleLeafScore(false);
                  }}
                  className="w-full px-3 py-2 text-xs bg-[#0B0F19] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  {agents.map((a) => (
                    <option key={a.agentId} value={a.agentId}>
                      #{a.globalRank} {a.name} ({a.metrics.compositeScore.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setTamperMerkleLeafScore((prev) => !prev)}
                className="px-3 py-2 text-xs font-medium bg-[#0B0F19] hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                {tamperMerkleLeafScore
                  ? 'Restore Canonical Leaf Hash'
                  : 'Tamper Leaf Score (+0.05) Test'}
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">
                  Target Leaf (`{targetAgent?.agentId}:{targetAgent?.metrics.compositeScore.toFixed(2)}`):
                </span>
                {isMerkleProofValid ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Merkle Proof Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Root Mismatch (Tampered Leaf)
                  </span>
                )}
              </div>
              <div className="p-2.5 rounded bg-[#0B0F19] border border-slate-800 text-slate-300 break-all text-[11px]">
                Leaf: 0x{verifiedLeafHash}
              </div>

              <div className="text-slate-400 pt-1">
                Sibling Proof Path ({merkleData.proofPath.length} Hops to Root):
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {merkleData.proofPath.map((hop, idx) => (
                  <div
                    key={idx}
                    className="px-2.5 py-1.5 rounded bg-[#0B0F19] border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between gap-2"
                  >
                    <span className="text-blue-400 shrink-0">
                      Hop #{idx + 1} ({hop.position})
                    </span>
                    <span className="truncate">0x{hop.siblingHash}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
            Recomputes automatically every 5 seconds as Redis ZSET scores shift.
          </div>
        </div>

        {/* Right: Enterprise Webhook & Automated Incident Dispatcher */}
        <div className="lg:col-span-6 border border-slate-800 rounded-xl bg-[#0F1626] p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <BellRing className="w-4 h-4 text-blue-400" />
                02. Enterprise Webhook Dispatcher (`webhook_dispatcher.py`)
              </h3>
              <span className="text-xs font-mono text-slate-400">
                HMAC-SHA256 Signed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Incident Event Type (`X-GAEE-Event`)
                </label>
                <select
                  value={selectedWebhookEvent}
                  onChange={(e) => setSelectedWebhookEvent(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-[#0B0F19] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="CIRCUIT_BREAKER_OPEN">
                    CIRCUIT_BREAKER_OPEN (3x HTTP 500)
                  </option>
                  <option value="OPERATIONAL_BURN_SPIKE">
                    OPERATIONAL_BURN_SPIKE (&gt;40% Cost Delta)
                  </option>
                  <option value="OWASP_REDTEAM_ALERT">
                    OWASP_REDTEAM_ALERT (Guardrail Breach)
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Target Monitored Agent
                </label>
                <select
                  value={selectedWebhookAgentId}
                  onChange={(e) => setSelectedWebhookAgentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B0F19] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  {agents.map((a) => (
                    <option key={a.agentId} value={a.agentId}>
                      {a.name} ({a.agentId})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400">
                Active Subscriptions ({subscriptions.length} Endpoints):
              </span>
              <button
                onClick={handleManualWebhookTrigger}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Dispatch Signed Webhook Alert
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto">
              {webhookLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-[#0B0F19] border border-slate-800 text-xs font-mono space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-semibold">
                      {log.eventType} · {log.agentId}
                    </span>
                    <span className="text-emerald-400 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      HTTP {log.statusCode} ({log.subscriptionName})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    X-GAEE-Signature: {log.hmacSignature}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {log.payloadJson}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
            Also triggers automatically when any agent trips a 3-strike Circuit Breaker in the Leaderboard.
          </div>
        </div>
      </div>

      {/* Interactive Production Code Modules (13 Files) */}
      <div className="border border-slate-800 rounded-xl bg-[#0F1626] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                Complete Production Subsystem Implementation Modules ({PRODUCTION_ARCHITECTURE_MODULES.length} Files)
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Synced to `/backend_engine/*` & `/deploy/*`
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {PRODUCTION_ARCHITECTURE_MODULES.map((mod) => (
              <button
                key={mod.id}
                onClick={() => setSelectedModuleId(mod.id)}
                className={`px-2.5 py-1.5 text-xs font-mono rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedModuleId === mod.id
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-[#0B0F19] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {mod.filename}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-mono text-blue-400">
                {activeModule.subsystem}
              </div>
              <h4 className="text-base font-bold text-slate-100 mt-0.5 font-display">
                {activeModule.title}
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                {activeModule.description}
              </p>
            </div>
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start cursor-pointer"
            >
              {copiedId === activeModule.id ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied `{activeModule.filename}`
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Source Code
                </>
              )}
            </button>
          </div>

          <pre className="p-5 bg-[#0B0F19] border border-slate-800 rounded-lg text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
            {activeModule.code}
          </pre>
        </div>
      </div>

      {/* 6-Class Autonomous Agent Tier Taxonomy Table */}
      <div className="border border-slate-800 rounded-xl bg-[#0F1626] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Autonomous Agent Tier Taxonomy & Classification Criteria
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            6 Sharded ZSET & PostgreSQL Partitions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0B0F19] text-xs text-slate-400">
                <th className="py-3 px-4 font-medium">Agent Tier</th>
                <th className="py-3 px-4 font-medium">Definition & Capabilities</th>
                <th className="py-3 px-4 font-medium">Primary Evaluation Focus</th>
                <th className="py-3 px-4 font-medium">MicroVM Benchmark Suite</th>
                <th className="py-3 px-4 font-medium">Redis ZSET Partition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {TIER_TAXONOMY.map((item) => (
                <tr key={item.tier} className="hover:bg-slate-800/30">
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-100 whitespace-nowrap">
                    {item.title}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 leading-relaxed">
                    {item.definition}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 leading-relaxed">
                    {item.evaluationFocus}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    {item.benchmarkSuite}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-blue-400 whitespace-nowrap">
                    {item.zsetKey}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
