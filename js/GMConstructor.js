import * as compileController from './compiler/igor-controller.js';
import * as hamburgerOptions from './ui/HamburgerOptions.js';
import { project_current_get, open_files_save, project_format_get } from './utils/project.js';
import * as preferences from './preferences/Preferences.js';
import * as projectProperties from './preferences/ProjectProperties.js';
import * as igorPaths from './compiler/igor-paths.js';
import * as preferencesMenu from './ui/PreferencesMenu.js';
import { Err } from './utils/Err.js';
import { ConstructorControlPanel } from './ui/editors/ConstructorControlPanel.js';
import { SemVer } from './utils/update-checker/SemVer.js';
import { plugin_update_check } from './utils/update-checker/UpdateChecker.js';
import * as constructorEditorView from './ui/editors/ConstructorEditorView.js';
import { fileExists, mkdir, readdir } from './utils/file.js';

/**
 * Name of the plugin 
 * @type {String}
 */
export let plugin_name;

/**
 * Current plugin version
 * @type {String}
 */
export let plugin_version;

/**
 * Reference to NodeJS path join.
 * @type {import('node:path').join}
 */
export let join_path;

/** 
 * Reference to NodeJS spawn.
 * @type {import('node:child_process').spawn} 
 */
export let spawn;

/**
 * Main controller instance for the plugin!
 */
export class GMConstructor {

    /**
     * Run a task on our current project.
     * @param {AtLeast<IgorSettings, 'verb'>} partial_settings
     */
    async #runTask(partial_settings) {

        const project = project_current_get();

        if (project === undefined) {
            return;
        }

        /** @type {IgorSettings} */
        const settings = {
            verb: partial_settings.verb,
            buildPath: partial_settings.buildPath ?? this.#getBuildDir(project),
            platform: partial_settings.platform ?? igorPaths.igor_user_platform,
            runner: partial_settings.runner ?? projectProperties.runner_get(),
            threads: partial_settings.threads ?? 8,
            configName: partial_settings.configName ?? projectProperties.config_name_get()    
        };
        
        const runtime_type = projectProperties.runtime_channel_type_get();
        const runtime_res = projectProperties.runtime_get();
        const user_res = projectProperties.user_get();

        if (!runtime_res.ok) {

            const err = new Err(
                `No ${runtime_type} runtimes available to compile!`,
                runtime_res.err,
                `Try specifying a different runtime channel type below, or check the runtime search path for ${runtime_type} runtimes.`
            );

            return ConstructorControlPanel
                .view(true)
                .showError(err.message, err);
        }

        const runtime = runtime_res.data;
        const supported_res = runtime.version.supportedByProject(project);

        if (!supported_res.ok) {

            const err = new Err(
                `Failed to check runtime version '${runtime.version}' is compatible with the project!`,
                supported_res.err
            );

            return ConstructorControlPanel
                .view(true)
                .showError(err.message, err);
        }

        const supported = supported_res.data;

        if (!supported) {

            const format_res = project_format_get(project);
            let format = '[Unknown Format]';

            if (format_res.ok) {
                format = format_res.data;
            }

            const err = new Err(
                `Runtime version '${runtime.version}' is not compatible with this project format!`,
                undefined,
                `This project is in the YY ${format} format, where the chosen runtime (${runtime.version}) expects the ${runtime.version.format} format.\n\nPlease pick a matching runtime, or you can convert your project to the desired format using ProjectTool in the IDE.`
            );

            return ConstructorControlPanel
                .view(true)
                .showError(err.message, err);
        }

        if (preferences.save_on_run_task_get()) {
            open_files_save();
        }

        if (!(await readdir(settings.buildPath)).ok) {
            
            const res = await mkdir(settings.buildPath, true);
            
            if (!res.ok) {

                const err = new Err(
                    'Failed to create the build directory for project output!',
                    res.err,
                    `Ensure the path '${settings.buildPath}' is valid, and that GMEdit would have permission to edit files and directories there.`
                );

                return ConstructorControlPanel
                    .view(true)
                    .showError(res.err.message, err);
                
            }

        }

        const res = await compileController.job_run(
            project,
            runtime_res.data,
            (user_res.ok ? user_res.data : null),
            settings
        );

