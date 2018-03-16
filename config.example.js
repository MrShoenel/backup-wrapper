require('./docs.js');
const fs = require('fs')
, os = require('os')
, wol = require('wakeonlan')
, { LogLevel } = require('sh.log-client')
/**
 * @param {string} mac the mac-address as 77:55:33:ff:bb:aa
 * @param {number} waitAfterSecs wait amount of seconds before resolving Promise
 * @return {Promise.<void>}
 */
, wake = (mac, waitAfterSecs) => new Promise((resolve, reject) => {
    wol(mac.toUpperCase()).then(() => {
      setTimeout(() => {
      resolve(); 
      }, waitAfterSecs * 1e3);
    });
  });


/** 
 * @returns {Config}
*/
const createConf = () => {
  const myComputer = 'cc:55:44:77:a9:4c';

  return /** @type {Config} */ {
    /**
     * @type {AppConfig}
     */
    app: {
      sevenZip: "C:\\Program Files\\7-Zip\\7z.exe",
      // How many backup jobs can be run in parallel:
      parallelJobs: 2,

      logging: {
        method: 'http',
        endpoint: 'https://bla.domain.com:8080/log',
        level: LogLevel.None /* disable for now */
      }
    },
    
    /**
     * @type {Array.<BackupOptions>}
     */
    backups: [
      {
        name: 'btsync',
        enabled: false,
        mode: 'zip',
        src: 'C:\\Users\\Admin\\Documents\\btsync',
        dest: 'D:\\backup\\btsync\\%timestamp%_%date%_%time%.7z',
        intervalMinutes: 60 * 24 * 3,
        intervalErrorMinutes: 5,
        sevenZipArgs: ["-t7z", `-w${os.tmpdir()}`, "-stl", "-m0=lzma2", "-mx=9", "-md=32m", "-mhe=on", `-p${fs.readFileSync('D:\\backup\\btsync-password.txt').toString('utf-8').trim()}`],
      },

      /*
       * Example: Copy instead of pw-protected zip:
       */
      {
        name: 'btsync',
        enabled: true,
        mode: 'copy',
        src: 'C:\\Users\\Admin\\Documents\\btsync',
        dest: 'D:\\backup\\btsync',
        intervalMinutes: 60 * 24 * 3,
        intervalErrorMinutes: 5,
        sevenZipArgs: [],
        tasksBefore: ['@emptyDest']
      },


      /*
       * Example: Back up a may running VM:
       */
      {
        name: "vm-test",
        enabled: false,
        src: "C:\\Users\\Admin\\Desktop\\debian-vm",
        dest: "C:\\users\\admin\\desktop\\%jobname%_%timestamp%.7z",
        intervalMinutes: 0.25,
        intervalErrorMinutes: 0.08,
        // For compressing use e.g. ["-m0=lzma2", "-mx=5", "-md=32m"]
        // For just storing use ["-m0=Copy"]
        sevenZipArgs: ["-t7z", `-w${os.tmpdir()}`, "-stl", "-m0=Copy", "-mhe=on", "-psecretPass123", "-xr!*.binfoo"],
        tasksBefore: [
          () => wake(myComputer, 45),
          {
            allowFail: true,
            exec: "C:\\Program Files (x86)\\VMware\\VMware Workstation\\vmrun.exe",
            args: ["suspend", "C:\\Users\\Admin\\Desktop\\debian-vm\\debian-vm.vmx"]
          }
        ],
        tasksAfter: [
          {
            allowFail: false,
            exec: "C:\\Program Files (x86)\\VMware\\VMware Workstation\\vmrun.exe",
            args: ["start", "C:\\Users\\Admin\\Desktop\\debian-vm\\debian-vm.vmx"]
          }
        ]
      },

      /**
       * Example: tasks only, here: pull a repo (this machine being the backup's location)
       */
      {
        name: 'tasks-test',
        enabled: false,
        src: null,
        dest: null,
        mode: 'tasksOnly',
        intervalErrorMinutes: 5,
        intervalMinutes: 1440,
        tasksBefore: [() => new Promise((resolve, reject) => {
          const proc = require('child_process').spawn('git', ['pull'], {
            cwd: '/path/to/repo'
          }).on('exit', (code, signal) => {
            if (code === 0) {
              resolve();
            } else {
              reject();
            }
          });
        })],
        tasksAfter: [ /* It does not matter where the tasks are defined. They will be executed in order they were defined and the 'tasksBefore'-array goes first. */ ]
      }
    ]
  };
};

module.exports = createConf();
