
class JobQueue {
  constructor(numParallel = 1) {
    /** @type {Array.<() => Promise.<any>>} */
    this.queue = [];
    /** @type {Array.<Promise.<any>>} */
    this.currentJobs = [];

    this.numParallel = numParallel;
  };

  get isBusy() {
    return this.currentJobs.length === this.numParallel;
  };

  /**
   * @param {() => Promise.<any>} job
   * @returns {JobQueue} this
   */
  addJob(job) {
    this.queue.push(job);
    setTimeout(this._runNext.bind(this), 0);
    return this;
  };

  _runNext() {
    if (this.isBusy) {
      return;
    }

    if (this.queue.length === 0) {
      return;
    }
    
    const nextJob = this.queue.shift();
    const promise = nextJob();
    if (!promise instanceof Promise) {
      throw new Error('This job does not produce a promise!');
    }

    this.currentJobs.push(promise);
    const finalFunc = (() => {
      this.currentJobs.splice(this.currentJobs.findIndex(j => j === promise), 1);
      setTimeout(this._runNext.bind(this), 0);
    }).bind(this);

    promise.then(val => {
      finalFunc();
      return val;
    }).catch(err => {
      finalFunc();
      throw err;
    });
  };
};

module.exports =  JobQueue;
