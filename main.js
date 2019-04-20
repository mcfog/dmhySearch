#!/usr/bin/env node

const cheerio = require('cheerio');
const _ = require('lodash');
const Promise = require('bluebird');
const request = require('request');
const FileCookieStore = require('tough-cookie-filestore');

const jar = request.jar(new FileCookieStore('cookies.json'));
const requestP = Promise.promisify(request.defaults({
  jar: jar,
  timeout: 5000
}));
const word = process.argv[2];

if (!word || !word.length) {
  console.log('empty term');
  process.exit(-1);
}

search(word).catch(_=>console.error(_));

function search(term) {
  return req(`/topics/list?keyword=${encodeURIComponent(term)}`)
    .then($=>
      $('#topic_list tr').map((i,el)=>{
        const $link = $('td.title>a', el);
        if(!$link.length) return null;
        return {
          title: $link.text().trim(),
          link: $link.attr('href')
        };
      }).get()
    )
    .then(seeds=>Promise.all(seeds.slice(0,30).map(detail)))
    .then(_=>console.log(_.join("\n")))
}

function detail(seed) {
  return req(seed.link)
    .then($=>
        $('#magnet2').attr('href')
    )
}

function req(path) {
  const origin = 'https://share.dmhy.org';
  return request(path)
    .then(res=>cheerio.load(res.body));

    function request(path) {
      return requestP(origin + path)
        .then(res => {
          if(res.headers.refresh) {
            const match = res.headers.refresh.match(/(\d+);URL=(.+)/);
            return sleep(match[1] * 1000).then(_=>request(match[2])).then(_=>request(path));
          }

          // console.log(res);
          if(res.statusCode > 399) {
            throw {
              status: res.statusCode,
              headers: res.headers,
              path: path,
              body: res.body,
            }
          }

          return res;
        });
    }
}

function sleep(ms) {
  return new Promise((resolve)=>setTimeout(resolve, ms));
}
