import { entityKind } from "@continuum/db";
import { EntityNewForm } from "./entity-new-form";

export default function NewEntityPage() {
  return (
    <div>
      <h1 className="type-h2">New entity</h1>
      <div className="mt-6">
        <EntityNewForm kinds={[...entityKind.enumValues]} />
      </div>
    </div>
  );
}
