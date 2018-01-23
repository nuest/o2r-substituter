/*
 * (C) Copyright 2017 o2r project.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
const util = require('util');
const path = require('path');
const debug = require('debug')('substituter:config');

var c = {};
c.net = {};
c.mongo = {};
c.fs = {};
c.mount = {};
var env = process.env;

c.api_version = 1;

// network & database
c.net.port = env.SUBSTITUTER_PORT || 8090;
c.mongo.location = env.SUBSTITUTER_MONGODB || 'mongodb://localhost/';
c.mongo.database = env.SUBSTITUTER_MONGODB_DATABASE || 'muncher';
c.mongo.initial_connection_attempts = 30;
c.mongo.initial_connection_max_delay = 5000;
c.mongo.initial_connection_initial_delay = 1000;

// fix mongo location if trailing slash was omitted
if (c.mongo.location[c.mongo.location.length-1] !== '/') {
  c.mongo.location += '/';
}

// fs paths
c.fs.base = env.SUBSTITUTER_BASEPATH || '/tmp/o2r/';
c.fs.compendium = path.join(c.fs.base, 'compendium');

// metadata extraction and brokering options
c.meta = {};
c.meta.base = 'metadata.substitution.base';
c.meta.overlay = 'metadata.substitution.overlay';

// for updating path in metadata
c.meta.updatePath = [
  'mainfile_candidates', //    xjiYy/data/main.Rmd
  'mainfile', //   xjiYy/data/main.Rmd
  'inputfiles', //       xjiYy/data/BerlinMit.csv
  'ercIdentifier', //      xjiYy
  'displayfile', //      /api/v1/compendium/xjiYy/data/data/erc.yml
  'codefiles'  //        xjiYy/data/main.Rmd
  ]

// metadata schema for saving
c.meta.bag = false;
c.meta.candidate = false;
c.meta.compendium = true;

// compendium configuration
c.compendium = {};
c.compendium.configFile = 'erc.yml';

// docker commands
c.docker = {};
c.docker.volume = {};
c.docker.volume.flag = "--volume ";
c.docker.volume.basePath = '$(pwd)';
c.docker.volume.containerWorkdir = '/erc';
c.docker.volume.mode = ":ro";
c.docker.mount = {};
c.docker.mount.flag = "--mount ";
c.docker.mount.basePath = '';
c.docker.mount.containerWorkdir = '/erc';
c.docker.mount.readonly = true;
c.docker.cmd = 'docker run -it --rm';
c.docker.imageNamePrefix = 'erc:';

c.id_length = 5; // length of substituted ids [0-9,a-z,A-Z]

// session secret
c.sessionsecret = env.SESSION_SECRET || 'o2r';

// filename prepend of substitution file
c.substitutionFilePrepend = 'overlay_';

// authentication levels
c.user = {};
c.user.level = {};
c.user.level.substitute = 50;

debug('CONFIGURATION:\n%s', util.inspect(c, { depth: null, colors: true }));

module.exports = c;
