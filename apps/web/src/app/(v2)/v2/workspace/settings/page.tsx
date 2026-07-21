import { WorkspaceSettings } from "@/components/v2/workspace/workspace-panels";

export default function SettingsPage() {
  return (
    <div>
      <h1 className="type-h1">Settings</h1>
      <div className="mt-4">
        <WorkspaceSettings />
      </div>
    </div>
  );
}
