import { Field, FieldLabel, FormSelect, type FormSelectOption } from "@/shared/lib/sites-tools/react";
import { EXTRAS } from "@/shared/config/lead";
import { Icon } from "@/shared/ui/Icon";
import { AFTER_PHONE, FIELD } from "./look";

// Tailwind reads `_` in a selector as a space; the escape keeps the field's name.
const HIDDEN_BY_ESTIMATE = String.raw`group-has-[[data-lead-field=estimate\_bedrooms]]/lead:hidden`;

/**
 * The size of the home, after the phone and optional: nothing chosen posts
 * nothing, and the call back asks what the form did not. Labelled like the
 * kit's fields under `labels="hidden"`: for assistive technology only. An
 * estimate asks the bedrooms among its answers (`estimate_bedrooms`), so
 * while its tiles are in the form this one is not shown (unanswered, it
 * posts nothing). Sized like the kit's fields, it takes a column where two fit.
 */
export function BedroomsField({ label, placeholder, options }: { label: string; placeholder: string; options: readonly FormSelectOption[] }) {
  return (
    <Field className={`flex min-w-0 flex-col gap-1.5 ${HIDDEN_BY_ESTIMATE}`}>
      <FieldLabel className="sr-only">{label}</FieldLabel>
      <FormSelect name={EXTRAS.bedrooms.name} size="lg" placeholder={placeholder} options={options} classNames={{ trigger: FIELD }} />
    </Field>
  );
}

/** The line right under the phone (`afterPhone`): the frame's leaf shield and 12 px slate-500. */
export function AfterPhone({ text }: { text: string }) {
  return (
    <p className={AFTER_PHONE}>
      <Icon name="shield-check" className="mt-px size-3.5 text-positive" />
      {text}
    </p>
  );
}
