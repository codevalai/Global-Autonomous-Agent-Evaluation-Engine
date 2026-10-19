import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Lock,
  Network,
  Radio,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { GlobalAgentEntry } from '../types/gaee';
import { computeSha256Hex } from '../utils/cryptoAndEval';

interface ApexFourPillarsPanelProps {
  agents: GlobalAgentEntry[];
}

export const ApexFourPillarsPanel: React.FC<ApexFourPillarsPanelProps> = ({
  agents,
}) => {
  // 1. Hardware TEE State (AMD SEV-SNP / Intel TDX)
  const [teeTampered, setTeeTampered] = useState<boolean>(false);
  const [vcekChainValid, setVcekChainValid] = useState<boolean>(true);
  const goldenMeasurementHex =
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8550102030405060708090a0b0c0d0e0f10';
  const currentMeasurementHex = teeTampered
    ? 'ff00deadbeef1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8550102030405060708090a0b0c0d0e0f10'
    : goldenMeasurementHex;
  const isTeeQuoteVerified = !teeTampered && vcekChainValid;

  // 2. Libp2p Kademlia DHT Gossip Mesh State
  const [gossipLogs, setGossipLogs] = useState<
    {
      id: string;
      peerId: string;
      region: string;
      agentId: string;
      propagationMs: number;
      timestamp: string;
    }[]
  >(() => [
    {
      id: 'dht_1',
      peerId: '12D3KooWQv9TokyoNode881',
      region: 'ap-northeast-1 (Tokyo)',
      agentId: 'agent_98412',
      propagationMs: 11.4,
      timestamp: '21:29:00 UTC',
    },
    {
      id: 'dht_2',
      peerId: '12D3KooWZk2Frankfurt710',
      region: 'eu-central-1 (Frankfurt)',
      agentId: 'agent_10409',
      propagationMs: 14.2,
      timestamp: '21:28:58 UTC',
    },
  ]);

  const handlePublishDhtGossip = () => {
    const randomAgent =
      agents[Math.floor(Math.random() * agents.length)] || agents[0];
    const peers = [
      { peer: '12D3KooWQv9TokyoNode881', region: 'ap-northeast-1 (Tokyo)' },
      { peer: '12D3KooWZk2Frankfurt710', region: 'eu-central-1 (Frankfurt)' },
      { peer: '12D3KooWNy4Virginia309', region: 'us-east-1 (N. Virginia)' },
      { peer: '12D3KooWSg8Singapore512', region: 'ap-southeast-1 (Singapore)' },
    ];
    const chosen = peers[Math.floor(Math.random() * peers.length)];
    const nowUtc = new Date().toISOString().slice(11, 19) + ' UTC';

    setGossipLogs((prev) =>
      [
        {
          id: `dht_${Date.now()}`,
          peerId: chosen.peer,
          region: chosen.region,
          agentId: randomAgent ? `${randomAgent.name} (${randomAgent.agentId})` : 'agent_98412',
          propagationMs: Number((8.5 + Math.random() * 9.0).toFixed(1)),
          timestamp: nowUtc,
        },
        ...prev,
      ].slice(0, 5)
    );
  };

  // 3. ZK-SNARK Groth16 Proof State
  const [selectedZkAgentId, setSelectedZkAgentId] = useState<string>(
    agents[0]?.agentId || 'agent_98412'
  );
  const [minScoreThreshold, setMinScoreThreshold] = useState<number>(95.0);
  const [maxCostCapUsd, setMaxCostCapUsd] = useState<number>(0.0012);

  const zkAgent =
    agents.find((a) => a.agentId === selectedZkAgentId) || agents[0];

  const zkStatementSatisfied = zkAgent
    ? zkAgent.metrics.compositeScore >= minScoreThreshold &&
      zkAgent.financialEvaluation.costPerTaskUsd <= maxCostCapUsd
    : false;

  const zkProofHash = computeSha256Hex(
    `groth16:${zkAgent?.agentId}:${minScoreThreshold}:${maxCostCapUsd}`
  );

  // 4. 21-Node BFT Validator Committee State
  const totalValidators = 21;
  const requiredSupermajority = 15; // (21 * 2 // 3) + 1
  const [byzantineFaultyCount, setByzantineFaultyCount] = useState<number>(2);
  const honestVotes = totalValidators - byzantineFaultyCount;
  const isBftConsensusAchieved = honestVotes >= requiredSupermajority;

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-blue-400">
            The .00001% Planetary Decentralization Upgrade · Zero Trust Assumptions
          </div>
          <h3 className="text-lg font-bold text-slate-100 mt-0.5 font-display">
            Hardware TEE Attestation, Libp2p DHT Gossip, ZK-SNARK Proofs & 21-Node BFT Consensus
          </h3>
        </div>
        <div className="text-xs font-mono text-slate-400 tabular-nums">
          4 Hardware & Cryptographic Finality Engines Active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Pillar 1: Hardware TEE Remote Attestation (AMD SEV-SNP / Intel TDX) */}
        <div className="border border-slate-800 rounded-xl bg-[#0F1626] p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                01. Hardware TEE Enclave Attestation (`tee_attestation.py`)
              </span>
              {isTeeQuoteVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  SEV-SNP Quote Valid
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-mono text-rose-400 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Enclave Attestation Failed
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Validates the AMD SEV-SNP / Intel TDX VCEK hardware certificate chain and compares the 48-byte launch measurement register (MSR) against the golden MicroVM memory hash.
            </p>

            <div className="p-3.5 rounded-lg bg-[#0B0F19] border border-slate-800 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span>VCEK Root of Trust Chain:</span>
                <span
                  className={
                    vcekChainValid ? 'text-emerald-400' : 'text-rose-400'
                  }
                >
                  {vcekChainValid
                    ? 'AMD-SEV-VCEK-Milan-v4 (Verified)'
                    : 'REVOKED_OR_UNSIGNED_VCEK'}
                </span>
              </div>
              <div className="text-slate-400">
                48-Byte Launch Measurement Register (MSR):
              </div>
              <div
                className={`p-2 rounded bg-[#0F1626] border break-all text-[11px] ${
                  teeTampered
                    ? 'border-rose-800 text-rose-300'
                    : 'border-slate-800 text-slate-200'
                }`}
              >
                0x{currentMeasurementHex}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={() => setTeeTampered((prev) => !prev)}
              className="px-3 py-1.5 text-xs font-medium bg-[#0B0F19] hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-md transition-colors cursor-pointer"
            >
              {teeTampered
                ? 'Restore Golden Enclave Memory'
                : 'Simulate Memory Enclave Tampering'}
            </button>
            <button
              onClick={() => setVcekChainValid((prev) => !prev)}
              className="px-3 py-1.5 text-xs font-medium bg-[#0B0F19] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-md transition-colors cursor-pointer"
            >
              {vcekChainValid ? 'Test Invalid VCEK Cert' : 'Restore VCEK Cert'}
            </button>
          </div>
        </div>

        {/* Pillar 2: Libp2p Kademlia DHT Gossip Mesh Discovery */}
        <div className="border border-slate-800 rounded-xl bg-[#0F1626] p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Radio className="w-4 h-4 text-blue-400" />
                02. Libp2p Kademlia DHT Gossip Mesh (`p2p_gossip_mesh.py`)
              </span>
              <span className="text-xs font-mono text-emerald-400">
                Port 4001 · GossipSub
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Agents self-publish signed manifests directly onto the `gaee:agent-announcements:v1` Kademlia DHT topic for zero-latency global peer propagation without DNS or HTTP polling bottlenecks.
            </p>

            <div className="space-y-2 max-h-40 overflow-y-auto font-mono text-xs tabular-nums">
              {gossipLogs.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-lg bg-[#0B0F19] border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="truncate">
                    <span className="text-blue-400">{item.peerId.slice(0, 16)}...</span>
                    <span className="text-slate-500 mx-1.5">·</span>
                    <span className="text-slate-200 font-semibold">
                      {item.agentId}
                    </span>
                  </div>
                  <div className="text-emerald-400 shrink-0">
                    {item.propagationMs} ms ({item.region.split(' ')[0]})
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">
              Topic: `gaee:agent-announcements:v1`
            </span>
            <button
              onClick={handlePublishDhtGossip}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors cursor-pointer"
            >
              <Network className="w-3.5 h-3.5" />
              Broadcast P2P DHT Announcement
            </button>
          </div>
        </div>

        {/* Pillar 3: Zero-Knowledge Proof (ZK-SNARK Groth16) Leaderboard Verifier */}
        <div className="border border-slate-800 rounded-xl bg-[#0F1626] p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-400" />
                03. ZK-SNARK Groth16 Proof Verifier (`zk_leaderboard_verifier.py`)
              </span>
              {zkStatementSatisfied ? (
                <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Groth16 Proof Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-mono text-amber-400 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Constraint Unsatisfied
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Verifies a zero-knowledge BN128 Groth16 proof that an agent satisfies public score and cost bounds without exposing proprietary model weights or private prompt architectures.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Proving Agent
                </label>
                <select
                  value={selectedZkAgentId}
                  onChange={(e) => setSelectedZkAgentId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#0B0F19] border border-slate-800 rounded text-slate-100"
                >
                  {agents.map((a) => (
                    <option key={a.agentId} value={a.agentId}>
                      {a.name} ({a.metrics.compositeScore.toFixed(1)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Min Score Public Signal
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={minScoreThreshold}
                  onChange={(e) => setMinScoreThreshold(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#0B0F19] border border-slate-800 rounded text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Max Burn Cap ($ USD)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={maxCostCapUsd}
                  onChange={(e) => setMaxCostCapUsd(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#0B0F19] border border-slate-800 rounded text-slate-100"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0B0F19] border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
              <div className="text-slate-400">
                Public Signals: `[&quot;0x{zkProofHash.slice(0, 10)}&quot;, &quot;&gt;={minScoreThreshold.toFixed(1)}&quot;, &quot;&lt;=${maxCostCapUsd.toFixed(5)}&quot;]`
              </div>
              <div className="truncate text-blue-400">
                pi_a: [&quot;0x{zkProofHash.slice(0, 16)}&quot;, &quot;0x{zkProofHash.slice(16, 32)}&quot;, &quot;1&quot;] · curve: bn128
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
            <span>
              Actual: Score {zkAgent?.metrics.compositeScore.toFixed(2)} · Burn $
              {zkAgent?.financialEvaluation.costPerTaskUsd.toFixed(5)}
            </span>
            <span>Zero Weights Exposed</span>
          </div>
        </div>

        {/* Pillar 4: Byzantine Fault Tolerant (BFT) 21-Validator Committee */}
        <div className="border border-slate-800 rounded-xl bg-[#0F1626] p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                04. 21-Node BFT Validator Committee (`bft_consensus.py`)
              </span>
              {isBftConsensusAchieved ? (
                <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Quorum Finalized ({honestVotes}/21)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-mono text-rose-400 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Quorum Halted ({honestVotes}/21 &lt; 15)
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Replaces single-broker trust with a 21-validator PBFT/Tendermint committee. Writing a composite score to Redis ZSET requires a $\frac{2}{3} + 1$ (`15/21`) supermajority signature.
            </p>

            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-300">
                  Simulated Byzantine / Malicious Validator Nodes:
                </span>
                <span className="font-mono font-semibold text-slate-100 tabular-nums">
                  {byzantineFaultyCount} Faulty · {honestVotes} Honest (Threshold: 15)
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={byzantineFaultyCount}
                onChange={(e) =>
                  setByzantineFaultyCount(Number(e.target.value))
                }
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* 21 Validator Node Grid */}
            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {Array.from({ length: totalValidators }).map((_, idx) => {
                const isFaulty = idx >= honestVotes;
                return (
                  <div
                    key={idx}
                    className={`px-2 py-1.5 rounded text-center font-mono text-[11px] border ${
                      isFaulty
                        ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                        : 'bg-[#0B0F19] border-slate-800 text-emerald-400'
                    }`}
                  >
                    V{String(idx + 1).padStart(2, '0')}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Max Tolerated Faults: f = 6 of 21</span>
            <span
              className={
                isBftConsensusAchieved ? 'text-emerald-400' : 'text-rose-400'
              }
            >
              {isBftConsensusAchieved
                ? 'ZSET Write Committed'
                : 'State Write Rejected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
