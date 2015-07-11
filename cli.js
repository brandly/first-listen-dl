#!/usr/bin/env node
'use strict';

var firstListen = require('./');
var meow = require('meow');

var cli = meow({
  help: [
    'Usage',
    '  first-listen-dl <url>',
    '',
    'Example',
    '  first-listen-dl http://www.npr.org/2015/07/08/420581193/first-listen-ratatat-magnifique --path ~/Music',
    '',
    'Options',
    '  --path Where the music ends up. Defaults to current directory.',
  ].join('\n')
});

if (!cli.input[0]) {
  console.error('Please supply a URL');
  process.exit(1);
}

firstListen({
  url: cli.input[0],
  dest: cli.flags.path
});
