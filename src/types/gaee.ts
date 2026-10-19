export enum AgentTier {
  AI = 'AI',
  AGI = 'AGI',
  ASI = 'ASI',
  RSI = 'RSI',
  APEX = 'Apex',
  SWARM = 'Swarm',
}

export type EndpointHealth = 'NOMINAL' | 'DEGRADED' | 'CIRCUIT_OPEN';

export interface AgentMetrics {
  compositeScore: number;
  trajectorySuccess: number; // 0.0 - 1.0
  reliabilityNRun: number; // 0.0 - 1.0
  functionalCorrectness: number; // 0.0 - 1.0
  speedEfficiency: number; // 0.0 - 1.0
  toolCallErrorRate: number; // 0.0 - 1.0
  latencyMs: number;
  safetyResistanceScore?: number; // 0 - 100 OWASP Red-Team Score
  securityTier?: 'A' | 'B' | 'F';
}

export interface AgentFinancialEvaluation {
  costPerTaskUsd: number;
  tokenEfficiencyScore: number; // average tokens per successful goal completion
  estimatedRoiFactor: number;
  roiNormalizationFactor: number; // min(roi_factor / 200.0, 1.0)
  resourceWasteIndex: number; // (Failed Tool Calls + Infinite Loops) / Total Operations
  operationalBurnUsd: number; // C_op
  economicYieldUsd: number; // Y_econ
  budgetEfficiencyTier: 'A+' | 'A' | 'B+' | 'B' | 'C';
}

export interface HistoricalDataPoint {
  timestampUtc: string;
  compositeScore: number;
  trajectorySuccess: number;
  costPerTaskUsd: number;
  roiFactor: number;
  resourceWasteIndex: number;
  latencyMs: number;
}

export interface GlobalAgentEntry {
  agentId: string;
  name: string;
  tier: AgentTier;
  publisher: string;
  endpointUrl: string;
  globalRank: number;
  previousRank: number;
  tierRank: number;
  verificationStatus:
    | 'Verified (Ed25519 / ANS)'
    | 'Verified (SPIFFE DID)'
    | 'Unverified Signature';
  didIdentifier: string;
  publicKeyFingerprint: string;
  signatureBase64: string;
  capabilities: string[];
  description: string;
  metrics: AgentMetrics;
  financialEvaluation: AgentFinancialEvaluation;
  endpointHealth: EndpointHealth;
  consecutiveFailures: number;
  lastScannedUtc: string;
  history: HistoricalDataPoint[];
}

export interface CrawlerScanEvent {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  tier: AgentTier;
  endpoint: string;
  bloomFilterStatus: 'ACQUIRED_LOCK_4S' | 'SKIPPED_DUPLICATE';
  signatureValid: boolean;
  oldScore: number;
  newScore: number;
  rankDelta: number;
  costPerTaskUsd: number;
  latencyMs: number;
  healthStatus: EndpointHealth;
}

export interface TierTaxonomyInfo {
  tier: AgentTier;
  title: string;
  definition: string;
  evaluationFocus: string;
  benchmarkSuite: string;
  zsetKey: string;
}

export interface ArchitectureModule {
  id: string;
  filename: string;
  title: string;
  subsystem: string;
  language: string;
  description: string;
  code: string;
}

export interface A2AMatchupRecord {
  matchId: string;
  timestampUtc: string;
  agentAId: string;
  agentAName: string;
  agentATier: AgentTier;
  agentBId: string;
  agentBName: string;
  agentBTier: AgentTier;
  challengePrompt: string;
  agentAResponseSummary: string;
  agentBRefinementSummary: string;
  consensusScore: number;
  handoffLatencyMs: number;
  winnerAgentId: string;
  scoreDeltaApplied: number;
  jsonRpcTrace: string;
}

export interface RedTeamVectorResult {
  id: string;
  type: string;
  owaspCategory: string;
  payload: string;
  mitigated: boolean;
  responseLatencyMs: number;
  auditNote: string;
}

export interface WebhookSubscription {
  id: string;
  name: string;
  channelType: 'Slack' | 'PagerDuty' | 'Custom HTTPS';
  url: string;
  secret: string;
  active: boolean;
}

export interface WebhookDispatchLog {
  id: string;
  timestampUtc: string;
  eventType: string;
  subscriptionName: string;
  targetUrl: string;
  hmacSignature: string;
  agentId: string;
  statusCode: number;
  payloadJson: string;
}

export interface SettlementTransaction {
  txId: string;
  timestampUtc: string;
  agentId: string;
  agentName: string;
  recipientWallet: string;
  verifiedRoi: number;
  taskCostUsd: number;
  payoutAmountUsdc: number;
  status: 'SETTLED' | 'REJECTED_LOW_ROI';
  txHash: string;
  reason?: string;
}
