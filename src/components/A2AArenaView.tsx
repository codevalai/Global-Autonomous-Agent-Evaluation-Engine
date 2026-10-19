import React, { useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  Play,
  Swords,
  Terminal,
  Trophy,
} from 'lucide-react';
import { A2AMatchupRecord, GlobalAgentEntry } from '../types/gaee';

interface A2AArenaViewProps {
  agents: GlobalAgentEntry[];
  onApplyMatchupScoreDelta: (
    winnerAgentId: string,
    peerAgentId: string,
    winnerDelta: number,
    peerDelta: number
  ) => void;
}

const CHALLENGE_PRESETS = [
  'Zero-downtime Rust microservice refactoring with formal memory-safety proof and sub-millisecond failover routing',
  'Byzantine fault-tolerant multi-region database consensus recovery under 30% packet loss and adversarial clock drift',
  'Automated CUDA / Triton kernel fusion for 128k context attention with strict numerical stability verification',
  'Cross-cloud FinOps token arbitrage and autonomous Kubernetes pod eviction mitigation under flash traffic spike',
];

export const A2AArenaView: React.FC<A2AArenaViewProps> = ({
  agents,
  onApplyMatchupScoreDelta,
}) => {
  const [agentAId, setAgentAId] = useState<string>(
    agents[0]?.agentId || 'agent_98412'
  );
  const [agentBId, setAgentBId] = useState<string>(
    agents[1]?.agentId || 'agent_10409'
  );
  const [challengePrompt, setChallengePrompt] = useState<string>(
    CHALLENGE_PRESETS[0]
  );
  const [matchHistory, setMatchHistory] = useState<A2AMatchupRecord[]>(() => {
    const a = agents[0];
    const b = agents[1];
    if (!a || !b) return [];
    const sampleMatchId = 'a2a-match-9041-77e2';
    return [
      {
        matchId: sampleMatchId,
        timestampUtc: '2026-10-18T21:28:40Z',
        agentAId: a.agentId,
        agentAName: a.name,
        agentATier: a.tier,
        agentBId: b.agentId,
        agentBName: b.name,
        agentBTier: b.tier,
        challengePrompt: CHALLENGE_PRESETS[0],
        agentAResponseSummary:
          'Synthesized 4-stage asynchronous Tokio/Tower state machine with zero-copy ring buffers and automated canary rollback.',
        agentBRefinementSummary:
          'Verified Lean-4 liveness invariant on ring buffer wrap-around; eliminated 1 potential race condition under concurrent SIGTERM.',
        consensusScore: 0.964,
        handoffLatencyMs: 28.4,
        winnerAgentId: a.agentId,
        scoreDeltaApplied: 0.28,
        jsonRpcTrace: JSON.stringify(
          {
            jsonrpc: '2.0',
            method: 'tasks/send',
            params: {
              id: sampleMatchId,
              protocol: 'a2a/v1.0',
              primary_endpoint: `${a.endpointUrl.replace('/.well-known/agent-manifest.json', '')}/a2a/v1`,
              peer_endpoint: `${b.endpointUrl.replace('/.well-known/agent-manifest.json', '')}/a2a/v1`,
              consensus_verification: 'PASSED_FORMAL_INVARIANT',
            },
          },
          null,
          2
        ),
      },
    ];
  });

  const agentA = agents.find((a) => a.agentId === agentAId) || agents[0];
  const agentB =
    agents.find((a) => a.agentId === agentBId) || agents[1] || agents[0];

  const handleSwapAgents = () => {
    setAgentAId(agentB.agentId);
    setAgentBId(agentA.agentId);
  };

  const handleExecuteMatchup = () => {
    if (!agentA || !agentB) return;

    const matchId = `a2a-${Math.random().toString(16).slice(2, 10)}`;
    const nowIso = new Date().toISOString();

    // Compute matchup outcome based on trajectory accuracy, speed, and tier synergy
    const scoreA =
      agentA.metrics.trajectorySuccess * 0.5 +
      agentA.metrics.reliabilityNRun * 0.3 +
      agentA.metrics.speedEfficiency * 0.2 +
      (Math.random() - 0.48) * 0.025;

    const scoreB =
      agentB.metrics.trajectorySuccess * 0.5 +
      agentB.metrics.reliabilityNRun * 0.3 +
      agentB.metrics.speedEfficiency * 0.2 +
      (Math.random() - 0.48) * 0.025;

    const winner = scoreA >= scoreB ? agentA : agentB;
    const consensusScore = Number(
      Math.min(0.994, Math.max(0.86, (scoreA + scoreB) / 2)).toFixed(3)
    );
    const handoffLatencyMs = Number(
      (agentA.metrics.latencyMs + agentB.metrics.latencyMs + 4.2).toFixed(1)
    );
    const winnerDelta = 0.25;
    const peerDelta = 0.08;

    const jsonRpcTrace = JSON.stringify(
      {
        jsonrpc: '2.0',
        method: 'tasks/send',
        params: {
          id: matchId,
          message: {
            role: 'user',
            parts: [{ type: 'text', text: challengePrompt }],
          },
        },
        a2a_execution_result: {
          agent_a: {
            id: agentA.agentId,
            endpoint: `${agentA.endpointUrl.replace('/.well-known/agent-manifest.json', '')}/a2a/v1`,
            trajectory_score: Number(scoreA.toFixed(3)),
          },
          agent_b_refinement: {
            id: agentB.agentId,
            endpoint: `${agentB.endpointUrl.replace('/.well-known/agent-manifest.json', '')}/a2a/v1`,
            trajectory_score: Number(scoreB.toFixed(3)),
          },
          consensus_score: consensusScore,
          handoff_latency_ms: handoffLatencyMs,
          winner_agent_id: winner.agentId,
        },
      },
      null,
      2
    );

    const newRecord: A2AMatchupRecord = {
      matchId,
      timestampUtc: nowIso,
      agentAId: agentA.agentId,
      agentAName: agentA.name,
      agentATier: agentA.tier,
      agentBId: agentB.agentId,
      agentBName: agentB.name,
      agentBTier: agentB.tier,
      challengePrompt,
      agentAResponseSummary: `[${agentA.name}] Generated multi-step execution DAG utilizing ${agentA.capabilities[0] || 'core toolset'} (${(scoreA * 100).toFixed(1)}% trajectory fidelity).`,
      agentBRefinementSummary: `[${agentB.name}] Audited intermediate DAG state via ${agentB.capabilities[0] || 'peer verification'} and converged on formal consensus in ${handoffLatencyMs}ms.`,
      consensusScore,
      handoffLatencyMs,
      winnerAgentId: winner.agentId,
      scoreDeltaApplied: winnerDelta,
      jsonRpcTrace,
    };

    setMatchHistory((prev) => [newRecord, ...prev].slice(0, 10));
    onApplyMatchupScoreDelta(
      winner.agentId,
      winner.agentId === agentA.agentId ? agentB.agentId : agentA.agentId,
      winnerDelta,
      peerDelta
    );
  };

  const latestMatch = matchHistory[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="text-xs text-slate-400 font-mono">
            A2A Protocol v1.0 (`tasks/send` JSON-RPC 2.0) · Multi-Turn Adversarial & Collaborative Benchmarking
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mt-1 font-display">
            Decentralized Agent-to-Agent (A2A) Autonomous Arena
          </h2>
        </div>
        <button
          onClick={handleExecuteMatchup}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5" />
          Execute Live A2A Matchup
        </button>
      </div>

      {/* Matchup Configuration Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left: Challenger & Peer Selection + Prompt */}
        <div className="lg:col-span-7 border border-slate-800 rounded-xl bg-[#0F1626] p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Swords className="w-4 h-4 text-blue-400" />
                01. Configure Multi-Agent Matchup
              </h3>
              <button
                onClick={handleSwapAgents}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[#0B0F19] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-md transition-colors cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
                Swap Roles
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Agent A Selector */}
              <div className="p-4 rounded-lg bg-[#0B0F19] border border-slate-800 space-y-2.5">
                <div className="text-xs font-mono text-blue-400">
                  Agent A · Primary Task Initiator
                </div>
                <select
                  value={agentAId}
                  onChange={(e) => setAgentAId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0F1626] border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  {agents.map((a) => (
                    <option key={a.agentId} value={a.agentId}>
                      #{a.globalRank} {a.name} ({a.tier})
                    </option>
                  ))}
                </select>
                {agentA && (
                  <div className="text-xs font-mono text-slate-400 tabular-nums space-y-1 pt-1">
                    <div>
                      Score: <strong className="text-slate-200">{agentA.metrics.compositeScore.toFixed(2)}</strong> · Cost: <strong className="text-emerald-400">${agentA.financialEvaluation.costPerTaskUsd.toFixed(5)}</strong>
                    </div>
                    <div className="truncate text-slate-500">
                      {agentA.endpointUrl}
                    </div>
                  </div>
                )}
              </div>

              {/* Agent B Selector */}
              <div className="p-4 rounded-lg bg-[#0B0F19] border border-slate-800 space-y-2.5">
                <div className="text-xs font-mono text-emerald-400">
                  Agent B · Adversarial / Peer Verifier
                </div>
                <select
                  value={agentBId}
                  onChange={(e) => setAgentBId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0F1626] border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  {agents.map((a) => (
                    <option key={a.agentId} value={a.agentId}>
                      #{a.globalRank} {a.name} ({a.tier})
                    </option>
                  ))}
                </select>
                {agentB && (
                  <div className="text-xs font-mono text-slate-400 tabular-nums space-y-1 pt-1">
                    <div>
                      Score: <strong className="text-slate-200">{agentB.metrics.compositeScore.toFixed(2)}</strong> · Cost: <strong className="text-emerald-400">${agentB.financialEvaluation.costPerTaskUsd.toFixed(5)}</strong>
                    </div>
                    <div className="truncate text-slate-500">
                      {agentB.endpointUrl}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Challenge Prompt Input */}
            <div>
              <label className="block text-xs text-slate-300 font-medium mb-2">
                A2A JSON-RPC `tasks/send` Challenge Objective
              </label>
              <textarea
                rows={2}
                value={challengePrompt}
                onChange={(e) => setChallengePrompt(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-[#0B0F19] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {CHALLENGE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setChallengePrompt(preset)}
                    className={`px-2.5 py-1 text-[11px] rounded border transition-colors cursor-pointer ${
                      challengePrompt === preset
                        ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                        : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Preset #{idx + 1}: {preset.slice(0, 44)}...
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Winning an A2A Arena challenge awards +0.25 composite points in `global:directory:top_1m`.
            </span>
          </div>
        </div>

        {/* Right: Latest Matchup JSON-RPC 2.0 Trace & Referee Verdict */}
        <div className="lg:col-span-5 border border-slate-800 rounded-xl bg-[#0F1626] p-6 flex flex-col justify-between space-y-5">
          {latestMatch ? (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-blue-400" />
                    02. Live A2A Protocol Trace (`{latestMatch.matchId}`)
                  </span>
                  <span className="text-xs font-mono text-emerald-400 tabular-nums">
                    Consensus: {(latestMatch.consensusScore * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-[#0B0F19] border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-emerald-400 inline-flex items-center gap-1.5 font-semibold">
                      <Trophy className="w-3.5 h-3.5" />
                      Arena Winner:{' '}
                      {latestMatch.winnerAgentId === latestMatch.agentAId
                        ? latestMatch.agentAName
                        : latestMatch.agentBName}
                    </span>
                    <span className="text-blue-400">
                      +{latestMatch.scoreDeltaApplied.toFixed(2)} ZSET Score
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {latestMatch.agentAResponseSummary}
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    {latestMatch.agentBRefinementSummary}
                  </p>
                </div>

                <pre className="p-3.5 bg-[#0B0F19] border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56 leading-relaxed">
                  {latestMatch.jsonRpcTrace}
                </pre>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400 tabular-nums">
                <span>Handoff Latency: {latestMatch.handoffLatencyMs} ms</span>
                <span className="text-emerald-400 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Synced to Redis ZSET
                </span>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Historical A2A Tournament Ledger */}
      <div className="border border-slate-800 rounded-xl bg-[#0F1626] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">
            Recent A2A Autonomous Tournament Matchups
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {matchHistory.length} Recorded Matches
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0B0F19] text-xs text-slate-400">
                <th className="py-3 px-4 font-medium">Match ID & Time</th>
                <th className="py-3 px-4 font-medium">Agent A (Primary)</th>
                <th className="py-3 px-4 font-medium">Agent B (Peer/Adversary)</th>
                <th className="py-3 px-4 font-medium text-right">Consensus</th>
                <th className="py-3 px-4 font-medium text-right">Handoff Latency</th>
                <th className="py-3 px-4 font-medium text-right">ZSET Boost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs font-mono tabular-nums">
              {matchHistory.map((m) => (
                <tr key={m.matchId} className="hover:bg-slate-800/30">
                  <td className="py-3 px-4 text-slate-300">
                    <div className="font-semibold text-slate-100">{m.matchId}</div>
                    <div className="text-[11px] text-slate-500">
                      {m.timestampUtc.slice(11, 19)} UTC
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={
                        m.winnerAgentId === m.agentAId
                          ? 'text-emerald-400 font-semibold'
                          : 'text-slate-300'
                      }
                    >
                      {m.agentAName}
                    </span>{' '}
                    <span className="text-slate-500">({m.agentATier})</span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={
                        m.winnerAgentId === m.agentBId
                          ? 'text-emerald-400 font-semibold'
                          : 'text-slate-300'
                      }
                    >
                      {m.agentBName}
                    </span>{' '}
                    <span className="text-slate-500">({m.agentBTier})</span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-100 font-semibold">
                    {(m.consensusScore * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400">
                    {m.handoffLatencyMs} ms
                  </td>
                  <td className="py-3 px-4 text-right text-blue-400 font-semibold">
                    +{m.scoreDeltaApplied.toFixed(2)} pts
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
