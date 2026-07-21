import { WorkspaceQueries } from "@/components/v2/workspace/workspace-panels";

export default function QueriesPage() {
  return (
    <div>
      <h1 className="type-h1">Saved queries</h1>
      <div className="mt-4">
        <WorkspaceQueries />
      </div>
    </div>
  );
}
