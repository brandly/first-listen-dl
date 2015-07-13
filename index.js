var fs = require('fs');
var path = require('path');
var async = require('async');
var cheerio = require('cheerio');
var id3 = require('id3-writer');
var ProgressBar = require('progress');
var ProgressStream = require('progress-stream');
var request = require('request');
var _ = require('lodash');

// TODO: figure out how to get this dynamically
var apiKey = 'MDAzMzQ2MjAyMDEyMzk4MTU1MDg3ZmM3MQ010';

module.exports = function (opts) {
  if (!opts || !opts.url) {
    throw 'Must pass the URL of an NPR First Listen';
  }
  opts.dest || (opts.dest = './');
  var startTime = Date.now();

  console.log('Downloading webpage');
  nprRequest({
    id: getIdFromUrl(opts.url),
    apiKey: apiKey
  }, function (e, r, body) {
    if (e) {
      console.error('NPR API request failed.');
      throw e;
    }

    console.log('Extracting MP3 information');
    var $ = cheerio.load(body);
    var audioTags = _.toArray($('audio'));

    var albumTitle = $('audio[type="primary"] title')[0].children[0].data;
    var artistName = getArtistFromCDATA($('story title')[0].children[0].data);

    function getSongFromTag(tag, i) {
      return {
        track: i + 1,
        title: $(tag).find('title')[0].children[0].data,
        artist: artistName,
        album: albumTitle,
        url: $(tag).find('mp3[type="mp3"]')[0].children[0].data
      };
    }

    function getFileName(song) {
      return twoDigits(song.track) + ' - ' + replaceSlashes(song.title);
    }

    function getFinalDest(song) {
      return path.resolve(opts.dest, getFileName(song) + '.mp3');
    }

    var tmpPrefix = startTime + '-';
    function getTmpDest(song) {
      return path.join('/tmp', tmpPrefix + song.track + '.mp3');
    }

    // Last tag is the entire album as a single .mp3 and I don't want it
    var songs = audioTags.map(getSongFromTag).slice(0, -1);

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
              dest: tmpSongDest
            }, finished);
          },
          function moveSongFile(finished) {
            fs.rename(tmpSongDest, finalSongDest, finished);
          }
        ], endOfSeries);
      }
    });

    async.series(songDownloaders, function () {
      var totalTime = (Date.now() - startTime) / 1000;
      console.log('Finished in ' + Math.round(totalTime) + ' seconds');
    });
  });
};

function nprRequest(opts, callback) {
  request({
    url: 'http://api.npr.org/query',
    method: 'GET',
    qs: {
      id: opts.id,
      fields: 'titles,audio,show',
      sort: 'assigned',
      apiKey: opts.apiKey
    }
  }, callback);
}

function getIdFromUrl(url) {
  var withoutQueryString = url.split('?')[0];
  // http://www.npr.org/2015/07/08/420581193/first-listen-ratatat-magnifique
  var splits = withoutQueryString.split('/');
  return splits[splits.length - 2];
}

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

function getArtistFromCDATA(data) {
  // e.g. <![CDATA[ First Listen: Ratatat, 'Magnifique' ]]>
  var withoutLeadingChars = data.split('First Listen: ')[1];
  return withoutLeadingChars.split(", '")[0];
}

var NO_ADAPTERS_ERROR = 'Error: No available write adapters found';
function writeId3(opts, finished) {
  var writer = new id3.Writer();
  var song = opts.song;

  var meta = new id3.Meta({
    track: song.track,
    title: song.title,
    artist: song.artist,
    album: song.album
  });

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