        if (!res.ok) {

            const err = new Err(
                `Failed to run Igor job!`,
                res.err
            );

            return ConstructorControlPanel
                .view(true)
                .showError(err.message, err)
        }

        compileController.job_open_editor(res.data, preferences.reuse_compiler_tab_get());
    }

    /**
     * Get the build directory to use for the given project.
     * @param {GMLProject} project 
     * @returns {String}
     */
    #getBuildDir(project) {
        
        if (preferences.use_global_build_get()) {
            return join_path(preferences.global_build_path_get(), project.displayName);
        }

        return join_path(project.dir, 'build');

    }

    onControlPanel = () => {
        ConstructorControlPanel.view(true);
    }

    packageCurrent = () => {
        this.#runTask({ verb: 'Package' });
    }

    cleanCurrent = () => {
        this.#runTask({ verb: 'Clean' });
    }

    runCurrent = () => {
        this.#runTask({ verb: 'Run' });
    }

    /**
     * Create an instance of the plugin.
     * 
     * @param {string} _plugin_name Name of the plugin - redundant, but saves typing it everywhere.
     * @param {string} _plugin_version Current version of the plugin
     * @param {import('node:path')} node_path 
     * @param {import('node:child_process')} node_child_process
     * @param {boolean} reloading Whether we are reloading from an existing previous Constructor instance.
     * 
     * @returns {Promise<Result<GMConstructor>>}
     */
    static async create(_plugin_name, _plugin_version, node_path, node_child_process, reloading) {

        // Prevent Constructor loading when running on Rosetta, since it has a bunch of issues there.
        if (rosetta_check(node_child_process.execSync)) {

            const err = new Err(`${_plugin_name} does not work correctly on Rosetta - please consider using GMEdit's native Arm64 build found at https://yellowafterlife.itch.io/gmedit`);
            console.error(err);

            Electron_Dialog.showMessageBox({
                title: 'GMEdit-Constructor cannot load on Rosetta!',
                message: err.message,
                buttons: ['Dismiss'],
                type: 'error'
            });

            return {
                ok: false,
                err: err
            };

        }

        join_path = node_path.join;
        spawn = node_child_process.spawn;

        plugin_name = _plugin_name;
        plugin_version = _plugin_version;

        igorPaths.__setup__();

        // Setting up preferences //
        const preferences_res = await preferences.__setup__();

        if (!preferences_res.ok) {
            return {
                ok: false,
                err: new Err('Failed to init preferences', preferences_res.err)
            };
        }

        projectProperties.__setup__();
        preferencesMenu.__setup__();
        hamburgerOptions.__setup__();
        constructorEditorView.__setup__();

        // Check for updates //
        if (preferences.update_check_get()) {

            plugin_update_check()
                .then(res => {
                    
                    if (!res.ok) {
                        return ConstructorControlPanel.showWarning(
                            'Failed to check for plugin updates.',
                            res.err
                        );
                    }

                    if (!res.data.update_available) {
                        return;
                    }

                    // Bit silly to use an error message for this but it works :P
                    ConstructorControlPanel.showWarning(
                        'An update is available for Constructor!',
                        new Err(
                            'There is an update available.',
                            'Update Check',
                            `${plugin_name} ${res.data.version} is available on GitHub!\n\n${res.data.url}`
                        )
                    );

                });
            
        }

        return {
            ok: true,
            data: new GMConstructor()
        };
    }

    /**
     * Called on deregistering the plugin.
     */
    async cleanup() {

        preferences.__cleanup__();
        compileController.__cleanup__();
        projectProperties.__cleanup__();
        hamburgerOptions.__cleanup__();
        constructorEditorView.__cleanup__();
        
    }

}

/**
 * Make sure we aren't running on rosetta, since GMEdit has
 * a native build and Rosetta seems to cause some weirdness!
 * 
 * @param {import('node:child_process').execSync} execSync
 */
function rosetta_check(execSync) {

    if (process.platform !== 'darwin') {
        return false;
    }

    if (process.arch !== 'x64') {
        return false;
    }

    const cmd = 'sysctl -in sysctl.proc_translated';
    const output = execSync(cmd).toString('utf-8');

    // If the return of this command is 1, we are running in Rosetta.
    return output.includes('1');

}