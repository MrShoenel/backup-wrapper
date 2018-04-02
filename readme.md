# backup-wrapper
This is a tiny utility for runnung generic backup jobs. It is quite self-documenting, so please go ahead and read the `config.example.js` file to create your own definition of jobs.

This wrapper comes with built-in support for simple copy- and zipping-jobs. It also supports wake-on-lan and backups that are defined by tasks, where each task can be as simple as one or more `Promises` that are executed in serie.

Each job runs in its own defined interval and you may run multiple jobs in parallel. This tool also supports external logging through [https://github.com/MrShoenel/js-log-client](https://github.com/MrShoenel/js-log-client).

There is some fault tolerance built in, so that a failed job is retried after a defined interval.

## Build Status
`Master`-branch: [![Build Status](https://api.travis-ci.org/MrShoenel/backup-wrapper.svg?branch=master)](https://travis-ci.org/MrShoenel/backup-wrapper)
