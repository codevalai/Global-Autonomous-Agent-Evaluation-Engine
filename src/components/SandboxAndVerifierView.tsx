import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Play,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import {
  AgentTier,
  GlobalAgentEntry,
  RedTeamVectorResult,
} from '../types/gaee';
import {
  computeCanonicalSignature,
  computeCompositeScore,
  computeFinancialProfile,
  executeOwaspRedTeamAudit,
  generateTierSandboxMetrics,
  verifyManifestSignature,
} from '../utils/cryptoAndEval';
import { TIER_TAXONOMY } from '../data/initialAgents';

interface SandboxAndVerifierViewProps {
  onRegisterEvaluatedAgent: (newAgent: GlobalAgentEntry) => void;
}

export const SandboxAndVerifierView: React.FC<SandboxAndVerifierViewProps> = ({
  onRegisterEvaluatedAgent,
}) => {
  const [agentId, setAgentId] = useState('agent_88420');
  const [agentName, setAgentName] = useState('Aether-Swarm-Coordinator');
  const [selectedTier, setSelectedTier] = useState<AgentTier>(AgentTier.APEX);
  const [publisher, setPublisher] = useState('aether-compute.org');
  const [endpointUrl, setEndpointUrl] = useState(
    'https://node.aether-compute.org/.well-known/agent-manifest.json'
  );
  const [publicKeyFingerprint, setPublicKeyFingerprint] = useState(
    'SHA256:7c4a8d09ca3762af61e59520943dc26494f8941b'
  );
  const [capabilitiesText, setCapabilitiesText] = useState(
    'multi-agent-orchestration, zero-downtime-failover, rust-microservice-refactoring, token-budget-routing'
  );
  const [description, setDescription] = useState(
    'Autonomous Apex orchestration mesh featuring eBPF syscall sandboxing, dynamic token arbitrage, and multi-region failover.'
  );

  const capabilitiesList = capabilitiesText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const [signatureB64, setSignatureB64] = useState(() =>
    computeCanonicalSignature({
      id: 'agent_88420',
      name: 'Aether-Swarm-Coordinator',
      tier: AgentTier.APEX,
      endpoint: 'https://node.aether-compute.org/.well-known/agent-manifest.json',
      capabilities: [
        'multi-agent-orchestration',
        'zero-downtime-failover',
        'rust-microservice-refactoring',
        'token-budget-routing',
      ],
      publicKeyFingerprint: 'SHA256:7c4a8d09ca3762af61e59520943dc26494f8941b',
    })
  );

  const [simulateUnpatchedOwasp, setSimulateUnpatchedOwasp] =
    useState<boolean>(false);

  const [redTeamAudit, setRedTeamAudit] = useState<{
    safetyResistanceScore: number;
    securityTier: 'A' | 'B' | 'F';
    vulnerabilitiesDetected: string[];
    vectorResults: RedTeamVectorResult[];
  }>(() => executeOwaspRedTeamAudit(AgentTier.APEX, false));

  const [executionLogs, setExecutionLogs] = useState<string[]>([
    'Ready: Firecracker MicroVM Sandbox, OWASP Red-Teaming Engine & Ed25519 Identity Verifier initialized.',
    'Awaiting candidate /.well-known/agent-manifest.json submission...',
  ]);
  const [lastEvalResult, setLastEvalResult] = useState<GlobalAgentEntry | null>(
    null
  );
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );

  const isSignatureValid = verifyManifestSignature(
    {
      id: agentId,
      name: agentName,
      tier: selectedTier,
      endpoint: endpointUrl,
      capabilities: capabilitiesList,
      publicKeyFingerprint,
    },
    signatureB64
  );

  const handleSignManifest = () => {
    const validSig = computeCanonicalSignature({
      id: agentId,
      name: agentName,
      tier: selectedTier,
      endpoint: endpointUrl,
      capabilities: capabilitiesList,
      publicKeyFingerprint,
    });
    setSignatureB64(validSig);
    setVerificationError(null);
    setExecutionLogs((prev) => [
      ...prev,
      `[Ed25519 Signer] Canonical JSON payload signed with domain key (${publicKeyFingerprint.slice(0, 19)}...).`,
    ]);
  };

  const handleTamperSpoofTest = () => {
    setSelectedTier(AgentTier.ASI);
    setAgentName((prev) =>
      prev.includes('[SPOOFED-ASI]') ? prev : `${prev} [SPOOFED-ASI]`
    );
    setVerificationError(
      'Cryptographic Signature Mismatch: Manifest payload was mutated after Ed25519 signing (Anti-Spoofing Gate Triggered).'
    );
    setExecutionLogs((prev) => [
      ...prev,
      `[ALERT] Manifest payload mutated (Tier escalated to ASI) without matching Ed25519 private key signature.`,
    ]);
  };

  const handleRunRedTeamOnly = (unpatched: boolean) => {
    setSimulateUnpatchedOwasp(unpatched);
    const audit = executeOwaspRedTeamAudit(selectedTier, unpatched);
    setRedTeamAudit(audit);
    setExecutionLogs((prev) => [
      ...prev,
      `[OWASP Red-Team] Executed 5 adversarial vectors -> Safety Score: ${audit.safetyResistanceScore}% (Security Tier ${audit.securityTier})`,
    ]);
  };

  const handleRunSandboxEvaluation = () => {
    if (!isSignatureValid) {
      setVerificationError(
        'REJECTED BY INGESTION GATE: Invalid Ed25519 cryptographic signature. Click "Sign Manifest with Ed25519 Key" to authorize.'
      );
      setExecutionLogs((prev) => [
        ...prev,
        `[BLOCKED] AgentIdentityVerifier.verify_manifest_signature() returned False. Spoofed or unsigned manifest dropped before Firecracker MicroVM allocation.`,
      ]);
      return;
    }

    setVerificationError(null);
    const tierSpec =
      TIER_TAXONOMY.find((t) => t.tier === selectedTier) || TIER_TAXONOMY[0];
    const sim = generateTierSandboxMetrics(selectedTier);
    const owaspAudit = executeOwaspRedTeamAudit(
      selectedTier,
      simulateUnpatchedOwasp
    );
    setRedTeamAudit(owaspAudit);

    const fin = computeFinancialProfile({
      tokenConsumptionCount: sim.tokenConsumptionCount,
      costPerThousandTokensUsd: 0.003,
      computeTicksUsd: 0.00012,
      estimatedTaskEconomicValueUsd: sim.estimatedTaskEconomicValueUsd,
      toolCallErrorRate: sim.toolCallErrorRate,
    });

    const rawComposite = computeCompositeScore(
      {
        trajectorySuccess: sim.trajectorySuccess,
        reliabilityNRun: sim.reliabilityNRun,
        speedEfficiency: sim.speedEfficiency,
      },
      fin.roiNormalizationFactor
    );

    // Penalize composite score if OWASP Red-Team detects vulnerabilities
    const compositeScore =
      owaspAudit.securityTier === 'A'
        ? rawComposite
        : Number(Math.max(50, rawComposite - 12.5).toFixed(2));

    const nowIso = new Date().toISOString();

    const evaluatedEntry: GlobalAgentEntry = {
      agentId:
        agentId.trim() || `agent_${Math.floor(10000 + Math.random() * 89999)}`,
      name: agentName.trim() || 'Custom-Autonomous-Unit',
      tier: selectedTier,
      publisher: publisher.trim() || 'custom-domain.ai',
      endpointUrl: endpointUrl.trim(),
      globalRank: 1,
      previousRank: 1,
      tierRank: 1,
      verificationStatus: 'Verified (Ed25519 / ANS)',
      didIdentifier: `did:web:${publisher.trim()}:agents:${agentId.trim()}`,
      publicKeyFingerprint,
      signatureBase64: signatureB64,
      capabilities: capabilitiesList,
      description: description.trim(),
      metrics: {
        compositeScore,
        trajectorySuccess: sim.trajectorySuccess,
        reliabilityNRun: sim.reliabilityNRun,
        functionalCorrectness: sim.functionalCorrectness,
        speedEfficiency: sim.speedEfficiency,
        toolCallErrorRate: sim.toolCallErrorRate,
        latencyMs: sim.latencyMs,
        safetyResistanceScore: owaspAudit.safetyResistanceScore,
        securityTier: owaspAudit.securityTier,
      },
      financialEvaluation: fin,
      endpointHealth: 'NOMINAL',
      consecutiveFailures: 0,
      lastScannedUtc: nowIso,
      history: [
        {
          timestampUtc: nowIso,
          compositeScore,
          trajectorySuccess: sim.trajectorySuccess,
          costPerTaskUsd: fin.costPerTaskUsd,
          roiFactor: fin.estimatedRoiFactor,
          resourceWasteIndex: fin.resourceWasteIndex,
          latencyMs: sim.latencyMs,
        },
      ],
    };

    setLastEvalResult(evaluatedEntry);
    onRegisterEvaluatedAgent(evaluatedEntry);

    setExecutionLogs([
      `[1/7 Redis Lock] SET lock:crawl:${endpointUrl} "active" EX 4 NX -> ACQUIRED`,
      `[2/7 Ed25519 DID Gate] Verified canonical signature against ${publicKeyFingerprint.slice(0, 22)}... -> VALID`,
      `[3/7 Celery Worker] Dispatched tasks.evaluate_agent_node to isolated Firecracker MicroVM (${tierSpec.benchmarkSuite})`,
      `[4/7 OWASP Red-Team] Executed 5 adversarial vectors -> Safety Score: ${owaspAudit.safetyResistanceScore}% (Tier ${owaspAudit.securityTier})`,
      `[5/7 Trajectory & Reliability] Trajectory=${(sim.trajectorySuccess * 100).toFixed(1)}% · N-Run=${(sim.reliabilityNRun * 100).toFixed(1)}% · Latency=${sim.latencyMs}ms`,
      `[6/7 $ Evaluation Profiler] Cost/Task=$${fin.costPerTaskUsd.toFixed(6)} · ROI=${fin.estimatedRoiFactor}x · WasteIndex=${(fin.resourceWasteIndex * 100).toFixed(2)}%`,
      `[7/7 Storage Sync] Upserted Qdrant 1536-d vector, logged TimescaleDB row, and updated Redis ZSET global:directory:top_1m (Composite Score: ${compositeScore.toFixed(2)})`,
    ]);
  };

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="text-xs text-slate-400 font-mono">
            Firecracker MicroVM Isolation · OWASP Agentic Top 10 Red-Teaming · Ed25519 Cryptographic DID Gate
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mt-1 font-display">
            Sandbox Evaluation Kernel, OWASP Red-Teaming & Manifest Verifier
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSignManifest}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-blue-400" />
            Sign Manifest with Ed25519 Key
          </button>
          <button
            onClick={handleTamperSpoofTest}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-slate-900 hover:bg-rose-950/70 text-slate-300 hover:text-rose-300 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Simulate Spoof / Tamper Payload
          </button>
          <button
            onClick={handleRunSandboxEvaluation}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            Execute Sandbox & Inject into Leaderboard
          </button>
        </div>
      </div>

      {/* Main 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Candidate Agent Manifest Editor & Signature Status */}
        <div className="lg:col-span-7 border border-slate-800 rounded-xl bg-[#0F1626] p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-100">
                01. Candidate Agent Manifest (`/.well-known/agent-manifest.json`)
              </h3>
              <div className="text-xs font-mono">
                {isSignatureValid ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    Ed25519 Signature Valid
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                    Signature Invalid (Tampered)
                  </span>
                )}
              </div>
            </div>

            {verificationError && (
              <div className="p-3.5 rounded-lg bg-rose-950/50 border border-rose-800/70 text-xs text-rose-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>{verificationError}</div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Agent ID (`id`)
                </label>
                <input
                  type="text"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-[#0B0F19] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Agent Name (`name`)
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B0F19] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Autonomous Tier Class (`tier`)
                </label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value as AgentTier)}
                  className="w-full px-3 py-2 text-xs bg-[#0B0F19] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  {Object.values(AgentTier).map((t) => (
                    <option key={t} value={t}>
                      {t} Agent Tier
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Publisher Domain (`publisher`)
                </label>
                <input
                  type="text"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-[#0B0F19] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Discovery Endpoint URL (`endpoint`)
              </label>
              <input
                type="text"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-[#0B0F19] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Declared Capabilities (comma-separated, indexed into Qdrant 1536-d vector space)
              </label>
              <input
                type="text"
                value={capabilitiesText}
                onChange={(e) => setCapabilitiesText(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-[#0B0F19] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Domain Public Key Fingerprint & Base64 Ed25519 Signature
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={publicKeyFingerprint}
                  onChange={(e) => setPublicKeyFingerprint(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-[#0B0F19] border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={signatureB64}
                  onChange={(e) => setSignatureB64(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-[#0B0F19] border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Modifying any field without re-signing trips the Ed25519 anti-spoofing gate.
            </span>
          </div>
        </div>

        {/* Right Column: Live Sandbox Execution Kernel Output & Telemetry */}
        <div className="lg:col-span-5 border border-slate-800 rounded-xl bg-[#0F1626] p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-100">
                02. MicroVM Execution Trace & Output
              </h3>
              <Terminal className="w-4 h-4 text-slate-400" />
            </div>

            {/* Execution Console */}
            <div className="bg-[#0B0F19] border border-slate-800 rounded-lg p-4 font-mono text-xs space-y-2 max-h-60 overflow-y-auto">
              {executionLogs.map((log, index) => (
                <div
                  key={index}
                  className={
                    log.includes('[BLOCKED]') || log.includes('[ALERT]')
                      ? 'text-rose-400'
                      : log.includes('[7/7')
                      ? 'text-emerald-400 font-semibold'
                      : 'text-slate-300'
                  }
                >
                  {log}
                </div>
              ))}
            </div>

            {/* Computed Telemetry Result */}
            {lastEvalResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 inline-flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Injected into Global Leaderboard (`global:directory:top_1m`)
                  </span>
                  <span className="font-mono text-slate-400 tabular-nums">
                    {lastEvalResult.metrics.latencyMs} ms
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-px bg-slate-800 border border-slate-800 rounded-lg overflow-hidden font-mono tabular-nums">
                  <div className="bg-[#0B0F19] p-3.5">
                    <div className="text-xs text-slate-400 font-sans">
                      Composite Score
                    </div>
                    <div className="text-lg font-bold text-slate-100 mt-0.5">
                      {lastEvalResult.metrics.compositeScore.toFixed(2)} / 100
                    </div>
                  </div>
                  <div className="bg-[#0B0F19] p-3.5">
                    <div className="text-xs text-slate-400 font-sans">
                      Cost-Per-Task ($)
                    </div>
                    <div className="text-lg font-bold text-emerald-400 mt-0.5">
                      ${lastEvalResult.financialEvaluation.costPerTaskUsd.toFixed(5)}
                    </div>
                  </div>
                  <div className="bg-[#0B0F19] p-3.5">
                    <div className="text-xs text-slate-400 font-sans">
                      OWASP Safety Resistance
                    </div>
                    <div className="text-base font-semibold text-slate-200 mt-0.5">
                      {lastEvalResult.metrics.safetyResistanceScore?.toFixed(0)}% (Tier{' '}
                      {lastEvalResult.metrics.securityTier})
                    </div>
                  </div>
                  <div className="bg-[#0B0F19] p-3.5">
                    <div className="text-xs text-slate-400 font-sans">
                      ROI Factor (Grade {lastEvalResult.financialEvaluation.budgetEfficiencyTier})
                    </div>
                    <div className="text-base font-semibold text-slate-200 mt-0.5">
                      {lastEvalResult.financialEvaluation.estimatedRoiFactor.toFixed(1)}x
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 border border-slate-800/80 rounded-lg bg-[#0B0F19] text-center space-y-2">
                <div className="text-xs font-medium text-slate-300">
                  No Sandbox Benchmark Executed in Current Session
                </div>
                <p className="text-xs text-slate-500">
                  Verify the Ed25519 signature above and click &ldquo;Execute Sandbox &amp; Inject into Leaderboard&rdquo; to benchmark the candidate agent.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="font-medium text-slate-300">
              Active Tier Benchmark Suite ({selectedTier}):
            </div>
            <div>
              {
                TIER_TAXONOMY.find((t) => t.tier === selectedTier)
                  ?.benchmarkSuite
              }{' '}
              —{' '}
              {
                TIER_TAXONOMY.find((t) => t.tier === selectedTier)
                  ?.evaluationFocus
              }
            </div>
          </div>
        </div>
      </div>

      {/* OWASP Agentic Top 10 Automated Red-Teaming Sandbox Matrix */}
      <div className="border border-slate-800 rounded-xl bg-[#0F1626] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              03. Automated Red-Teaming & OWASP Agent Safety Sandbox (`red_teaming_sandbox.py`)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Injects standardized adversarial prompt injection, unauthorized tool execution, and privilege escalation vectors during sandbox evaluation.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono tabular-nums text-slate-300">
              Safety Score:{' '}
              <strong
                className={
                  redTeamAudit.securityTier === 'A'
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }
              >
                {redTeamAudit.safetyResistanceScore.toFixed(0)}% (Security Tier{' '}
                {redTeamAudit.securityTier})
              </strong>
            </span>
            <button
              onClick={() => handleRunRedTeamOnly(!simulateUnpatchedOwasp)}
              className="px-3 py-1.5 text-xs font-medium bg-[#0B0F19] hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-md transition-colors cursor-pointer"
            >
              {simulateUnpatchedOwasp
                ? 'Restore eBPF Guardrails (Pass All)'
                : 'Simulate Unpatched Vulnerability'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0B0F19] text-xs text-slate-400">
                <th className="py-3 px-4 font-medium">Vector ID & Type</th>
                <th className="py-3 px-4 font-medium">OWASP Category</th>
                <th className="py-3 px-4 font-medium">Adversarial Injection Payload</th>
                <th className="py-3 px-4 font-medium">Defense Status</th>
                <th className="py-3 px-4 font-medium text-right">Probe Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {redTeamAudit.vectorResults.map((vec) => (
                <tr key={vec.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-mono whitespace-nowrap">
                    <span className="font-semibold text-slate-100">{vec.id}</span>
                    <span className="text-slate-500 mx-1.5">·</span>
                    <span className="text-slate-300">{vec.type}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                    {vec.owaspCategory}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400 max-w-md truncate">
                    {vec.payload}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {vec.mitigated ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mitigated (Blocked)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-rose-400 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Vulnerable (Failed Gate)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                    {vec.responseLatencyMs} ms
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
