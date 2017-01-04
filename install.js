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
      doNextStep(function(label, text) {
        // we're not expecting data, so nothing to process
        var data = JSON.stringify({
          buttonLabel: label,
          text: text
        });
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
    cb(nextStep.label, nextStep.text);
  });
}

var steps = [
  {
    label: 'Continue',
    text: 'Something else is going to happen now...',
    function: test
  },
  {
    label: 'Continue 2',
    text: 'Another step.',
    function: test
  },
  {
    text: 'Install has completed successfully! You can now close the page.',
    function: test
  }
];

function test(cb) {
  cb();
}
