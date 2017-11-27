/**
 *  © olback 2017
 *      BAR
 */

// Imports
const vscode = require('vscode');
const exec = require('child_process').exec;
const fs = require('fs');

let config;
let initialized = 0;
let statusbar = 0;
let resetConfig_val = 0;
let runAfterBuild = false;
let new_build_command;
let new_run_command;
const statusBarItems = [];
const configPath = vscode.workspace.rootPath + "/.vscode/bar.conf.json";
let output = vscode.window.createOutputChannel('Bar');

function addStatusBarItem(str, cmd) {
    statusBarItems.push(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left));
    statusBarItems[statusBarItems.length-1].text = str;
    if(cmd) { statusBarItems[statusBarItems.length-1].command = cmd; }
    statusBarItems[statusBarItems.length-1].show();
}

function addStatusBar() {
    addStatusBarItem("|");
    addStatusBarItem("Build", "extension.build");
    addStatusBarItem("► Run", "extension.run");
    addStatusBarItem("Build and run", "extension.bar");
    addStatusBarItem("|");
}

function newConfigBuild() {
    if(resetConfig_val == 0) {
        vscode.window.showInformationMessage('Add Bar config?', 'Yes')
            .then(selection => {
            if(selection == "Yes") {
                vscode.window.showInputBox({prompt: 'Build command. Example: "make build"', ignoreFocusOut: true})
                .then(val => { new_build_command = val; newConfigRun(); });
            }
        });
    } else {
        vscode.window.showInputBox({prompt: 'Build command. Example: "make build"', ignoreFocusOut: true})
        .then(val => { new_build_command = val; newConfigRun(); });
    }
}

function newConfigRun() {
    vscode.window.showInputBox({prompt: "Run command. Example: \"./your-executable-file\"", ignoreFocusOut: true})
        .then(val => { new_run_command = val; writeConfig(); });
}

function writeConfig() {
    console.log('Creating new config: ', configPath);
    if(!fs.existsSync(vscode.workspace.rootPath + '/.vscode')) {
        fs.mkdirSync(vscode.workspace.rootPath + '/.vscode');
    }

    let newConfig = {}
    newConfig.commands = {}
    newConfig.commands.build = new_build_command;
    newConfig.commands.run = new_run_command;

    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 4));
    readConfig();
    vscode.window.showInformationMessage('Bar done! Saved settings to ' + configPath);
}

function readConfig() {
    if(fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        if(statusbar == 0) {
            addStatusBar();
            statusbar = 1;
        }
    } else {
        newConfigBuild();
    }
}

function resetConfig() {
    vscode.window.showWarningMessage('Reset Bar config?', 'Yes').then(selection => {
      if(selection == "Yes") {
        if(fs.existsSync(configPath)) {
            fs.unlinkSync(configPath, (err) => {
                if(err) return console.log(err);
                console.log("Removed " + configPath);
            });
            initialized = 0;
            resetConfig_val = 1;
            init();
        }
    }
    });
}

function init() {
    if(initialized == 0) {
        readConfig();
    }
    initialized = 1;
}

function build() {
    //vscode.window.showInformationMessage('Building project...');
    let ls = exec(config.commands.build, {cwd: vscode.workspace.rootPath, maxBuffer: 2048000});

    ls.on('close', (code) => {
        //console.log(`child process exited with code ${code}`);
        if(code == 0) {
            vscode.window.showInformationMessage('Build complete.');
            //output.hide(vscode.ViewColumn.Two);
            if(runAfterBuild) {
                runAfterBuild = false; // reset 
                run(); // run
            }
        } else {
            vscode.window.showErrorMessage('Build failed. Check Bar Output.');
        }
    });
    ls.stderr.on('data', (data) => {
        //console.log(`stderr: ${data}`);
        output.show(vscode.ViewColumn.Two);
        output.appendLine(data);
    });
}

function run() {
    vscode.window.showInformationMessage('Running project...');
    exec(config.commands.run, {cwd: vscode.workspace.rootPath, maxBuffer: 2048000});
}

// this method is called when your extension is executed
function activate(context) {

    console.log('bar is active!');

    // Init
    let disposable = vscode.commands.registerCommand('extension.init', () => {
        init();
    });
    context.subscriptions.push(disposable);

    // Build
    disposable = vscode.commands.registerCommand('extension.build', () => {
        build();
    });
    context.subscriptions.push(disposable);

    // Run
    disposable = vscode.commands.registerCommand('extension.run', () => {
        run();
    });
    context.subscriptions.push(disposable);

    // Build and run
    disposable = vscode.commands.registerCommand('extension.bar', () => {
        //vscode.window.showInformationMessage('Started and run whatever');
        runAfterBuild = true;
        build();
    });
    context.subscriptions.push(disposable);

    // Reset config
    disposable = vscode.commands.registerCommand('extension.reset', () => {
        resetConfig();
    });
    context.subscriptions.push(disposable);

    init();

}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
    //console.log('bar unloaded');
}
exports.deactivate = deactivate;
