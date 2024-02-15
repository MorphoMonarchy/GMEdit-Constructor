import { Job } from '../compiler/Job.js';
import { ConstructorEditorView, ConstructorViewFileKind } from './ConstructorEditorView.js';

const GmlFile = $gmedit['gml.file.GmlFile'];
const ChromeTabs = $gmedit['ui.ChromeTabs'];

/**
 * File type for a compile job.
 */
class KConstructorOutput extends ConstructorViewFileKind {

    constructor() {
        super();
        this.checkSelfForChanges = false;
    }

    /**
     * @param {GmlFile} file
     * @param {Job} job
     */
    init = (file, job) => {
        file.editor = new CompileLogViewer(file, job);
    }

    /**
     * @param {Job} job
     */
    static getJobName = (job) => {
        return `${job.projectDisplayName} - ${job.command}${job.stopped ? ' - Finished' : ''}`;
    }

}

/**
 * 'Editor' for viewing a compile log all fancy.
 */
export class CompileLogViewer extends ConstructorEditorView {

    static fileKind = new KConstructorOutput();
    static scrollGrabMargin = 32;

    /** @type {Job} */
    job;

    stop_btn;
    log;
    cmd;

    /**
     * @param {GmlFile} file
     * @param {Job} job
     */
    constructor(file, job) {

        super(file);

        this.element.classList.add('gm-constructor-viewer');

        const info = document.createElement('div');
        info.className = 'gm-constructor-info';

        const stop_btn = document.createElement('input');
        stop_btn.type = 'button';
        stop_btn.value = 'Stop';
        stop_btn.className = 'stop';

        this.stop_btn = stop_btn;

        info.appendChild(this.stop_btn);

        const cmd = document.createElement('input');
        cmd.type = 'text';
        cmd.readOnly = true;
        cmd.style.flexGrow = '1';

        this.cmd = cmd;

        info.appendChild(cmd);

        const log = document.createElement('pre');
        log.className = 'gm-constructor-log';

        this.log = log;

        this.element.appendChild(info);
        this.element.appendChild(this.log);

        this.watchJob(job);
    }

    /**
     * @param {Job} job
     */
    watchJob = (job) => {

        this.job = job;

        this.log.textContent = '';

        this.job.on('stdout', (content) => {
            const should_scroll =
                (this.log.scrollTop + this.log.clientHeight) >= (this.log.scrollHeight - CompileLogViewer.scrollGrabMargin);

            this.log.textContent = content;

            if (should_scroll) {
                this.log.scrollTop = this.log.scrollHeight;
            }
        });

        this.job.on('stop', () => {
            this.stop_btn.disabled = true;
            this.cmd.value += ' - Finished';
            this.file.rename(KConstructorOutput.getJobName(this.job), '');
        });

        this.stop_btn.onclick = this.job.stop;
        this.cmd.value = this.job.command;

    }


    /**
     * Set up an editor tab for a Job, and view it.
     * @param {Job} job
     * @param {Boolean} reuse Whether to reuse an existing tab.
     * @returns {void}
     */
    static view = (job, reuse) => {

        if (!reuse) {

            const file = new GmlFile(
                KConstructorOutput.getJobName(job),
                null,
                this.fileKind,
                job
            );
            
            return GmlFile.openTab(file);
            
        }

        const tabs = Array.from(ChromeTabs.getTabs());
        const editors = tabs.map(tab => tab.gmlFile.editor);

        /** @type {CompileLogViewer|undefined} */
        // @ts-ignore
        const compilerViewer = editors.find(editor => editor instanceof CompileLogViewer);

        if (compilerViewer === undefined) {
            return this.view(job, false);
        }

        compilerViewer.stopJob();
        compilerViewer.watchJob(job);
        
        return compilerViewer.file.tabEl.click();

    }

    stopJob = () => {
        this.job.stop();
    }

    /**
     * Called when closing the tab,
     * for now we have it also kill the job, so it doesn't run
     * on in the background.
     */
    destroy = () => {
        this.stopJob();
    }
}
