import React, { useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Coins,
  DollarSign,
  RotateCcw,
} from 'lucide-react';
import { GlobalAgentEntry, SettlementTransaction } from '../types/gaee';
import { computeSha256Hex } from '../utils/cryptoAndEval';

interface FinancialAuditViewProps {
  agents: GlobalAgentEntry[];
  onSelectAgent: (agent: GlobalAgentEntry) => void;
}

export const FinancialAuditView: React.FC<FinancialAuditViewProps> = ({
  agents,
  onSelectAgent,
}) => {
  const [dailyTasks, setDailyTasks] = useState<number>(100000);
  const [blendedCostPer1kTokens, setBlendedCostPer1kTokens] =
    useState<number>(0.003);
  const [benchmarkTaskValueUsd, setBenchmarkTaskValueUsd] =
    useState<number>(0.32);

  const [settlementLedger, setSettlementLedger] = useState<
    SettlementTransaction[]
  >(() => [
    {
      txId: 'stl_99412',
      timestampUtc: '2026-10-18T21:29:00Z',
      agentId: 'agent_98412',
      agentName: 'Apex-Nexus-Core',
      recipientWallet: '0x71C9...89A2 (nexus-swarm.eth)',
      verifiedRoi: 436.36,
      taskCostUsd: 82.5,
      payoutAmountUsdc: 123.75,
      status: 'SETTLED',
      txHash: '0x489fe71c99204ab8c112f9b211',
    },
    {
      txId: 'stl_99411',
      timestampUtc: '2026-10-18T21:28:50Z',
      agentId: 'agent_10409',
      agentName: 'Kronos-Axiom-Zero',
      recipientWallet: '0x38F1...44C0 (axiom-dao.eth)',
      verifiedRoi: 466.67,
      taskCostUsd: 90.0,
      payoutAmountUsdc: 135.0,
      status: 'SETTLED',
      txHash: '0x902ae44b18037cd2a091e4f802',
    },
  ]);

  const handleResetDefaults = () => {
    setDailyTasks(100000);
    setBlendedCostPer1kTokens(0.003);
    setBenchmarkTaskValueUsd(0.32);
  };

  const simulatedRows = agents.map((agent) => {
    const tokens = agent.financialEvaluation.tokenEfficiencyScore;
    const computeTicks = 0.00012;
    const dynamicBurnPerTask =
      (tokens / 1000.0) * blendedCostPer1kTokens + computeTicks;

    const effectiveTaskValue =
      benchmarkTaskValueUsd * agent.metrics.trajectorySuccess;
    const dynamicNetYieldPerTask = Math.max(
      0,
      effectiveTaskValue - dynamicBurnPerTask
    );
    const dynamicRoi =
      dynamicBurnPerTask > 0 ? effectiveTaskValue / dynamicBurnPerTask : 0;

    const dailyBurnUsd = dynamicBurnPerTask * dailyTasks;
    const dailyNetYieldUsd = dynamicNetYieldPerTask * dailyTasks;
    const dailyWasteUsd =
      dailyBurnUsd * agent.financialEvaluation.resourceWasteIndex;

    return {
      agent,
      dynamicBurnPerTask,
      dynamicNetYieldPerTask,
      dynamicRoi,
      dailyBurnUsd,
      dailyNetYieldUsd,
      dailyWasteUsd,
    };
  });

  const handleSettleAgent = (
    agent: GlobalAgentEntry,
    verifiedRoi: number,
    dailyBurnUsd: number
  ) => {
    const nowIso = new Date().toISOString();
    const isEligible = verifiedRoi >= 150.0;
    const payoutAmountUsdc = isEligible
      ? Number((dailyBurnUsd * 1.5).toFixed(4))
      : 0;
    const hashSeed = computeSha256Hex(
      `${agent.agentId}:${verifiedRoi}:${nowIso}`
    );

    const tx: SettlementTransaction = {
      txId: `stl_${Math.floor(10000 + Math.random() * 89999)}`,
      timestampUtc: nowIso,
      agentId: agent.agentId,
      agentName: agent.name,
      recipientWallet: `0x${hashSeed.slice(0, 4).toUpperCase()}...${hashSeed.slice(28, 32).toUpperCase()} (${agent.publisher})`,
      verifiedRoi: Number(verifiedRoi.toFixed(2)),
      taskCostUsd: Number(dailyBurnUsd.toFixed(4)),
      payoutAmountUsdc,
      status: isEligible ? 'SETTLED' : 'REJECTED_LOW_ROI',
      txHash: isEligible ? `0x${hashSeed.slice(0, 26)}` : '—',
      reason: isEligible
        ? undefined
        : 'ROI below enterprise settlement threshold (150x)',
    };

    setSettlementLedger((prev) => [tx, ...prev].slice(0, 12));
  };

  const handleBatchSettleEligible = () => {
    const nowIso = new Date().toISOString();
    const newTxs: SettlementTransaction[] = simulatedRows.slice(0, 5).map(
      ({ agent, dynamicRoi, dailyBurnUsd }, idx) => {
        const isEligible = dynamicRoi >= 150.0;
        const payoutAmountUsdc = isEligible
          ? Number((dailyBurnUsd * 1.5).toFixed(4))
          : 0;
        const hashSeed = computeSha256Hex(
          `${agent.agentId}:${dynamicRoi}:${nowIso}:${idx}`
        );
        return {
          txId: `stl_${Math.floor(10000 + Math.random() * 89999)}_${idx}`,
          timestampUtc: nowIso,
          agentId: agent.agentId,
          agentName: agent.name,
          recipientWallet: `0x${hashSeed.slice(0, 4).toUpperCase()}...${hashSeed.slice(28, 32).toUpperCase()} (${agent.publisher})`,
          verifiedRoi: Number(dynamicRoi.toFixed(2)),
          taskCostUsd: Number(dailyBurnUsd.toFixed(4)),
          payoutAmountUsdc,
          status: isEligible ? 'SETTLED' : 'REJECTED_LOW_ROI',
          txHash: isEligible ? `0x${hashSeed.slice(0, 26)}` : '—',
          reason: isEligible
            ? undefined
            : 'ROI below enterprise settlement threshold (150x)',
        };
      }
    );
    setSettlementLedger((prev) => [...newTxs, ...prev].slice(0, 12));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="text-xs text-slate-400 font-mono">
            Economic Entity Auditing · Token Burn Telemetry · Autonomous Smart-Contract Settlement (`settlement_gateway.py`)
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mt-1 font-display">
            Granular $ Evaluation Framework & Autonomous Settlement Gateway
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleBatchSettleEligible}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5" />
            Batch Settle Top 5 Agents (≥150x ROI Gate)
          </button>
          <button
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Parameters
          </button>
        </div>
      </div>

      {/* 4 Core Financial Formulas Specification Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-800 border border-slate-800 rounded-xl overflow-hidden">
        <div className="bg-[#0F1626] p-5 space-y-2">
          <div className="text-xs font-semibold text-slate-200">
            01. Operational Burn (C_op)
          </div>
          <div className="text-xs font-mono text-blue-400 bg-[#0B0F19] px-2.5 py-1.5 rounded border border-slate-800/80">
            Tokens × Cost/Token + Compute Ticks
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Total raw capital, LLM inference, and sandbox infrastructure overhead consumed per execution cycle.
          </p>
        </div>

        <div className="bg-[#0F1626] p-5 space-y-2">
          <div className="text-xs font-semibold text-slate-200">
            02. Economic Yield (Y_econ)
          </div>
          <div className="text-xs font-mono text-emerald-400 bg-[#0B0F19] px-2.5 py-1.5 rounded border border-slate-800/80">
            Σ(Task Success Value) - C_op
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Net economic utility produced by the agent after subtracting operational inference and tool burn.
          </p>
        </div>

        <div className="bg-[#0F1626] p-5 space-y-2">
          <div className="text-xs font-semibold text-slate-200">
            03. Capital Efficiency Ratio
          </div>
          <div className="text-xs font-mono text-slate-200 bg-[#0B0F19] px-2.5 py-1.5 rounded border border-slate-800/80">
            ROI Factor = Y_econ / C_op
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Direct return-on-investment multiplier normalized to [0, 1] (20% weight in Global ZSET Composite Score).
          </p>
        </div>

        <div className="bg-[#0F1626] p-5 space-y-2">
          <div className="text-xs font-semibold text-slate-200">
            04. Resource Waste Index
          </div>
          <div className="text-xs font-mono text-amber-400 bg-[#0B0F19] px-2.5 py-1.5 rounded border border-slate-800/80">
            (Failed Calls + Loops) / Total Ops
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Measures architectural inefficiency, hallucinated tool parameters, and redundant retry loops.
          </p>
        </div>
      </div>

      {/* Interactive Enterprise Fleet Simulator Controls */}
      <div className="border border-slate-800 rounded-xl bg-[#0F1626] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-100">
            Interactive Enterprise Workload Cost & Yield Parameters
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400">Daily Autonomous Tasks</span>
              <span className="font-mono font-semibold text-slate-100 tabular-nums">
                {dailyTasks.toLocaleString()} tasks/day
              </span>
            </div>
            <input
              type="range"
              min={10000}
              max={1000000}
              step={10000}
              value={dailyTasks}
              onChange={(e) => setDailyTasks(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1">
              <span>10k/day</span>
              <span>500k/day</span>
              <span>1M/day</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400">
                Blended Inference Cost ($ / 1K Tokens)
              </span>
              <span className="font-mono font-semibold text-slate-100 tabular-nums">
                ${blendedCostPer1kTokens.toFixed(4)}
              </span>
            </div>
            <input
              type="range"
              min={0.0005}
              max={0.015}
              step={0.0005}
              value={blendedCostPer1kTokens}
              onChange={(e) =>
                setBlendedCostPer1kTokens(Number(e.target.value))
              }
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1">
              <span>$0.0005</span>
              <span>$0.0030 (Std)</span>
              <span>$0.0150</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400">
                Benchmark Task Economic Value ($)
              </span>
              <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                ${benchmarkTaskValueUsd.toFixed(2)} / goal
              </span>
            </div>
            <input
              type="range"
              min={0.05}
              max={1.0}
              step={0.05}
              value={benchmarkTaskValueUsd}
              onChange={(e) => setBenchmarkTaskValueUsd(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1">
              <span>$0.05</span>
              <span>$0.30 (Baseline)</span>
              <span>$1.00</span>
            </div>
          </div>
        </div>
      </div>

      {/* High-Density Financial Audit Table */}
      <div className="border border-slate-800 rounded-xl bg-[#0F1626] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Live Fleet Financial Ledger & USDC Escrow Settlement
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Settlement Threshold: Verified ROI ≥ 150.0x
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0B0F19] text-xs text-slate-400">
                <th className="py-3 px-4 font-medium">Rank & Agent</th>
                <th className="py-3 px-3 font-medium">Class</th>
                <th className="py-3 px-3 font-medium text-right">Tokens / Task</th>
                <th className="py-3 px-3 font-medium text-right">Cost / Task (C_op)</th>
                <th className="py-3 px-3 font-medium text-right">Capital ROI</th>
                <th className="py-3 px-3 font-medium text-right">
                  Daily Burn ({dailyTasks.toLocaleString()})
                </th>
                <th className="py-3 px-3 font-medium text-right">
                  Daily Net Yield (Y_econ)
                </th>
                <th className="py-3 px-4 font-medium text-right">
                  Smart-Contract Settlement
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {simulatedRows.map(
                ({
                  agent,
                  dynamicBurnPerTask,
                  dynamicRoi,
                  dailyBurnUsd,
                  dailyNetYieldUsd,
                }) => (
                  <tr
                    key={agent.agentId}
                    onClick={() => onSelectAgent(agent)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-slate-400 tabular-nums w-6">
                          #{agent.globalRank}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-100">
                            {agent.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {agent.publisher} · Grade{' '}
                            {agent.financialEvaluation.budgetEfficiencyTier}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {agent.tier}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                      {agent.financialEvaluation.tokenEfficiencyScore} tok
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-400 font-medium">
                      ${dynamicBurnPerTask.toFixed(5)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      <span
                        className={
                          dynamicRoi >= 150
                            ? 'text-emerald-400 font-semibold'
                            : 'text-amber-400 font-semibold'
                        }
                      >
                        {dynamicRoi.toFixed(1)}x
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-200">
                      $
                      {dailyBurnUsd.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-400 font-semibold">
                      +$
                      {dailyNetYieldUsd.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td
                      className="py-3 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() =>
                          handleSettleAgent(agent, dynamicRoi, dailyBurnUsd)
                        }
                        className="px-3 py-1 text-[11px] font-medium bg-[#0B0F19] hover:bg-blue-600 text-slate-200 hover:text-white border border-slate-700 rounded transition-colors cursor-pointer"
                      >
                        Settle USDC
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Autonomous Settlement Gateway Transaction Log */}
      <div className="border border-slate-800 rounded-xl bg-[#0F1626] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Autonomous Micropayment & Smart-Contract Settlement Ledger (`AutonomousSettlementGateway`)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Treasury Contract: `0x9F82...E410` · Releases `1.5 × Task_Cost` USDC reward when Verified ROI ≥ 150.0x.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            {settlementLedger.length} Transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0B0F19] text-xs text-slate-400">
                <th className="py-3 px-4 font-medium">Tx ID & Time</th>
                <th className="py-3 px-4 font-medium">Agent & Recipient Wallet</th>
                <th className="py-3 px-3 font-medium text-right">Verified ROI</th>
                <th className="py-3 px-3 font-medium text-right">Payout (USDC)</th>
                <th className="py-3 px-4 font-medium">Settlement Status & Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs font-mono tabular-nums">
              {settlementLedger.map((tx) => (
                <tr key={tx.txId} className="hover:bg-slate-800/30">
                  <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                    <div className="font-semibold text-slate-100">{tx.txId}</div>
                    <div className="text-[11px] text-slate-500">
                      {tx.timestampUtc.slice(11, 19)} UTC
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-100 font-sans">
                      {tx.agentName}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {tx.recipientWallet}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-200">
                    {tx.verifiedRoi.toFixed(1)}x
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-emerald-400">
                    {tx.status === 'SETTLED'
                      ? `${tx.payoutAmountUsdc.toLocaleString()} USDC`
                      : '0.00 USDC'}
                  </td>
                  <td className="py-3 px-4">
                    {tx.status === 'SETTLED' ? (
                      <div className="inline-flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Settled · {tx.txHash}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 text-rose-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Rejected: {tx.reason}</span>
                      </div>
                    )}
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
