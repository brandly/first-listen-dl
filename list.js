var api = require('first-listen-api');

module.exports = function list(opts) {
  api.getArchive(opts, function (err, archive) {
    archive.filter(isFirstListen).filter(isStreaming).forEach(function (item) {
      console.log(item.album + ' by ' + item.artist);
      console.log('  ' + item.url + '\n');
    });
  });
};

function isFirstListen(item) {
  return item.type === 'first-listen';
}

function isStreaming(item) {
  return item.streaming === true;
}
