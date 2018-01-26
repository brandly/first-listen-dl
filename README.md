# first-listen-dl

> Download mp3s from NPR First Listen

![terrible gif](http://i.imgur.com/5YCCzEF.gif)

i made this because the NPR flash player thing is troublesome. they have it open in a new, small window, and then i lose it

## :warning: :skull: DEPRECATED

this no longer works since the underlying [`first-listen-api`](https://github.com/brandly/first-listen-api#warning-skull-deprecated) has been deprecated. fixing that repo should bring this one back from the dead.

### usage

you need eyeD3 installed on your system, in order to properly tag the mp3s with track info

```shell
# Mac
$ brew install eyeD3

# Linux
$ sudo apt-get --assume-yes install eyeD3
```

```shell
$ npm install -g first-listen-dl
$ first-listen-dl http://www.npr.org/2015/07/08/420581193/first-listen-ratatat-magnifique
$ first-listen-dl --help
```

note: this'll only work for music _currently_ streaming on first listen. you snooze, you lose

### disclaimer

i'm not trying to encourage piracy or anything. support art. buy music. go to shows.

if you're NPR and you're mad, get in touch, and i'll get rid of this
