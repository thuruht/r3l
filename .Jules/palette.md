## 2024-05-24 - Form Control Association
**Learning:** Range inputs and color pickers often lack explicit label association when using `div` wrappers, causing screen readers to miss the label context.
**Action:** Always use `htmlFor` on the label and matching `id` on the input, or wrap the input within the label element. For range inputs, consider adding `aria-valuemin`, `aria-valuemax`, and `aria-valuenow` if the native implementation is insufficient or for clarity in custom implementations.
