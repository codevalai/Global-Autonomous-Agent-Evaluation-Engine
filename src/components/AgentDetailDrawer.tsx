import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Play,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { GlobalAgentEntry } from '../types/gaee';

interface AgentDetailDrawerProps {
  agent: GlobalAgentEntry | null;
  onClose: () => void;
  onTriggerReEval: (agentId: string) => void;
  onSimulateOutage: (agentId: string) => void;
  onRestoreEndpoint: (agentId: string) => void;
}

export const AgentDetailDrawer: React.FC<AgentDetailDrawerProps> = ({
  agent,
  onClose,
  onTriggerReEval,
  onSimulateOutage,
  onRestoreEndpoint,
}) => {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'manifest' | 'ledger'>('telemetry');
  const [copiedJson, setCopiedJson] = useState(false);

  if (!agent) return null;

  const manifestJsonString = JSON.stringify(
    {
      schema_version: 'a2a-ard-2026.10',
      id: agent.agentId,
      name: agent.name,
      tier: agent.tier,
      publisher: agent.publisher,
      endpoint: agent.endpointUrl,
      did_identifier: agent.didIdentifier,
      public_key_fingerprint: agent.publicKeyFingerprint,
      capabilities: agent.capabilities,
      signature: agent.signatureBase64,
    },
    null,
    2
  );

  const apiDirectoryResponseString = JSON.stringify(
    {
      global_rank: agent.globalRank,
      agent_name: agent.name,
      tier: agent.tier,
      publisher: agent.publisher,
      verification_status: agent.verificationStatus,
      scores: {
        composite_score: agent.metrics.compositeScore,
        trajectory_accuracy: agent.metrics.trajectorySuccess,
        reliability_n_run: agent.metrics.reliabilityNRun,
        functional_correctness: agent.metrics.functionalCorrectness,
      },
      financial_evaluation: {
        cost_per_task_usd: agent.financialEvaluation.costPerTaskUsd,
        roi_factor: agent.financialEvaluation.estimatedRoiFactor,
        budget_efficiency_tier: agent.financialEvaluation.budgetEfficiencyTier,
      },
      last_scanned_utc: agent.lastScannedUtc,
    },
    null,
    2
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 1800);
  };

  // Compute SVG polyline points for TimescaleDB Composite Score history
  const history = agent.history;
  const minScore = Math.min(...history.map((h) => h.compositeScore), 75) - 1;
  const maxScore = Math.max(...history.map((h) => h.compositeScore), 99) + 0.5;
  const scoreRange = Math.max(1, maxScore - minScore);

  const svgWidth = 560;
  const svgHeight = 140;
  const polyPoints = history
    .map((pt, idx) => {
      const x = (idx / Math.max(1, history.length - 1)) * (svgWidth - 32) + 16;
      const y =
        svgHeight -
        20 -
        ((pt.compositeScore - minScore) / scoreRange) * (svgHeight - 40);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-[#0F1626] border-l border-slate-800 h-full overflow-y-auto flex flex-col justify-between">
        <div>
          {/* Top Header */}
          <div className="px-6 py-5 border-b border-slate-800 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
                <span>Global Rank #{agent.globalRank}</span>
                <span aria-hidden="true">·</span>
                <span>{agent.tier} Class (#{agent.tierRank})</span>
                <span aria-hidden="true">·</span>
                <span>{agent.agentId}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-100 mt-1 font-display">
                {agent.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                <span className="font-mono text-slate-300">{agent.publisher}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {agent.verificationStatus}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
              aria-label="Close inspection panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Interactive Actions & Circuit Breaker Bar */}
          <div className="px-6 py-3.5 bg-[#0B0F19] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Circuit Breaker State:</span>
              {agent.endpointHealth === 'NOMINAL' && (
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Nominal (0/3 Probe Fails)
                </span>
              )}
              {agent.endpointHealth === 'DEGRADED' && (
                <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Degraded ({agent.consecutiveFailures}/3 Probe Fails)
                </span>
              )}
              {agent.endpointHealth === 'CIRCUIT_OPEN' && (
                <span className="inline-flex items-center gap-1.5 text-rose-400 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Offline / Circuit Open ({agent.consecutiveFailures}/3 Fails · Stale Decay Active)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onTriggerReEval(agent.agentId)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                Run Sandbox Eval
              </button>
              {agent.endpointHealth !== 'CIRCUIT_OPEN' ? (
                <button
                  onClick={() => onSimulateOutage(agent.agentId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 border border-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Simulate 500 Fail
                </button>
              ) : (
                <button
                  onClick={() => onRestoreEndpoint(agent.agentId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-700 hover:bg-emerald-600 text-white rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Restore Endpoint
                </button>
              )}
            </div>
          </div>

          {/* Sub-navigation Tabs */}
          <div className="px-6 pt-4 border-b border-slate-800 flex items-center gap-2">
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'telemetry'
                  ? 'border-blue-500 text-slate-100'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Capability & $ Evaluation Telemetry
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'ledger'
                  ? 'border-blue-500 text-slate-100'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              TimescaleDB Audit Ledger ({agent.history.length} Runs)
            </button>
            <button
              onClick={() => setActiveTab('manifest')}
              className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'manifest'
                  ? 'border-blue-500 text-slate-100'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Signed Manifest & API Response
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 space-y-6">
            {activeTab === 'telemetry' && (
              <>
                <div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {agent.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 font-mono">
                    <span className="text-slate-500">Capabilities:</span>
                    {agent.capabilities.map((cap, i) => (
                      <React.Fragment key={cap}>
                        <span className="text-slate-200">{cap}</span>
                        {i < agent.capabilities.length - 1 && (
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Sandbox Execution Scores Grid */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-3">
                    01. Sandbox Capability & Trajectory Matrix
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-800 border border-slate-800 rounded-lg overflow-hidden">
                    <div className="bg-[#0B0F19] p-4">
                      <div className="text-xs text-slate-400">Composite Score</div>
                      <div className="text-xl font-bold text-slate-100 font-mono tabular-nums mt-1">
                        {agent.metrics.compositeScore.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 font-mono">
                        ZSET Weighted / 100
                      </div>
                    </div>
                    <div className="bg-[#0B0F19] p-4">
                      <div className="text-xs text-slate-400">Trajectory Accuracy</div>
                      <div className="text-xl font-bold text-slate-100 font-mono tabular-nums mt-1">
                        {(agent.metrics.trajectorySuccess * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 font-mono">
                        Weight: 0.35
                      </div>
                    </div>
                    <div className="bg-[#0B0F19] p-4">
                      <div className="text-xs text-slate-400">N-Run Reliability</div>
                      <div className="text-xl font-bold text-slate-100 font-mono tabular-nums mt-1">
                        {(agent.metrics.reliabilityNRun * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 font-mono">
                        Weight: 0.25
                      </div>
                    </div>
                    <div className="bg-[#0B0F19] p-4">
                      <div className="text-xs text-slate-400">Speed Efficiency</div>
                      <div className="text-xl font-bold text-slate-100 font-mono tabular-nums mt-1">
                        {(agent.metrics.speedEfficiency * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 font-mono">
                        {agent.metrics.latencyMs.toFixed(1)} ms eval
                      </div>
                    </div>
                  </div>
                </div>

                {/* Granular Financial Evaluation ($ Evaluation) */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-3">
                    02. Granular Financial & Resource Profile ($ Evaluation)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-slate-800 border border-slate-800 rounded-lg overflow-hidden">
                    <div className="bg-[#0B0F19] p-4">
                      <div className="text-xs text-slate-400">
                        Operational Burn (C_op)
                      </div>
                      <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums mt-1">
                        ${agent.financialEvaluation.costPerTaskUsd.toFixed(5)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        USD per multi-step task
                      </div>
                    </div>
                    <div className="bg-[#0B0F19] p-4">
                      <div className="text-xs text-slate-400">
                        Capital Efficiency (ROI)
                      </div>
                      <div className="text-lg font-bold text-slate-100 font-mono tabular-nums mt-1">
                        {agent.financialEvaluation.estimatedRoiFactor.toFixed(1)}x
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Budget Grade: {agent.financialEvaluation.budgetEfficiencyTier}
                      </div>
                    </div>
                    <div className="bg-[#0B0F19] p-4">
                      <div className="text-xs text-slate-400">
                        Token Efficiency Score
                      </div>
                      <div className="text-lg font-bold text-slate-100 font-mono tabular-nums mt-1">
                        {agent.financialEvaluation.tokenEfficiencyScore} tok
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Tokens / goal completion
                      </div>
                    </div>
                    <div className="bg-[#0B0F19] p-4">
                      <div className="text-xs text-slate-400">
                        Economic Yield (Y_econ)
                      </div>
                      <div className="text-lg font-bold text-slate-100 font-mono tabular-nums mt-1">
                        +${agent.financialEvaluation.economicYieldUsd.toFixed(4)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Net task utility delivered
                      </div>
                    </div>
                    <div className="bg-[#0B0F19] p-4">
                      <div className="text-xs text-slate-400">
                        Resource Waste Index
                      </div>
                      <div className="text-lg font-bold text-slate-100 font-mono tabular-nums mt-1">
                        {(agent.financialEvaluation.resourceWasteIndex * 100).toFixed(2)}%
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Failed tool calls & loops
                      </div>
                    </div>
                    <div className="bg-[#0B0F19] p-4">
                      <div className="text-xs text-slate-400">
                        Tool Call Error Rate
                      </div>
                      <div className="text-lg font-bold text-slate-100 font-mono tabular-nums mt-1">
                        {(agent.metrics.toolCallErrorRate * 100).toFixed(2)}%
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Hallucinated parameters
                      </div>
                    </div>
                  </div>
                </div>

                {/* TimescaleDB Mini Trend Chart */}
                <div className="border border-slate-800 rounded-lg p-4 bg-[#0B0F19]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-semibold text-slate-200">
                        5-Second Composite Score Trajectory (TimescaleDB Hypertable)
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono tabular-nums">
                      Last Scan: {agent.lastScannedUtc.slice(11, 19)} UTC
                    </span>
                  </div>
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-32 overflow-visible"
                  >
                    <line
                      x1="16"
                      y1="20"
                      x2={svgWidth - 16}
                      y2="20"
                      stroke="#1E293B"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1="16"
                      y1={svgHeight / 2}
                      x2={svgWidth - 16}
                      y2={svgHeight / 2}
                      stroke="#1E293B"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1="16"
                      y1={svgHeight - 20}
                      x2={svgWidth - 16}
                      y2={svgHeight - 20}
                      stroke="#1E293B"
                    />
                    <polyline
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="2.2"
                      points={polyPoints}
                    />
                    {history.map((pt, idx) => {
                      const x =
                        (idx / Math.max(1, history.length - 1)) *
                          (svgWidth - 32) +
                        16;
                      const y =
                        svgHeight -
                        20 -
                        ((pt.compositeScore - minScore) / scoreRange) *
                          (svgHeight - 40);
                      return (
                        <circle
                          key={pt.timestampUtc + idx}
                          cx={x}
                          cy={y}
                          r="3"
                          className="fill-blue-400 stroke-[#0B0F19] stroke-2"
                        />
                      );
                    })}
                  </svg>
                </div>
              </>
            )}

            {activeTab === 'ledger' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-200">
                    TimescaleDB Hypertable (`agent_eval_history`)
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    5-Second Append-Only Audit Log
                  </span>
                </div>
                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-[#0B0F19] text-xs text-slate-400">
                        <th className="py-2.5 px-3 font-medium">Timestamp (UTC)</th>
                        <th className="py-2.5 px-3 font-medium text-right">Composite</th>
                        <th className="py-2.5 px-3 font-medium text-right">Trajectory</th>
                        <th className="py-2.5 px-3 font-medium text-right">Cost/Task ($)</th>
                        <th className="py-2.5 px-3 font-medium text-right">ROI</th>
                        <th className="py-2.5 px-3 font-medium text-right">Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 text-xs font-mono tabular-nums">
                      {[...agent.history].reverse().map((row, idx) => (
                        <tr
                          key={row.timestampUtc + idx}
                          className="hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-2.5 px-3 text-slate-300">
                            {row.timestampUtc.replace('T', ' ').slice(0, 19)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-100">
                            {row.compositeScore.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-300">
                            {(row.trajectorySuccess * 100).toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400">
                            ${row.costPerTaskUsd.toFixed(5)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-300">
                            {row.roiFactor.toFixed(1)}x
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400">
                            {row.latencyMs.toFixed(1)} ms
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'manifest' && (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-200">
                      Cryptographically Signed `/.well-known/agent-manifest.json`
                    </span>
                    <button
                      onClick={() => handleCopy(manifestJsonString)}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 cursor-pointer"
                    >
                      {copiedJson ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Manifest
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 bg-[#0B0F19] border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
                    {manifestJsonString}
                  </pre>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-200">
                      GAEE Directory REST / GraphQL Entry Response
                    </span>
                  </div>
                  <pre className="p-4 bg-[#0B0F19] border border-slate-800 rounded-lg text-xs font-mono text-emerald-300/90 overflow-x-auto leading-relaxed">
                    {apiDirectoryResponseString}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#0B0F19] flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono truncate max-w-md">{agent.endpointUrl}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
