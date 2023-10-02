/**
 * @class
 * @param {(error: string) => void} showError
 * @param {import('node:process')} process 
 * @param {import('node:child_process')} child_process
 */
export function GMConstructorCompiler(showError, process, child_process) {

    /** @type {{[key in NodeJS.Platform]: string}} */
    const defaultRuntimePaths = {
        'win32': 'C:\\ProgramData\\GameMakerStudio2\\Cache\\runtimes',
        'darwin': '/Users/Shared/GameMakerStudio2/Cache/runtimes'
    };

    /** @type {{[key in NodeJS.Platform]: string}} */
    const platformMappings = {
        'win32': 'Windows',
        'darwin': 'Mac',
        'linux': 'Linux'
    };

    this.getDefaultRuntimesPath = () => 
        defaultRuntimePaths[process.platform];

    /**
     * @param {string} [path]
     */
    this.getAllRuntimes = (path) => {
        const runtimes_path = path ?? this.getDefaultRuntimesPath();

        if (runtimes_path === undefined) {
            throw 'Platform unsupported! Please provide the runtimes path manually';
        }
        
        if (!Electron_FS.existsSync(runtimes_path)) {
            throw `Runtimes path ${runtimes_path} doesn't exist`;
        }

        return Electron_FS.readdirSync(runtimes_path);
    }

    /**
     * @param {string} runtime_path
     */
    const getIgorPath = (runtime_path) => {
        switch (process.platform) {
            case 'win32': return `${runtime_path}\\bin\\igor\\windows\\x86\\Igor.exe`;
            case 'darwin': return `${runtime_path}/bin/igor/osx/${process.arch === 'x64' ? 'x86' : 'arm64' }/Igor`;
            default: throw 'Platform unsupported, sorry!'; // TODO: allow user to specify totally custom location.
        }
    }
   
    /**
     * @param {GMLProject} project
     * @param {string} runtime_path
     * @param {GMConstructorCompileSettings} settings
     * @param {GMConstructorCompilerCommand} cmd
     */
    const runTask = async (project, runtime_path, settings, cmd) => {
        const igor_path = getIgorPath(runtime_path);

        if (!Electron_FS.existsSync(igor_path)) {
            throw `Failed to find Igor at ${igor_path}`;
        }

        let log = '';

        const proc = child_process.spawn(igor_path, [
            `/project=${project.path}`,
            `/config=${project.config}`,
            `/rp=${runtime_path}`,
            `/cache=${project.dir}/cache`,
            `/of=${project.dir}/output`,
            platformMappings[process.platform], cmd
        ]);

        // TODO: log properly
        proc.stdout.on('data', (data) => {
            log += data.toString();
            console.log(data.toString());
        });

        proc.stderr.on('data', (data) => {
            log += data.toString();
            console.log(data.toString());
        });

        await new Promise((res) => {
            proc.on('exit', () => {
                res(null);
            })
        });

    }

    /**
     * @returns {GMLProject|undefined}
     */
    this.getCurrentProject = () => {
        const proj = $gmedit['gml.Project'].current;
        
        if (proj.path === '') {
            return;
        }

        return proj;
    }

    /**
     * @param {string} runtime_path
     * @param {GMConstructorCompileSettings} settings
     * @param {GMConstructorCompilerCommand} cmd
     */
    this.compileCurrentProject = async (runtime_path, settings, cmd) => {
        const proj = this.getCurrentProject();

        if (proj === undefined) {
            throw 'Tried to run tasks on non-existent project!';
        }

        await runTask(proj, runtime_path, settings, cmd);
    }

}