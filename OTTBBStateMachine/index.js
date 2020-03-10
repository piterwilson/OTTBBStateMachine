const {
    Machine,
    State,
    actions,
    assign,
    send,
    sendParent,
    interpret,
    spawn
  } = require('xstate');

const load = 'load';
const loadWithAutoPlay = 'loadWithAutoPlay';
const play = 'play';
const seekToAlreadyBuffered = 'seekToAlreadyBuffered';
const seekToNotBuffered = 'seekToNotBuffered';
const pause = 'pause';
const completed = 'completed';
const error = 'error';
const bufferingEnd = 'bufferingEnd';
const streamInfoLoaded = 'streamInfoLoaded';
const videoAsset = {
    title: 'My Video',
    duration: 360
}

var possibleCommands = [];
  
const OTTBBVideoPlayer = Machine({
    id: 'OTTBBVideoPlayer',
    initial: 'idle',
    context: {
        videoAsset: null,
        shouldPlayWhenReady: false,
        shouldPauseWhenReady: false,
        bufferIsFull: false
    },
    strict: true,
    states: {
        idle : {
            on: {
                load: {
                    target: 'loadingStreamInfo'
                },
                loadWithAutoPlay: {
                    target: 'loadingStreamInfo',
                    actions: ['setBufferIsNotFull', 'setShouldPlayWhenReady']
                },
                play: [
                    { target: 'buffering', cond: 'canBufferFromIdle', actions: ['setShouldPlayWhenReady'] },
                    { target: 'playing', cond: 'canPlayFromIdle'}
                ]
            }
        },
        loadingStreamInfo : {
            on: {
                error: {
                    target: 'errored'
                },
                streamInfoLoaded: {
                    target: 'buffering',
                    actions: ['simulateVideoAssetLoaded']
                }
            }
        },
        readyToPlay: {
            on: {
                play: [
                    { target: 'buffering', cond: 'isBufferEmpty', actions: ['setShouldPlayWhenReady'] },
                    { target: 'playing', cond: 'isBufferFull'}
                ],
                '': [
                    { target: 'buffering', cond: 'shouldPlayWhenReady' }
                ]
            }
        },
        buffering: {
            entry: ['emitBufferingStart', 'setBufferIsNotFull'],
            exit: ['emitBufferingEnd', 'setBufferIsFull'],
            on: {
                bufferingEnd: [
                    { target: 'paused', cond: 'shouldPauseWhenReady' },
                    { target: 'playing', cond: 'shouldPlayWhenReady' },
                    { target: 'readyToPlay', cond: 'shouldNotPlayWhenReady' }
                ],
                error: {
                    target: 'errored'
                }
            }
        },
        playing: {
            entry: ['setShouldPlayWhenReady'],
            on: {
                pause: 'paused',
                completed: [
                    { target: 'idle' },
                ],
                seekToAlreadyBuffered: 'playing',
                seekToNotBuffered: 'buffering'
            } 
        },
        paused: {
            entry: ['setShouldPauseWhenReady'],
            on: {
                play: [
                    { target: 'buffering', cond: 'isBufferEmpty', actions: ['setShouldPlayWhenReady'] },
                    { target: 'playing', cond: 'isBufferFull'}
                ],
                seekToAlreadyBuffered: 'paused',
                seekToNotBuffered: 'buffering'
            }
        },
        errored: {
            on: {
                load: {
                    target: 'loadingStreamInfo',
                    actions: ['reset']
                },
                loadWithAutoPlay: {
                    target: 'loadingStreamInfo',
                    actions: ['reset', 'setBufferIsNotFull', 'setShouldPlayWhenReady']
                }
            }
        }
    }
},{
    actions: {
        emitBufferingStart: (context, event) => {
            console.log("     |     "); 
            console.log("     |     "); 
            console.log("     V     ");
            console.log('bufferingStart');
        },
        emitBufferingEnd: (context, event) => {
            console.log("     |     "); 
            console.log("     |     "); 
            console.log("     V     ");
            console.log('bufferingEnd');
        },
        reset: (context, event) => {
            console.log('reset()');
            context.shouldPlayWhenReady = false;
            context.videoAsset = undefined;
            context.bufferIsFull = false;
            context.shouldPauseWhenReady = false;
        },
        setShouldPlayWhenReady: (context, event) => {
            context.shouldPlayWhenReady = true;
        },
        setShouldPauseWhenReady: (context, event) => {
            context.shouldPauseWhenReady = true;
        },
        setBufferIsFull: (context, event) => {
            context.bufferIsFull = true;
        },
        setBufferIsNotFull: (context, event) => {
            context.bufferIsFull = false;
        },
        simulateVideoAssetLoaded: (context, event) => {
            context.videoAsset = videoAsset
          }
        },
    guards: {
        shouldPlayWhenReady: (context, event) => {
            return context.shouldPlayWhenReady
        },
        shouldPauseWhenReady: (context, event) => {
            return context.shouldPauseWhenReady
        },
        shouldNotPlayWhenReady: (context, event) => {
            return !context.shouldPlayWhenReady
        },
        isBufferFull: (context, event) => {
            return context.bufferIsFull
        },
        isBufferEmpty: (context, event) => {
            return !context.bufferIsFull
        },
        videoAssetExists: (context, event) => {
            return context.videoAsset
        },
        videoAssetDoesNotExist: (context, event) => {
            return context.videoAsset == undefined
        },
        canPlayFromIdle: (context, event) => {
            return context.videoAsset && context.bufferIsFull
        },
        canBufferFromIdle: (context, event) => {
            return context.videoAsset && !context.bufferIsFull
        }
    }
    }
);

