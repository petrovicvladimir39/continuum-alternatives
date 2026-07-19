export type FormState = {
  errors: Record<string, string>;
  values: Record<string, string>;
};

export const initialFormState: FormState = { errors: {}, values: {} };
