var fs = require('fs');
var path = require('path');
var api = require('first-listen-api');
var async = require('async');
var cheerio = require('cheerio');
var id3 = require('id3-writer');
var osTmpdir = require('os-tmpdir');
var ProgressBar = require('progress');
var ProgressStream = require('progress-stream');
var request = require('request');
var _ = require('lodash');

var apiKey = 'MDAzMzQ2MjAyMDEyMzk4MTU1MDg3ZmM3MQ010';

module.exports = function download(opts) {
  if (!opts || !opts.url) {
    throw 'Must pass the URL of an NPR First Listen';
  }
  opts.dest || (opts.dest = './');
  var startTime = Date.now();

  downloadArtwork(opts, function (artworkPath) {
    opts.artwork = artworkPath;

    downloadAlbum(opts, function () {
      var totalTime = (Date.now() - startTime) / 1000;
      console.log('Finished in ' + Math.round(totalTime) + ' seconds');
    });
  });
};

function downloadArtwork(opts, callback) {
  console.log('Downloading webpage');
  api.getAlbumArtUrl({ url: opts.url }, function (e, artworkUrl) {
    if (e) {
      console.error('Failed to download given URL');
      throw e;
    }

    var splitUrl = artworkUrl.split('/');
    var artworkPath = path.join(osTmpdir(), _.last(splitUrl));

    console.log('Downloading album artwork');
    request(artworkUrl)
      .on('end', function () { callback(artworkPath) })
      .pipe(fs.createWriteStream(artworkPath));
  })
}

function downloadAlbum(opts, callback) {
  console.log('Requesting data from NPR');
  api.getFirstListen({
    url: opts.url,
    apiKey: apiKey
  }, function (e, songs) {
    if (e) {
      console.error('NPR API request failed.');
      throw e;
    }

    function getFileName(song) {
      return twoDigits(song.track) + ' - ' + replaceSlashes(song.title);
    }

    function getFinalDest(song) {
      return path.resolve(opts.dest, getFileName(song) + '.mp3');
    }

    var tmpPrefix = Date.now() + '-';
    function getTmpDest(song) {
      return path.join(osTmpdir(), tmpPrefix + song.track + '.mp3');
    }

    var songDownloaders = songs.map(function (song) {
      var tmpSongDest = getTmpDest(song);
      var finalSongDest = getFinalDest(song);

      return function (endOfSeries) {
        async.series([
          function downloadTmpSong(finished) {
            var bar; // Can't initialize until we know size of file
            var checkProgress = ProgressStream({ time: 100 });
            checkProgress.on('progress', function (progress) {
              bar.tick(progress.delta);
            });

            console.log(' ' + getFileName(song));
            request(song.url)
              .on('response', function (res) {
                var totalLength = res.headers['content-length'];
                bar = newProgressBar(totalLength);
                checkProgress.setLength(totalLength);
              })
              .pipe(checkProgress)
              .on('end', finished)
              .pipe(fs.createWriteStream(tmpSongDest));
          },
          function (finished) {
            writeId3({
              song: song,
              dest: tmpSongDest,
              artwork: opts.artwork
            }, finished);
          },
          function moveSongFile(finished) {
            fs.rename(tmpSongDest, finalSongDest, finished);
          }
        ], endOfSeries);
      }
    });

    async.series(songDownloaders, function () {
      fs.unlink(opts.artwork, callback);
    });
  });
};

function twoDigits(val) {
  val = val.toString();
  if (val.length < 2) {
    return '0' + val;
  } else {
    return val;
  }
}

function newProgressBar(total) {
  return new ProgressBar('[:bar] :percent done, :etas left', {
    total: parseInt(total, 10),
    width: 40,
    clear: true,
    incomplete: ' '
  });
}

var NO_ADAPTERS_ERROR = 'Error: No available write adapters found';
function writeId3(opts, finished) {
  var writer = new id3.Writer();
  var song = opts.song;
  var coverImage = (opts.artwork) ? [new id3.Image(opts.artwork)] : null;

  var meta = new id3.Meta({
    track: song.track,
    title: song.title,
    artist: song.artist,
    album: song.album
  }, coverImage);

  writer
    .setFile(new id3.File(opts.dest))
    .write(meta, function (err) {
      if (err == NO_ADAPTERS_ERROR) {
        console.error('[ERROR] Ensure you have eyeD3 installed to tag mp3s');
        finished();
      } else if (err) {
        throw err;
      } else {
        finished();
      }
    });
}

function replaceSlashes(str) {
  return str.replace(/\//g, '_');
}
