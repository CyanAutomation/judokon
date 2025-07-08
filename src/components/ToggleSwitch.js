/**
 * Create a toggle switch element with optional id, name and checked state.
 *
 * @pseudocode
 * 1. Create a wrapper div with class `settings-item`.
 * 2. Create a label with class `switch` and set `htmlFor` when an id is provided.
 * 3. Inside the label, add an `input` of type checkbox using provided options
 *    for `id`, `name`, `checked` and `aria-label`.
 * 4. Add a `div` acting as the slider and a `span` containing the label text.
 * 5. Append the input, slider and span to the label and return the wrapper
 *    containing the complete toggle switch markup.
 *
 * @param {string} labelText - Visible text for the toggle label.
 * @param {object} [options] - Additional configuration.
 * @param {string} [options.id] - Id attribute for the input/label.
 * @param {string} [options.name] - Name attribute for the input.
 * @param {boolean} [options.checked=false] - Initial checked state.
 * @param {string} [options.ariaLabel] - Custom ARIA label, defaults to labelText.
 * @returns {HTMLDivElement} Wrapper element containing the toggle switch.
 */
export function createToggleSwitch(labelText, options = {}) {
  const { id, name, checked = false, ariaLabel = labelText } = options;

  const wrapper = document.createElement("div");
  wrapper.className = "settings-item";

  const label = document.createElement("label");
  label.className = "switch";
  if (id) label.htmlFor = id;

  const input = document.createElement("input");
  input.type = "checkbox";
  if (id) input.id = id;
  if (name) input.name = name;
  input.checked = checked;
  input.setAttribute("aria-label", ariaLabel);

  const slider = document.createElement("div");
  slider.className = "slider round";

  const span = document.createElement("span");
  span.textContent = labelText;

  label.append(input, slider, span);
  wrapper.appendChild(label);

  return wrapper;
}
