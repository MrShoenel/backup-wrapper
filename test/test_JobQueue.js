const { assert, expect } = require('chai')
, { deferMocha, timeout } = require('../tools/Defer')
, { Job, JobQueue, symbolRun, symbolDone, symbolFailed } = require('../lib/JobQueue');


describe('JobQueue', () => {
  it('should behave as a 1-capacity serial fifo-queue if not used parallel', async function() {
    this.timeout(15000);
    const [returnPromise, done] = deferMocha();
    let firstJobFinished = false, secondJobStarted = false;

    const q = new JobQueue(1);
    assert.isTrue(!q.isBusy && !q.isWorking, 'The queue should not be busy or working.');
    const job = new Job(() => new Promise((resolve, reject) => {
      setTimeout(resolve, 250);
    }));
    job.on(symbolDone, _ => {
      firstJobFinished = true;
      assert.isTrue(!secondJobStarted, 'The second job should not have been started yet.');
    });

    q.addJob(job);
    await timeout(50);
    // The Job should have been started in the meantime..
    assert.isTrue(q.isBusy && q.isWorking, 'The queue should be busy and working here.');

    const secondJob = new Job(() => new Promise((resolve, reject) => {
      setTimeout(resolve, 250);
    }));
    secondJob.on(symbolRun, () => secondJobStarted = true);
    
    q.addJob(secondJob);
    await timeout(50);
    assert.isTrue(!firstJobFinished && !secondJobStarted,
      'The first Job should not be finished and the second must not have started');
    
    secondJob.donePromise.then(_ => {
      done();
    }).catch(done);

    return returnPromise;
  });
});
