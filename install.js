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
  switch(req.method) {
    case 'GET':
      serve(req, res, finalhandler);
      break;
    case 'POST':
      doNextStep(function(step) {
        // we're not expecting data, so nothing to process
        var data = JSON.stringify(_.omit(step, 'function'));
        res.writeHead(200, { 'Content-Length': data.length });
        res.end(data);
      });
      break;
  }
});
server.listen(PORT);
open("http://localhost:" + PORT + '/installer.html');

function doNextStep(cb) {
  var nextStep = steps[++step];
  nextStep.function.call(this, function() {
    cb(nextStep);
  });
}

var steps = [
  {
    label: 'Continue',
    title: 'Prerequisites',
    text: 'Checking all dependencies are installed.',
    function: checkDeps
  },
  {
    label: 'Continue',
    title: 'Step 2',
    text: 'Another step.',
    function: test
  },
  {
    title: 'Install complete',
    text: 'Install has completed successfully! You can now close the page.',
    function: test
  }
];

function test(cb) {
  cb();
}

function checkDeps(cb) {
  var data = [];
  async.eachSeries([
    'git --version',
    'node --version',
    'mongo --version',
    'ffmpeg -version'
  ], function(task, doneEach) {
    exec(task, function(error, stdout, stderr) {
      if(error) return doneEach(error)
      if(stderr) return doneEach(stderr);
      var version = stdout.trim().match(/\d\d?.\d\d?.\d\d?/)[0];
      data.push(version);
      doneEach();
    });
  }, function() {
    console.log('done all', data);
    cb();
  });
}
