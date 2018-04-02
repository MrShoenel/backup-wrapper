/**
 * @typedef HistoryObj
 * @type {object}
 * @property {number} lastRun the timestamp (in seconds) when the entry was last successfully run
 * @property {number} lastDuration the time (in seconds) the backup took the last time
 */

/**
 * @typedef BackupTask
 * @type {object}
 * @property {boolean} allowFail - whether it is ok if this task fails or not
 * @property {string} exec - program to run
 * @property {Array.<string>} args - arguments
 */

/**
 * @typedef InternalBackupTask
 * @type {'@emptyDest'|Function.<T|Promise.<T>>} If a function, then one function's result will be passed to the next function. A function should synchronously return a value or a Promise.<any>. If the latter, the promise is awaited and its resulting value is used. The whole job fails if any of the functions fails or their promise rejects.
 */

/**
 * @typedef BackupOptions
 * @type {object}
 * @property {string} name - the name of the backup job
 * @property {boolean} enabled - whether or not this job is enabled
 * @property {'zip'|'copy'|'tasksOnly'} mode - how this backup works (copy, zip or only custom tasks defined via tasksBefore or/and tasksAfter)
 * @property {string} src - absolute path to file or folder to backup
 * @property {string} dest - absolute path to folder to store backup in
 * @property {number} intervalMinutes - amount of minutes in between backups
 * @property {number} intervalErrorMinutes - amount of minutes to wait if a backup failed before attempting it again
 * @property {Array.<string>} sevenZipArgs arguments to pass to 7z
 * @property {Function.<boolean|Promise.<boolean>>} [skipBackup] (Optional) A function that determines whether the backup can or should be skipped. The function is evaluated every time the backup is triggered. It is evaluated before any other tasks are run (i.e. 'tasksBefore'). It should return true if the backup should be skipped. This function may return a value synchronously or a Promise that resolves to a boolean value. If a non-boolean value is returned or the Promise is rejected, the backup will be aborted.
 * @property {Array.<BackupTask|InternalBackupTask>} tasksBefore list of tasks to run before backup; built-in tasks start with @, like @emptyDest will wipe the destination folder
 * @property {Array.<BackupTask|InternalBackupTask>} tasksAfter list of tasks to run after backup
 */


/**
 * @typedef AppConfig
 * @property {'parallel'|'cost'} jobQueueType determines whether to use a queue that can process jobs with a strict degree of parallelism or based on the jobs' cost. If based on cost, each backup job needs to define its cost.
 * @property {number} jobQueueProcessing for parallel queues, the amount of parallel jobs; for capability-based queues, this number represents the processing capability of the queue.
 * @property {boolean} jobQueueAllowExclusive - only applies to 'cost'-based queues and specifies whether or not they may handle jobs that require the queue's whole capability or even exceed it. In that case, by definition, the job needs to run exclusively.
 * @property {string} sevenZip
 * @property {LogConfig} logging
 * 
 * @typedef Config
 * @property {AppConfig} app
 * @property {Array.<BackupOptions>} backups
 * 
 * @typedef LogConfig
 * @type {object}
 * @property {string} method
 * @property {string} endpoint
 * @property {number} level
 */
