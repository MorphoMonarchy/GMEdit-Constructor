/**
 * Controller for the Preferences configuration on the menu.
 */

import { plugin_name, plugin_version } from '../GMConstructor.js';
import { UIDropdownMutate } from '../utils/ui.js';
import * as preferences from '../preferences/Preferences.js';

const UIPreferences = $gmedit['ui.Preferences'];

/** @type {string} */
let ele_css_query;

/**
 * Setup the preferences menu callback.
 */
export function __setup__() {

    ele_css_query = `.plugin-settings[for="${plugin_name}"]`;

    on_preferences_built();

    GMEdit.on('preferencesBuilt', on_preferences_built);
}

/**
 * Deregister callback for setting up menu.
 */
export function __cleanup__() {
    GMEdit.off('preferencesBuilt', on_preferences_built);
}

/**
 * Create the preferences menu within the given group.
 * @param {HTMLElement} prefs_group
 * @param {Function?} [on_change_runtime_channel]
 */
export function menu_create(prefs_group, on_change_runtime_channel) {

    UIPreferences.addCheckbox(
        prefs_group,
        'Save automatically when running a task',
        preferences.save_on_run_task_get(),
        preferences.save_on_run_task_set
    );

    UIPreferences.addCheckbox(
        prefs_group,
        'Reuse compiler output tab between runs',
        preferences.save_on_run_task_get(),
        preferences.reuse_compiler_tab_set
    );

    UIPreferences.addDropdown(
        prefs_group,
        'Runner Type',
        preferences.runner_get(),
        preferences.valid_runner_types,
        // @ts-ignore
        preferences.runner_set
    );

    UIPreferences.addDropdown(
        prefs_group,
        'Runtime Channel Type',
        preferences.runtime_channel_type_get(),
        preferences.valid_runtime_types,
        (value) => {
            // @ts-ignore
            preferences.runtime_channel_type_set(value);
            if (on_change_runtime_channel) {
                on_change_runtime_channel();
            }
        }
    );

    for (const type of preferences.valid_runtime_types) {

        const group = UIPreferences.addGroup(prefs_group, type);

        /** @type {HTMLElement} */
        let version_dropdown;

        /** @type {HTMLElement} */
        let user_dropdown;

        UIPreferences.addInput(
            group,
            'Search Path',
            preferences.runtime_search_path_get(type),
            async (path) => {
                // Workaround for being called twice for some reason?
                if (path === preferences.runtime_search_path_get(type)) {
                    return;
                }
                await preferences.runtime_search_path_set(type, path);
                UIDropdownMutate(
                    version_dropdown,
                    runtime_version_strings_get_for_type(type)
                );
            }
        );

        version_dropdown = UIPreferences.addDropdown(
            group,
            'Version',
            preferences.runtime_version_get(type) ?? '',
            runtime_version_strings_get_for_type(type),
            (choice) => {
                preferences.runtime_version_set(type, choice);
            }
        );

        UIPreferences.addInput(
            group,
            'User Data Path',
            preferences.users_search_path_get(type),
            async (path) => {
                // Workaround for being called twice for some reason?
                if (path === preferences.users_search_path_get(type)) {
                    return;
                }
                await preferences.users_search_path_set(type, path);
                UIDropdownMutate(
                    user_dropdown,
                    user_strings_get_for_type(type)
                );
            }
        );

        user_dropdown = UIPreferences.addDropdown(
            group,
            'User',
            preferences.user_get(type) ?? '',
            user_strings_get_for_type(type),
            (choice) => {
                preferences.user_set(type, choice);
            }
        );

    }

    UIPreferences.addText(prefs_group, `Version: ${plugin_version}`);

}

/**
 * Get an array of version strings for the given runtime type.
 * @param {RuntimeChannelType} type 
 * @returns 
 */
export function runtime_version_strings_get_for_type(type) {
    
    const runtimes = preferences.runtime_versions_get_for_type(type);

    if (runtimes === null) {
        return [];
    }

    return runtimes.map(runtime => runtime.version.toString());

}

/**
 * Get an array of username strings for the given runtime type.
 * @param {RuntimeChannelType} type 
 * @returns 
 */
function user_strings_get_for_type(type) {
    
    const users = preferences.users_get_for_type(type);

    if (users === null) {
        return [];
    }

    return users.map(user => user.name.toString());

}

/**
 * Callback for setting up our preferences menu when the user opens prefs.
 * @param {Event} [ev] 
 */
function on_preferences_built(ev) {

    let target = document.body;

    if (ev !== undefined && ev.target instanceof HTMLElement) {
        target = ev.target;
    }

    const prefs_el = target.querySelector(ele_css_query);

    if (prefs_el instanceof HTMLDivElement) {
        menu_create(prefs_el);
    }
}

