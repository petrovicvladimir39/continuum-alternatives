import { sourceType } from "@continuum/db";
import { SourceForm } from "../source-form";

export default function NewSourcePage() {
  return (
    <div>
      <h1 className="type-h2">New source</h1>
      <div className="mt-6">
        <SourceForm mode="create" sourceTypes={[...sourceType.enumValues]} />
      </div>
    </div>
  );
}
