export type ResolutionWarning = {
  outcome: "matched" | "ambiguous";
  via?: string;
  candidates: { slug: string; name: string; score: number }[];
};

export type FormState = {
  errors: Record<string, string>;
  values: Record<string, string>;
  resolution?: ResolutionWarning;
};

export const initialFormState: FormState = { errors: {}, values: {} };
