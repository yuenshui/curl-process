"use strict";

const zlib = require("zlib");
const packageConfig = require("../package.json");

const letters = "abcdefghijklmnopqrstuvwxyz0123456789";
const tmpName = (length = 20) => {
  let result = "";
  while (length > 0) {
    length--;
    result += letters[Math.floor(Math.random() * letters.length)];
  }
  return result;
};
const mimeIsText = contentType => {
  return /xml|html|text|json/i.test(contentType);
};
const mimeIsJson = contentType => {
  return /json/i.test(contentType);
};
const isGzip = contentEncoding => {
  return /gzip/i.test(contentEncoding);
};
const unGzip = buff => {
  return new Promise((resolve, reject) => {
    zlib.unzip(buff, function(err, buffer) {
      if (err) {
        console.error("unzip gzip error: ", err);
        return reject(err);
      }
      resolve(buffer);
    });
  });
};

const obj2string = obj => {
  return "";
};
const obj2json = obj => {
  return JSON.stringify(obj);
};

module.exports = {
  method: "GET",
  tmpPath: "/tmp",
  tmpFileCreate: tmpName,
  parseBody: false,
  isText: mimeIsText,
  isJson: mimeIsJson,
  isGzip: isGzip,
  unGzip: unGzip,
  obj2string: obj2string,
  obj2json: obj2json,
  headers: {
    "Content-Type": "auto", // application/x-www-form-urlencoded multipart/form-data; boundary=----xxxx
    "User-Agent": `${packageConfig.name}/${packageConfig.version}`
  }
};

module.exports.init = sysParams => {
  console.log("options init");
  module.exports.headers["User-Agent"] += `(${sysParams.system}) curl/${
    sysParams.version
  }`;
};
