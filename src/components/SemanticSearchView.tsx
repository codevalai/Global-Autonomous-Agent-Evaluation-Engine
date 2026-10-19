import React, { useState } from 'react';
import { Database, Search, SlidersHorizontal } from 'lucide-react';
import { AgentTier, GlobalAgentEntry } from '../types/gaee';
import { calculateSemanticSimilarity } from '../utils/cryptoAndEval';

interface SemanticSearchViewProps {
  agents: GlobalAgentEntry[];
  onSelectAgent: (agent: GlobalAgentEntry) => void;
}

const SAMPLE_INTENT_QUERIES = [
  'Apex agent specializing in automated Rust microservice refactoring and zero-downtime failover',
  'Superintelligent ASI formal theorem synthesis and cryptographic zero-day verification',
  'Cheap narrow AI agent for deterministic SQL query optimization and OpenAPI execution',
  'Decentralized Swarm with Byzantine fault tolerance for global supply chain routing',
  'Recursive self-improving RSI kernel rewriting CUDA and Triton graphs',
];

export const SemanticSearchView: React.FC<SemanticSearchViewProps> = ({
  agents,
  onSelectAgent,
}) => {
  const [queryText, setQueryText] = useState<string>(SAMPLE_INTENT_QUERIES[0]);
  const [maxCostUsd, setMaxCostUsd] = useState<number>(0.0015);
  const [selectedTier, setSelectedTier] = useState<string>('ALL');

  const filteredAndScored = agents
    .filter((agent) => {
      const withinCost = agent.financialEvaluation.costPerTaskUsd <= maxCostUsd;
      const matchesTier =
        selectedTier === 'ALL' || agent.tier === selectedTier;
      return withinCost && matchesTier;
    })
    .map((agent) => ({
      agent,
      cosineSimilarity: calculateSemanticSimilarity(agent, queryText),
    }))
    .sort((a, b) => b.cosineSimilarity - a.cosineSimilarity);

  const qdrantFilterJson = JSON.stringify(
    {
      collection_name: 'global_agent_semantics',
      vector_dim: 1536,
      distance: 'Cosine',
      filter: {
        must: [
          {
            key: 'cost_per_task_usd',
            range: { lte: maxCostUsd },
          },
          ...(selectedTier !== 'ALL'
            ? [{ key: 'tier', match: { value: selectedTier } }]
            : []),
        ],
      },
    },
    null,
    2
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="text-xs text-slate-400 font-mono">
          Qdrant Vector Collection (`global_agent_semantics`) · 1536-Dimensional Cosine Distance · Strict Cost Range Filtering
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mt-1 font-display">
          Semantic Capability Discovery & Vector Intent Search
        </h2>
      </div>

      {/* Search & Filter Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-8 border border-slate-800 rounded-xl bg-[#0F1626] p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Natural Language Capability Intent Query (Embedded to 1536-d Vector)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder="Describe required autonomous capabilities, domain, and architectural constraints..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#0B0F19] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Sample Query Presets */}
            <div>
              <div className="text-xs text-slate-400 mb-2">
                Preset Semantic Queries:
              </div>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_INTENT_QUERIES.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQueryText(preset)}
                    className={`px-3 py-1.5 text-xs rounded-md border transition-colors text-left cursor-pointer ${
                      queryText === preset
                        ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                        : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {preset.length > 58 ? `${preset.slice(0, 58)}...` : preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Numeric & Tier Filter Bar */}
          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                  Max Cost-Per-Task (`lte` Filter)
                </span>
                <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                  ≤ ${maxCostUsd.toFixed(5)} USD
                </span>
              </div>
              <input
                type="range"
                min={0.0005}
                max={0.0025}
                step={0.00005}
                value={maxCostUsd}
                onChange={(e) => setMaxCostUsd(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1">
                <span>$0.00050</span>
                <span>$0.00150</span>
                <span>$0.00250</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2">
                Restrict Autonomous Tier Class (`match` Filter)
              </label>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#0B0F19] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Autonomous Tiers (Unrestricted)</option>
                {Object.values(AgentTier).map((tier) => (
                  <option key={tier} value={tier}>
                    {tier} Class Only
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Live Qdrant Filter Payload */}
        <div className="lg:col-span-4 border border-slate-800 rounded-xl bg-[#0F1626] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                Qdrant Vector Query Payload
              </span>
              <span className="text-xs font-mono text-slate-400">
                Port 6333
              </span>
            </div>
            <pre className="p-3.5 bg-[#0B0F19] border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {qdrantFilterJson}
            </pre>
          </div>
          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 font-mono flex items-center justify-between">
            <span>Matched Vector Points:</span>
            <span className="text-slate-100 font-semibold tabular-nums">
              {filteredAndScored.length} / {agents.length} active nodes
            </span>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="border border-slate-800 rounded-xl bg-[#0F1626] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">
            Semantic Vector Search Results (Ranked by Cosine Similarity)
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Showing {filteredAndScored.length} matching agents
          </span>
        </div>

        {filteredAndScored.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="text-sm font-semibold text-slate-200">
              No Agents Match Your Strict Cost / Tier Boundary
            </div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Try raising the maximum cost-per-task threshold above ${maxCostUsd.toFixed(5)} or switching the tier filter to All Autonomous Tiers.
            </p>
            <button
              onClick={() => {
                setMaxCostUsd(0.0025);
                setSelectedTier('ALL');
              }}
              className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer"
            >
              Relax Cost & Tier Filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {filteredAndScored.map(({ agent, cosineSimilarity }) => (
              <div
                key={agent.agentId}
                onClick={() => onSelectAgent(agent)}
                className="p-5 hover:bg-slate-800/30 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer"
              >
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 tabular-nums">
                    <span className="text-blue-400 font-semibold">
                      Cosine: {cosineSimilarity.toFixed(3)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Global Rank #{agent.globalRank}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-200">{agent.tier} Class</span>
                    <span aria-hidden="true">·</span>
                    <span>{agent.publisher}</span>
                  </div>
                  <div className="text-base font-bold text-slate-100 font-display">
                    {agent.name}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {agent.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-slate-400 pt-1">
                    {agent.capabilities.map((cap, idx) => (
                      <React.Fragment key={cap}>
                        <span>{cap}</span>
                        {idx < agent.capabilities.length - 1 && (
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="flex sm:items-center gap-6 shrink-0 font-mono tabular-nums border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                  <div>
                    <div className="text-[11px] text-slate-400 font-sans">
                      Cost / Task
                    </div>
                    <div className="text-sm font-bold text-emerald-400">
                      ${agent.financialEvaluation.costPerTaskUsd.toFixed(5)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-sans">
                      ROI Factor
                    </div>
                    <div className="text-sm font-bold text-slate-100">
                      {agent.financialEvaluation.estimatedRoiFactor.toFixed(1)}x
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-sans">
                      Composite
                    </div>
                    <div className="text-sm font-bold text-slate-100">
                      {agent.metrics.compositeScore.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
