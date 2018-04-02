

/**
 * @template T
 */
class Job {
  /**
   * @template T
   * @param {() => Promise.<T>} promiseProducer 
   */
  constructor(promiseProducer) {
    this._promiseProducer = promiseProducer;
    this._isDone = false;
    this._hasFailed = false;
    /** @type {T} */
    this._result = void 0;
    this._deferred = defer();
  };

  get isDone() {
    return this._isDone;
  };

  get hasFailed() {
    return this._hasFailed;
  };

  /**
   * A promise that can be used to await this Job's final state.
   * If resolved, will resolve with this Job's result. The promise
   * returned by run() should only be used by the queue.
   * 
   * @template T
   * @returns {Promise.<T>}
   */
  get donePromise() {
    return this._deferred.promise;
  };

  /**
   * @template T
   * @returns {T}
   */
  get result() {
    if (!this.isDone) {
      throw new Error(`This job is not yet done or has failed.`);
    }
    return this._result;
  };

  /**
   * @template T
   * @returns {Promise.<T>} the Promise that will resolve with the
   * job's result.
   */
  async run() {
    try {
      this._result = await this._promiseProducer();
      this._isDone = true;
      this._hasFailed = false;
      this._deferred.resolve(this.result);
      return this.result;
    } catch (e) {
      this._isDone = false;
      this._hasFailed = true;
      this._deferred.reject(e);
      throw e;
    }
  };
};
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
