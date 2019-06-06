"use strict";

const p = require("child_process");
const fs = require("fs");
const _ = require("underscore");
const defaultOptions = require("./lib/options");

const sysParams = {};

p.exec("curl -V", function(error, stdout, stderr) {
  if (error) {
    console.error("curl-process init error:", error.stack || error);
    return false;
  }
  let lines = stdout.split(/\r|\r\n|\n/);
  let l1 = lines[0].match(/curl ([\d\.]+) \((.*?)\) (.*)/i);
  sysParams.version = l1[1];
  sysParams.system = l1[2];
  sysParams.module = l1[3].split(" ").map(item => {
    let [name, version] = item.split("/");
    return { name, version };
  });
  sysParams.protocols = lines[1]
    .substr(10)
    .trim()
    .split(" ");
  sysParams.features = lines[2]
    .substr(9)
    .trim()
    .split(" ");
  defaultOptions.init(sysParams);
});

const curl = (url, options, data) => {
  options || (options = {});
  if (options.headers) {
    options.headers = _.defaults(options.headers, defaultOptions.headers);
  }
  options = _.defaults(options, defaultOptions);

  let cmd = `curl -v '${url}'`;
  let tmpFile = options.tmpPath + "/cp_" + options.tmpFileCreate();
  let outParams = { tmpFile };

  if (options.headers) {
    cmd += Object.keys(options.headers)
      .map(item => ` -H '${item}: ${options.headers[item]}'`)
      .join("");
  }
  if (data) {
    let postParam = "{}";
    if (/post/i.test(options.method)) {
      if (_.isObject(data) || _.isArray(data))
        if (
          "application/x-www-form-urlencoded" ==
            options.headers["Content-Type"] ||
          "auto" == options.headers["Content-Type"]
        ) {
          postParam = options.obj2string(data);
          options.headers["Content-Type"] = "application/x-www-form-urlencoded";
        }
    }
  }

  cmd += ` -o ${tmpFile}`;
  return new Promise((resolve, reject) => {
    p.exec(cmd, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      let std = stdout + stderr;
      outParams.request = {
        headerRaw: [],
        headers: {}
      };
      outParams.response = {
        headerRaw: [],
        headers: {},
        buffer: ""
      };
      std.split(/\r|\n|\r\n/).map(line => {
        let pre = line.substr(0, 2);
        if ("< " == pre) {
          if (line.length > 2) {
            line = line.substr(2);
            outParams.response.headerRaw.push(line);
            let match = line.match(/([^:]+): (.*)/);
            if (match) {
              outParams.response.headers[match[1]] = match[2];
            }
          }
        } else if ("> " == pre) {
          if (line.length > 2) {
            line = line.substr(2);
            outParams.request.headerRaw.push(line);
            let match = line.match(/([^:]+): (.*)/);
            if (match) {
              outParams.request.headers[match[1]] = match[2];
            }
          }
        }
      });
      outParams.status = 100;
      outParams.msg = "";
      if (outParams.response.headerRaw[0]) {
        let match = outParams.response.headerRaw[0].match(
          /(\w+)\/([\d\.]+) (\d+)(.*)/i
        );
        if (match) {
          outParams.status = match[3].trim();
          outParams.msg = match[4].trim();
        }
      }
      resolve(outParams);
    });
  })
    .then(outParams => {
      if (options.parseBody) {
        return outParams;
      } else {
        return new Promise((resolve, reject) => {
          fs.readFile(tmpFile, (error, data) => {
            if (error) {
              return reject(error);
            }
            outParams.response.buffer = data;
            resolve(outParams);
          });
        });
      }
    })
    .then(outParams => {
      if (
        options.isGzip(outParams.response.headers["Content-Encoding"]) &&
        outParams.response.buffer
      ) {
        return options.unGzip(outParams.response.buffer);
      } else {
        return outParams.response.buffer;
      }
    })
    .then(buffer => {
      outParams.response.buffer = buffer;
      if (options.isText(outParams.response.headers["Content-Type"])) {
        return outParams.response.buffer.toString();
      }
    })
    .then(buffer => {
      outParams.response.buffer = buffer;
      outParams.response.content = "";
      if (options.isJson(outParams.response.headers["Content-Type"])) {
        try {
          outParams.response.content = JSON.parse(outParams.response.buffer);
        } catch (e) {
          console.error("curl-process JSON.parse error:", e.stack || e);
        }
      } else {
        outParams.response.content = outParams.response.buffer;
      }
      return Promise.resolve(outParams);
    })
    .catch(error => {
      console.error(error);
      return Promise.reject(error);
    });
};

module.exports.info = sysParams;

/**
 * @param {string} url URL
 * @param {object} options
 * @param {object||string} data
 */
module.exports = curl;

/**
 * @param {string} filePath file path
 * @returns {Promise}
 */
module.exports.clean = filePath => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, err => {
      if (err) {
        console.error("curl-process unlink error:", err.stack || err);
        return reject(err);
      }
      resolve(true);
    });
  });
};
