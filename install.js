var _ = require('underscore');
var async = require('async');
var exec = require('child_process').exec;
var finalhandler = require('finalhandler')
var http = require("http");
var open = require("open");
var serveStatic = require('serve-static');

var PORT = 5678;
var step = -1;

// set up local server
var serve = serveStatic(__dirname);
var server = http.createServer(function onRequest(req, res) {
  if(req.method == 'GET') serve(req, res, finalhandler);
});
server.listen(PORT);
open("http://localhost:" + PORT + '/installer.html');

var io = require('socket.io')(server);
io.on('connection', function(socket) {
  socket.on('next', onSocketNext);
  socket.on('disconnect', exitInstaller);
});

function exitInstaller() {
  console.log('Exiting.');
  return process.exit(0);
}

function emit(type, data) {
  io.emit(type, JSON.stringify(data));
}

function emitProgress() {
  var progress = Math.round((step/(steps.length-1))*100);
  if(step === 0) {
    progress = 0;
  }
  emit('progress', progress);
}

function onSocketNext() {
  doNextStep();
}

function doNextStep() {
  var nextStep = steps[++step];
  if(!nextStep) {
    return exitInstaller();
  }

  emit('step', {
    buttonLabel: nextStep.buttonLabel,
    title: nextStep.title,
    body: nextStep.body,
    instruction: nextStep.instruction
  });
  emitProgress();

  if(nextStep.function) {
    nextStep.function.call(this, function(error) {
      onDoneNextStep(error, nextStep);
    });
  } else {
    onDoneNextStep(null, nextStep);
  }
}

// delegate function
function onDoneNextStep(error, step) {
  if(error) {
    emit('error', error);
    emit('feedback', errorFeedback);
    console.log(error);
    return;
  }
  emit('step', step);
  if(step.feedback) emit('feedback', step.feedback);
}

/*
* The step data
*/

var errorFeedback = 'Errors occurred, and installation cannot continue. Please see above for more details.';

var steps = [
  {
    buttonLabel: 'Start',
    title: 'Install Adapt',
    body: 'This installer will set up a local copy of the Adapt authoring tool on your computer.',
    instruction: 'Click start to begin.'
  },
  {
    buttonLabel: 'Continue',
    title: 'Check',
    body: 'First, we need to check that all pre-requisites are installed and running.'
  },
  {
    buttonLabel: 'Continue',
    title: 'Check',
    feedback: 'All dependencies are installed correctly.',
    function: checkDeps
  },
  {
    buttonLabel: 'Continue',
    title: 'Download',
    body: 'Downloading the application source code from GitHub.'
  },
  {
    buttonLabel: 'Continue',
    title: 'Install',
    body: 'Installing the required node modules.'
  },
  {
    buttonLabel: 'Continue',
    title: 'Install',
    body: 'Installing the application.'
  },
  {
    buttonLabel: 'Continue',
    title: 'Build',
    body: 'Building the front-end application.'
  },
  {
    title: 'Done!',
    body: 'You now have a local copy of the authoring tool installed! To run, type node server in a command prompt.'
  }
];

/*
* Custom step functions
*/

function checkDeps(cb) {
  console.log('Checking dependencies');
  async.eachSeries([
    { name: 'git', command: 'git --version' },
    { name: 'node', command: 'node --version' },
    { name: 'mongo', command: 'mongo --version' },
    { name: 'ffmpeg', command: 'ffmpeg -version' }
  ], function(taskData, doneEach) {
    exec(taskData.command, function(error, stdout, stderr) {
      if(error || stderr) return doneEach('Valid ' + taskData.name + ' installation not found');
      var version = stdout.trim().match(/\d\d?.\d\d?.\d\d?/)[0];
      emit('info', taskData.name + ' found (' + version + ')');
      doneEach();
    });
  }, cb);
}
