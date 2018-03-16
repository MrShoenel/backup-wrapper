require('./docs');

const cp = require('child_process')
, fs = require('fs')
, fsX = require('fs-extra')
, path = require('path')
, copy = require('recursive-copy');



class Backup {
  /**
   * @param {String} sevenZip path to 7z
   * @param {BackupOptions} options 
   */
  constructor(sevenZip, options) {
    this.sevenZip = sevenZip;
    this.options = options;
    this.name = options.name;
    this.intervalMSecs = options.intervalMinutes * 60 * 1e3;
    this.intervalErrorMSecs = options.intervalErrorMinutes * 60 * 1e3;
  };

  get destinationFileName() {
    const pad = num => `${num < 10 ? '0' : ''}${num}`,
      now = new Date;

    return path.resolve(this.options.dest
      .replace('%jobname%', this.name)
      .replace('%timestamp%', `${((+now) / 1e3).toFixed(0)}`))
      .replace('%date%', `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`)
      .replace('%time%', `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`);
  };

  /**
   * 
   * @param {BackupTask|InternalBackupTask} task
   * @param {any} prevResult the result (if any) from the task that run previously. This is only passed to InternalBackupTasks that are of kind function.
   * @returns {Promise.<any>}
   */
  _mapInternalTask(task, prevResult) {
    if (task === '@emptyDest') {
      return fsX.emptyDir(this.options.dest);
    } else if (task instanceof Function) {
      return new Promise((resolve, reject) => {
        try {
          const result = task(prevResult);
          if (result instanceof Promise) {
            result.then(resolve).catch(reject);
          } else {
            resolve(result);
          }
        } catch (e) {
          reject(e);
        }
      });
    } else if (Array.isArray(task)) {
      return Backup.runProcess(task.exec, task.args);
    }
    
    throw new Error(`The task "${JSON.stringify(task)}" is not supported.`);
  };

  _runTasksBefore() {
    return this._runTasks(this.options.tasksBefore);
  };

  _runTasksAfter() {
    return this._runTasks(this.options.tasksAfter);
  };

  /**
   * @param {Array.<BackupTask>} tasks
   * @returns {Promise.<void>}
   */
  _runTasks(tasks) {
    const tasksToRun = (tasks || []).slice(0);

    return new Promise((resolve, reject) => {
      const runFirstTask = (prevResult = void 0) => {
        if (tasksToRun.length === 0) {
          resolve();
          return;
        }
        
        this._mapInternalTask(tasksToRun.shift(), prevResult).then(result => {
          runFirstTask(result);
        }).catch(err => {
          if (task.allowFail) {
            resolve();
          } else {
            reject(err);
          }
        });
      };

      runFirstTask();
    });
  };

  /**
   * 
   * @param {string} executable 
   * @param {Array.<string>} args 
   * @returns {Promise.<Array.<string>>} array of strings: error/signal-code, stdout, stderr of the process
   */
  static runProcess(executable, args) {
    return new Promise((resolve, reject) => {
      const shutdownFunc = (() => {
        let calledAlready = false;
  
        /**
         * @param {boolean} faulted
         * @param {Array.<string>} data
         */
        return (faulted, data) => {
          if (!calledAlready) {
            calledAlready = true;
            faulted ? reject(data) : resolve(data);
          }
        };
      })();
  
      const stdOut = [], stdErr = [];
      const proc = cp.spawn(executable, args)
        .once('error', err =>
          shutdownFunc(true, [err, stdOut.join(''), stdErr.join('')]))
        .once('exit', (code, sig) =>
          shutdownFunc(code !== 0, [`${sig}-${code}`, stdOut.join(''), stdErr.join('')]));
  
      proc.stdout.on('data', chunk => stdOut.push(chunk.toString()));
      proc.stderr.on('data', chunk => stdErr.push(chunk.toString()));
    });
  };

  /**
   * 
   * @returns {Promise.<void>}
   */
  run() {
    return this._runTasksBefore().then(_ => {
      let backupPromise = null;

      if (this.options.mode === 'zip') {
        backupPromise = Backup.runProcess(this.sevenZip, ['a'].concat(this.options.sevenZipArgs.concat([
          this.destinationFileName, this.options.src]))).catch(err => {
            fs.exists(this.destinationFileName, exists => {
              fs.unlink(this.destinationFileName, _ => { });
            });
            throw err;
          });
      } else if (this.options.mode === 'copy') {
        backupPromise = copy(this.options.src, this.destinationFileName, {
          overwrite: true,
          expand: true,
          dot: true,
          junk: true
        });
      } else if (this.options.mode === 'tasksOnly') {
        backupPromise = Promise.resolve();
      } else {
        backupPromise = Promise.reject(`The mode "${this.options.mode}" is not supported.`);
      }
      
      return backupPromise.then(_ => {
        return this._runTasksAfter();
      });
    });
  };
};

module.exports = Backup;
