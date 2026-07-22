import type { TriageWorkflowParams } from './orchestration/triageWorkflow';
import type { CareOptionsWorkflowParams } from './orchestration/careOptionsWorkflow';

export interface Env {
  ASSETS: Fetcher;
  ANALYTICS?: AnalyticsEngineDataset;
  AI: Ai;
  DB: D1Database;
  REPORTS_BUCKET: R2Bucket;
  VECTOR_INDEX: VectorizeIndex;
  SLOT_LOCK_DO: DurableObjectNamespace;
  TRIAGE_WORKFLOW: Workflow<TriageWorkflowParams>;
  CARE_OPTIONS_WORKFLOW: Workflow<CareOptionsWorkflowParams>;
  CALLS_APP_ID: string;
  CALLS_APP_SECRET: string;
  TURN_TOKEN_ID: string;
  TURN_API_TOKEN: string;
  ENVIRONMENT?: string;
}
