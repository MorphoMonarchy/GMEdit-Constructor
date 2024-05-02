/**
 * Wrapper components for additional behaviour not provided by {@link GMEditUIPreferences}.
 */

const UIPreferences = $gmedit['ui.Preferences'];

/**
 * Create a group of elements.
 * @param {HTMLElement} parent 
 * @param {string} label
 * @param {HTMLAnchorElement[]} buttons
 * @returns {HTMLFieldSetElement}
 */
export function group(parent, label, buttons) {

    const group = UIPreferences.addGroup(parent, label);

    /** @type {HTMLLegendElement} */
    // @ts-ignore
    const legend = group.querySelector('legend');

    legend.appendChild(document.createTextNode(' ('));

    for (const button of buttons) {
        
        legend.appendChild(button);

        if (button !== buttons.at(-1)) {
            legend.appendChild(document.createTextNode('; '));
        }

    }

    legend.appendChild(document.createTextNode(')'));

    return group;

}

/**
 * Create a group of elements.
 * @param {string} label
 * @param {(ev: MouseEvent) => void} callback
 * @returns {HTMLAnchorElement}
 */
export function text_button(label, callback) {

    const anchor = document.createElement('a');
    anchor.textContent = label;
    anchor.href = '';

    anchor.addEventListener('click', (ev) => {
        ev.preventDefault();
        callback(ev);
    });

    return anchor;

}

/**
 * Create a preformatted text area.
 * @param {string} text 
 * @returns {HTMLPreElement}
 */
export function pre(text) {
    const pre = document.createElement('pre');
    pre.textContent = text;

    return pre;
}

/**
 * Create a paragraph.
 * @param {string} text 
 * @returns {HTMLParagraphElement}
 */
export function p(text) {
    const p = document.createElement('p');
    p.textContent = text;

    return p;
}

/**
 * Create an em block.
 * @param {string} text 
 * @returns {HTMLElement}
 */
export function em(text) {
    const em = document.createElement('em');
    em.textContent = text;

    return em;
}

/**
 * Create a h1.
 * @param {string} text 
 * @returns {HTMLHeadingElement}
 */
export function h1(text) {
    return heading(1, text);
}

/**
 * Create a h2.
 * @param {string} text 
 * @returns {HTMLHeadingElement}
 */
export function h2(text) {
    return heading(2, text);
}

/**
 * Create a h3.
 * @param {string} text 
 * @returns {HTMLHeadingElement}
 */
export function h3(text) {
    return heading(3, text);
}

/**
 * Create a h4.
 * @param {string} text 
 * @returns {HTMLHeadingElement}
 */
export function h4(text) {
    return heading(4, text);
}

/**
 * Create a heading of a given size.
 * @param {number} size 
 * @param {string} text 
 * @returns {HTMLHeadingElement}
 */
function heading(size, text) {

    const heading = document.createElement(`h${size}`);
    heading.textContent = text;

    // @ts-ignore
    return heading;

}
