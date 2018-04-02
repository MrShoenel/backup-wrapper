require('./docs.js');

const fs = require('fs')
, cp = require('child_process')
, historyFile = './history.json'
, Backup = require('./Backup')
, { Job, JobQueue} = require('./JobQueue')
, { JobWithCost, JobQueueCapabilities } = require('./JobQueueCapabilities')
, { LogLevel, BaseLogger, Transporter } = require('sh.log-client');


if (!fs.existsSync(historyFile)) {
  fs.writeFileSync(historyFile, JSON.stringify({}));
}
/** @type {Config} */
const conf = require('./config.js');
/** @type {Object.<string, HistoryObj>} */
const history = JSON.parse(fs.readFileSync(historyFile));


const saveHistory = () => {
  fs.writeFileSync(historyFile, JSON.stringify(history));
};

const queue = conf.app.jobQueueType === 'parallel' ?
  new JobQueue(conf.app.jobQueueProcessing) :
  new JobQueueCapabilities(conf.app.jobQueueProcessing, conf.app.jobQueueAllowExclusive);

const logTrans = new Transporter({ method: {
  type: conf.app.logging.method,
  endpoint: conf.app.logging.endpoint
} });


conf.backups.forEach(backupOption => {
  if (!backupOption.enabled) {
    return; // Do not create a Backup for this option at all
  }

  const backup = new Backup(conf.app.sevenZip, backupOption);
  const logger = new BaseLogger(logTrans, `Backup-job: "${backup.name}"`, conf.app.logging.level);

  const createJob = (lastRun, intervalMSecs) => {
    const now = +new Date, diff = now - intervalMSecs;
    const jobAdder = () => {
      queue.addJob(() => {
        const startBackup = +new Date;

        const jobPromiseFn = () => backup.run().then(() => {
          setTimeout(() => createJob(+new Date, backup.intervalMSecs), 0);

          const endBackup = +new Date;
          const duration = endBackup - startBackup;
          const succMsg = `Finished job "${backup.name}" in ${Math.round(duration / 1e3)} seconds.`;

          history[backup.name] = { lastRun: endBackup, lastDuration: duration };
          saveHistory();
          logger.logInfo(succMsg);
        }).catch(err => {
          setTimeout(() => createJob(+new Date, backup.intervalErrorMSecs), 0);

          const errMsg = `Job ${backup.name} failed, restarting in ${Math.round(backup.intervalErrorMSecs / 1e3)} seconds.`;

          logger.logError(errMsg, err);
        });

        if (queue instanceof JobQueueCapabilities) {
          if (!backup.options.hasOwnProperty('cost')
            || isNaN(backup.options.cost)
            || !Number.isFinite(backup.options.cost))
          {
            throw new Error(`The job "${backup.name}" does not define a cost.`);
          }
          return new JobWithCost(jobPromiseFn, backup.options.cost);
        } else {
          return new Job(jobPromiseFn);
        }
      });
    };

    if (lastRun < diff) {
      // enqueue job
      jobAdder();
    } else {
      // enqueue for later:
      const timeLeft = intervalMSecs - (now - lastRun);
      setTimeout(() => {
        jobAdder();
      }, timeLeft);
    }
  };

  createJob(history.hasOwnProperty(backup.name) ? history[backup.name].lastRun : 0,
    backup.intervalMSecs);
});