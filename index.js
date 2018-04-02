require('./docs.js');

const fs = require('fs')
, cp = require('child_process')
, historyFile = './history.json'
, Backup = require('./Backup')
, { Job, JobQueue} = require('./JobQueue')
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

const queue = new JobQueue(conf.app.parallelJobs);

const logTrans = new Transporter({ method: {
  type: conf.app.logging.method,
  endpoint: conf.app.logging.endpoint
} });
logTrans.transport({});


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

        return backup.run().then(() => {
          setTimeout(() => createJob(+new Date, backup.intervalMSecs), 0);

          const endBackup = +new Date;
          const duration = endBackup - startBackup;
          const succMsg = `Finished job "${backup.name}" in ${Math.round(duration / 1e3)} seconds.`;

          history[backup.name] = { lastRun: endBackup, lastDuration: duration };
          saveHistory();
          console.info(succMsg);
          logger.logInfo(succMsg);
        }).catch(err => {
          setTimeout(() => createJob(+new Date, backup.intervalErrorMSecs), 0);

          const errMsg = `Job ${backup.name} failed, restarting in ${Math.round(backup.intervalErrorMSecs / 1e3)} seconds.`;

          console.error(err);
          console.info(errMsg);
          logger.logError(errMsg, err);
        });
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