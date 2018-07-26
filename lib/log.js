const tc = require('turbocolor');

const levels = [
    'Debug',
    'Info',
    'Warning',
    'ERROR',
    'CRITICAL'
]

const names = [
    'debug',
    'info',
    'warn',
    'error',
    'crit'
]

const colours = [
    tc.cyan,
    tc.blue,
    tc.yellow,
    tc.red,
    tc.magenta
]

const _log = (lvl, s) => {
    console.log(`[${colours[lvl](levels[lvl])}] ${s}`)
}

let ex = {};

for (let i = 0; i < levels.length; i++) {
    ex[names[i]] = s => _log(i, s)
}

module.exports = ex;