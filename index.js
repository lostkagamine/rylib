const WebSocket = require('ws');
const sa = require('superagent');
const log = require('./lib/log.js');
const util = require('util');
const config = require('./config.json');
const token = config.token;

const blacklisted = [
    'TYPING_START',
    'PRESENCE_UPDATE',
    'TYPING_STOP',
    'GUILD_CREATE',
    'MESSAGE_CREATE',
    'MESSAGE_UPDATE',
    'MESSAGE_REACTION_ADD',
    'MESSAGE_DELETE',
    'READY',
    'GUILD_MEMBER_UPDATE',
    'VOICE_STATE_UPDATE'
]

const API_ROOT = 'https://discordapp.com/api/v6/'

const get = async (endpoint, headers={}, bodyOnly=true) => {
    let url = API_ROOT+endpoint;
    headers.Authorization = `Bot ${token}`
    let res = await sa.get(url).set(headers).catch(e => {
        throw e;
    });
    if (bodyOnly) return res.body;
    else return res;
}

const post = async (endpoint, data, headers={}) => {
    headers.Authorization = `Bot ${token}`
    return await sa.post(API_ROOT+endpoint).send(data).set(headers).catch(e => {
        throw e;
    })
}

const createMessage = async (channel, msg) => {
    post(`channels/${channel}/messages`, typeof msg === 'string' ? {content: msg} : msg)
}

async function run() {
    log.debug('tryin to get ws url');
    let weebsocket = await get('gateway').catch(e => {
        log.crit('couldnt get ws url: '+e);
        process.exit(1);
    }) // gateway endpoint
    let wsurl = weebsocket.url;
    log.debug('got url: '+wsurl);
    log.debug('attemptin to connect to that websocket')
    const sock = new WebSocket(wsurl);
    const send = s => {
        sock.send(JSON.stringify(s))
    }
    sock.onclose = m => {
        log.crit('oops we got dc\'d: '+ util.inspect(JSON.parse(m.data)))
        process.exit(1);
    }
    let sequence;
    let hbtimeout;
    sock.onmessage = m => {
        let data = JSON.parse(m.data);
        let print = false;
        sequence = data.s; // follow the sequence !!!
        d = data.d;
        if (data.op === 10) {
            log.debug('obtained an HELLO, setting up...!')
            log.debug('the heartbeat interval is '+data.d.heartbeat_interval)
            setInterval(() => {
                log.debug('sending heartbeat');
                send({
                    op: 1,
                    d: sequence
                })
                hbtimeout = setTimeout(() => {
                    log.crit('hey, the gateway didnt respond in time! it\'s probably dead so i\'ll dc, bye');
                    sock.close(2000); // hey, they just said non-2000
                }, 5000)
            }, data.d.heartbeat_interval)
            log.debug('sending IDENTIFY...!');
            send({
                op: 2,
                d: {
                    token: token,
                    properties: {
                        $os: 'windows',
                        $browser: 'rylib',
                        $device: 'rylib'
                    },
                    compress: false,
                    large_threshold: 250,
                    presence: {
                        game: {
                            name: 'with rylib',
                            type: 0
                        },
                        status: 'online',
                        since: new Date().valueOf(),
                        afk: false
                    }
                }
            })
        } else if (data.op === 11) {
            log.debug('heartbeat acknowledged, all good');
            clearTimeout(hbtimeout);
        } else if (data.op === 1) {
            log.debug('hey the gw wants us to heartbeat');
            send({
                op: 1,
                d: sequence
            })
        } else if (data.op === 0) {
            if (data.t === 'READY') {
                log.debug(`WE READY BOIS, logged in as ${d.user.username}#${d.user.discriminator}`);
            }

            if (data.t === 'MESSAGE_CREATE') {
                if (d.content === '--hello!') {
                    createMessage(d.channel_id, 'hello, world!')
                } else if (d.content === '--embedtest') {
                    createMessage(d.channel_id, {
                        embed: {
                            title: 'Hello, world!',
                            description: 'Hi from rylib.'
                        }
                    })
                }
            }

            if (blacklisted.includes(data.t)) {
                return;
            } else {
                print = true;
            }
        } else {
            print = true;
        }
        if (print) log.debug('got msg: '+ util.inspect(data) || 'a');
    }
    sock.onopen = () => {
        log.debug('dank, we\'re connected')
    }
}

run();