const playerService = interpret(OTTBBVideoPlayer)
  .onTransition(state => {
      console.log("     |     "); 
      console.log("     |     "); 
      console.log("     V     ");
      console.log("/******************/")
      console.log(" " + state.value + " ");
      console.log("/******************/") 
      possibleCommands = state.nextEvents
      console.log("possible events/commands: " + state.nextEvents);
      console.log("         "); 
    })
  .start();

function prompt(question, callback) {
var stdin = process.stdin,
    stdout = process.stdout;

stdin.resume();
stdout.write(question);

stdin.once('data', function (data) {
    callback(data.toString().trim());
});
}

function simulateLoad() {
    console.log("");
    console.log("Simulate load");
    console.log("");
    console.log("load(_, autoPlay: false)")
    playerService.send(load);
    playerService.send(streamInfoLoaded);
    playerService.send(bufferingEnd);
}

function simulateLoadError() {
    console.log("");
    console.log("Simulate load error");
    console.log("");
    console.log("load(_, autoPlay: false)")
    playerService.send(load);
    playerService.send(error);
}

function simulateLoadWithAutoPlay() {
    console.log("");
    console.log("Simulate load with auto play");
    console.log("");
    console.log("load(_, autoPlay: true)")
    playerService.send(loadWithAutoPlay);
    playerService.send(streamInfoLoaded);
    playerService.send(bufferingEnd);
}

function simulateLoadThenPlay() {
    console.log("");
    console.log("Simulate load then play");
    console.log("");
    console.log("   load(_, autoPlay: false)")
    playerService.send(load);
    playerService.send(streamInfoLoaded);
    playerService.send(bufferingEnd);
    console.log("     |     "); 
    console.log("     |     "); 
    console.log("     V     ");
    console.log("   play()")
    playerService.send(play);
}

function simulateLoadThenPlayThenPause() {
    console.log("");
    console.log("Simulate load then play");
    console.log("");
    console.log("   load(_, autoPlay: false)")
    playerService.send(load);
    playerService.send(streamInfoLoaded);
    playerService.send(bufferingEnd);
    console.log("     |     "); 
    console.log("     |     "); 
    console.log("     V     ");
    console.log("   play()")
    playerService.send(play);
    console.log("     |     "); 
    console.log("     |     "); 
    console.log("     V     ");
    console.log("   pause()")
    playerService.send(pause);
}

function simulateLoadThenPlayThenComplete() {
    console.log("");
    console.log("Simulate load then play");
    console.log("");
    console.log("   load(_, autoPlay: false)")
    playerService.send(load);
    playerService.send(streamInfoLoaded);
    playerService.send(bufferingEnd);
    console.log("     |     "); 
    console.log("     |     "); 
    console.log("     V     ");
    console.log("   play()")
    playerService.send(play);
    console.log("     |     "); 
    console.log("     |     "); 
    console.log("     V     ");
    console.log("   completed")
    playerService.send(completed);
}


//simulateLoadWithAutoPlay();
//simulateLoad();
//simulateLoadError();
//simulateLoadThenPlay();
//simulateLoadThenPlayThenPause();
//simulateLoadThenPlayThenComplete()

function sendEventToStateMachine(command) {
    if (possibleCommands.includes(command)) {
        playerService.send(command);
    } else {
        console.log(command + " is not a supported event or command, please type one of : " + possibleCommands);
    }
    askPrompt();
}
function askPrompt() {
    prompt('Input event or command:\n', function (input) {
        sendEventToStateMachine(input);
    });
}
askPrompt();
