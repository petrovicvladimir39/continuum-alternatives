import { WorkspaceDashboard } from "@/components/v2/workspace/workspace-panels";

export default function WorkspacePage() {
  return (
    <div>
      <h1 className="type-h1">Dashboard</h1>
      <div className="mt-4">
        <WorkspaceDashboard />
      </div>
    </div>
  );
}
