/**
 * Container for controlling the list of compile jobs,
 * and starting new ones on projects.
 */

import { CompileLogViewer } from '../ui/editors/CompileLogViewer.js';
import { Job } from './job/Job.js';
import { igor_platform_cmd_name, output_blob_exts, output_package_exts } from './igor-paths.js';
import { Err } from '../utils/Err.js';
import { join_path, spawn } from '../GMConstructor.js';

/** @type {Job[]} */
const jobs = [];

/**
 * Run a new job on a given project.
 * @param {GMLProject} project
 * @param {RuntimeInfo} runtime
 * @param {UserInfo?} user
 * @param {IgorSettings} settings
 * @returns {Promise<Result<Job>>}
 */
export async function job_run(project, runtime, user, settings) {

    const flags_res = job_flags_get(project, runtime.path, user?.path ?? null, settings);

    if (!flags_res.ok) {
        return {
            ok: false,
            err: new Err('Failed to get Igor flags for this job!', flags_res.err)
        }
    }

    const proc = spawn(
        runtime.igor_path,
        flags_res.data,
        { cwd: project.dir }
    );

    const job = new Job(settings, proc, project);
    jobs.push(job);

    job.on('stop', () => {
        job_remove(job);
    });

    return {
        ok: true,
        data: job
    };

}

/**
 * Create a new editor instance for a given job.
 * @param {Job} job
 * @param {Boolean} reuse Whether to reuse an existing tab.
 */
export function job_open_editor(job, reuse) {
    CompileLogViewer.view(job, reuse);
}

/**
 * Remove a job from our tracked list.
 * @param {Job} job
 */
function job_remove(job) {
    jobs.splice(jobs.indexOf(job), 1);
}

/**
 * Select the flags for Igor to run the job.
 * @param {GMLProject} project
 * @param {string} runtime_path
 * @param {string?} user_path
 * @param {IgorSettings} settings
 * @returns {Result<string[]>}
 */
function job_flags_get(project, runtime_path, user_path, settings) {

    const projectName = project.displayName;

    const flags = [
        `/project=${project.path}`,
        `/config=${settings.configName}`,
        `/rp=${runtime_path}`,
        `/runtime=${settings.runner}`,
        `/v`,
        `/cache=${join_path(settings.buildPath, 'cache')}`,
        '/of=' + join_path(settings.buildPath, 'output', projectName + output_blob_exts[settings.platform])
    ];

    if (user_path !== null) {
        flags.push(`/uf=${user_path}`);
    }

    // ignore cache, this fixes changes not applying in yyc
    if (settings.runner === 'YYC') {
        flags.push('/ic');
    }

    switch (settings.verb) {

        case 'Package':

            if (['Windows', 'Mac'].includes(igor_platform_cmd_name)) {
                settings.verb = 'PackageZip';
            }

        break;

        case 'Run':
        break;

        case 'Clean':
        break;

        default:
            return {
                ok: false,
                err: new Err(`Unhandled command case for flags: ${settings.verb}`)
            }
    }

    flags.push('--');
    flags.push(igor_platform_cmd_name, settings.verb);

    return {
        ok: true,
        data: flags
    };
}

export function __cleanup__() {
    jobs.forEach(job => job.stop());
}
