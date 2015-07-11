var fs = require('fs');
var path = require('path');
var request = require('request');
var cheerio = require('cheerio');
var _ = require('lodash');

// TODO: figure out how to get this dynamically
var apiKey = 'MDAzMzQ2MjAyMDEyMzk4MTU1MDg3ZmM3MQ010';

module.exports = function (opts) {
  if (!opts || !opts.url) {
    throw 'Must pass the URL of an NPR First Listen';
  }
  opts.dest || (opts.dest = __dirname);

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

    var songs = audioTags.map(function (tag, i) {
      return {
        track: i + 1,
        title: $(tag).find('title')[0].children[0].data,
        url: $(tag).find('mp3[type="mp3"]')[0].children[0].data
      };
    }).filter(function (song) {
      // They have the entire album as a single .mp3 and I don't want it
      return notFullAlbumMp3(song.url);
    });

    songs.forEach(function (song) {
      console.log('Downloading', song.title);
      var fileName = twoDigits(song.track) + ' - ' + song.title;
      var out = fs.createWriteStream(path.resolve(opts.dest, fileName + '.mp3'));
      request(song.url).pipe(out);
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

function mp3UrlFromNode(node) {
  return node.children[0].data;
}

function notFullAlbumMp3(url) {
  return !_.contains(url, 'full.mp3');
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
