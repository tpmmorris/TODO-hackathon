import type { TriageWorkflowParams } from './orchestration/triageWorkflow';

export interface Env {
  AI: Ai;
  DB: D1Database;
  REPORTS_BUCKET: R2Bucket;
  VECTOR_INDEX: VectorizeIndex;
  SLOT_LOCK_DO: DurableObjectNamespace;
  TRIAGE_WORKFLOW: Workflow<TriageWorkflowParams>;
  ENVIRONMENT?: string;
}
