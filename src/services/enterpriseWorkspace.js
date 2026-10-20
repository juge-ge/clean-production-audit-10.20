import { copy, createSnapshot } from "../data/auditWorkflow";

// Frontend-only working copy. Keep archived rounds and OA submissions intact.
export function ensureWorkspace(entity) {
  if (!entity.auditWorkspace) {
    const round = copy(entity.rounds[3]);
    const pending = ["draft", "revising"].includes(entity.oaWorkflow.status)
      ? entity.oaWorkflow.draft
      : null;
    if (pending) Object.assign(round, copy(pending.rounds[3]));
    const info = copy(pending?.info || entity.info);
    round.info = info;
    entity.auditWorkspace = {
      info,
      documents: copy(pending?.documents || entity.documents),
      rounds: { 3: round },
    };
  }
  return entity.auditWorkspace;
}

export function workspaceData(entity) {
  const draft = ensureWorkspace(entity);
  return {
    ...entity,
    info: draft.info,
    documents: draft.documents,
    rounds: { ...entity.rounds, 3: draft.rounds[3] },
  };
}

export function syncWorkspaceDocuments(entity) {
  const draft = ensureWorkspace(entity);
  // Preserve draft-only uploads while adding/updating data-center references.
  const additions = draft.documents.filter(
    (file) => !entity.documents.some((source) => source.id === file.id),
  );
  draft.documents = [...copy(entity.documents), ...additions];
}

export function prepareWorkspaceSubmission(entity) {
  if (!["draft", "revising"].includes(entity.oaWorkflow.status))
    throw new Error("本轮已有正式提交记录，当前状态不可更新待提交材料。草稿可继续保存。");
  const draft = workspaceData(entity);
  entity.oaWorkflow.draft = createSnapshot(draft);
  // Reuse original files without a second upload; submitted snapshots stay fixed.
  for (const file of draft.documents)
    if (!entity.documents.some((source) => source.id === file.id))
      entity.documents.push(copy(file));
}
