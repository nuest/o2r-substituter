/*
 * (C) Copyright 2017 o2r project
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

/* eslint-env mocha */
const assert = require('chai').assert;
const request = require('request');
const config = require('../config/config');
const path = require('path');
const yaml = require('js-yaml');
const sleep = require('sleep');

require("./setup")
const cookie_o2r = 's:C0LIrsxGtHOGHld8Nv2jedjL4evGgEHo.GMsWD5Vveq0vBt7/4rGeoH5Xx7Dd2pgZR9DvhKCyDTY';
const uploadCompendium = require('./util').uploadCompendium;
const createSubstitutionPostRequest = require('./util').createSubstitutionPostRequest;
const publishCandidate = require('./util').publishCandidate;


describe('Substitution of data with compendium as base and workspace as overlay', function () {
    var base_id;
    var overlay_id;
    var metadataHandling = "keepBase";

    before(function (done) {
        let req_erc_base02 = uploadCompendium('./test/compendium/base', cookie_o2r);
        let req_workspace_overlay01 = uploadCompendium('./test/workspace/overlay01', cookie_o2r, 'workspace');
        this.timeout(60000);

        // first upload
        request(req_erc_base02, (err, res, body) => {
            assert.ifError(err);
            base_id = JSON.parse(body).id;

            publishCandidate(base_id, cookie_o2r, (err) => {
                assert.ifError(err);

                // second upload
                request(req_workspace_overlay01, (err, res, body) => {
                    assert.ifError(err);
                    overlay_id = JSON.parse(body).id;

                    publishCandidate(overlay_id, cookie_o2r, (err) => {
                        assert.ifError(err);
                        done();
                    });
                });
            });
        });
    });

    describe('POST /api/v1/substitution', () => {
        var substituted_id;
        let base_file = "data/BerlinMit.csv";
        let overlay_file = "files/BerlinOhne.csv";

        it('should respond with HTTP 200 OK and valid JSON', (done) => {

            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, metadataHandling, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 200);
                    assert.isObject(body);
                    done();
                });
            });
        });

        it('should respond with valid ID (and now publish it)', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, metadataHandling, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.property(body, 'id');
                    assert.isString(body.id);
                    substituted_id = body.id;

                    publishCandidate(substituted_id, cookie_o2r, (err) => {
                        assert.ifError(err);
                        done();
                    });
                });
            });
        }).timeout(20000);

        it('should respond with substituted property', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response, 'substituted');
                assert.propertyVal(response, 'substituted', true);
                done();
            });
        });

        it('should respond with metadata for base and overlay ID', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response.metadata, 'substitution');
                assert.property(response.metadata.substitution, 'base');
                assert.property(response.metadata.substitution, 'overlay');
                assert.propertyVal(response.metadata.substitution, 'base', base_id);
                assert.propertyVal(response.metadata.substitution, 'overlay', overlay_id);
                done();
            });
        });

        it('should respond with metadata for base and overlay filenames, and new filename at root directory', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response.metadata.substitution, 'substitutionFiles');
                assert.equal(response.metadata.substitution.substitutionFiles.length, 1);
                assert.property(response.metadata.substitution.substitutionFiles[0], 'base');
                assert.property(response.metadata.substitution.substitutionFiles[0], 'overlay');
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'base', "data/BerlinMit.csv");
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'overlay', "files/BerlinOhne.csv");
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'filename', "BerlinOhne.csv");
                done();
            });
        });

        it('should respond with correct written erc.yml one overlay', (done) => {
            getErcYml(substituted_id, doc => {
                assert.include(doc.execution.cmd, "BerlinOhne.csv:/erc/BerlinMit.csv:ro");
                done();
            });
        });

        it('should respond with existence of both base and substituted files', (done) => {
            getFile(substituted_id, 'BerlinMit.csv', (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 200);
                assert.equal(body, '1990,18186');

                getFile(substituted_id, 'BerlinOhne.csv', (err, res, body) => {
                    assert.ifError(err);

                    assert.equal(res.statusCode, 200);
                    assert.equal(body, '1990,61568');
                    done();
                });
            });
        });
    });
});


describe('Substitution of data with one workspace as base and one compendium as overlay', function () {
    var base_id;
    var overlay_id;
    var metadataHandling = "keepBase";

    before(function (done) {
        let req_workspace_base01 = uploadCompendium('./test/workspace/base01', cookie_o2r, 'workspace');
        let req_erc_overlay02 = uploadCompendium('./test/compendium/overlay', cookie_o2r);
        this.timeout(60000);

        // first upload
        request(req_workspace_base01, (err, res, body) => {
            assert.ifError(err);
            base_id = JSON.parse(body).id;

            publishCandidate(base_id, cookie_o2r, (err) => {
                assert.ifError(err);

                // second upload
                request(req_erc_overlay02, (err, res, body) => {
                    assert.ifError(err);
                    overlay_id = JSON.parse(body).id;

                    publishCandidate(overlay_id, cookie_o2r, (err) => {
                        assert.ifError(err);
                        done();
                    });
                });
            });
        });
    });

    describe('POST /api/v1/substitution', () => {
        var substituted_id;
        let base_file = "files/BerlinMit.csv";
        let overlay_file = "data/BerlinOhne.csv";

        it('should respond with HTTP 200 OK and valid JSON', (done) => {

            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, metadataHandling, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 200);
                    done();
                });
            });
        });

        it('should respond with valid JSON', (done) => {

            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, metadataHandling, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.isObject(body);
                    done();
                });
            });
        });

        it('should respond with valid ID', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, metadataHandling, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.property(body, 'id');
                    assert.isString(body.id);
                    substituted_id = body.id;

                    publishCandidate(substituted_id, cookie_o2r, (err) => {
                        assert.ifError(err);
                        done();
                    });
                });
            });
        });

        it('should respond with substituted property', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response, 'substituted');
                assert.propertyVal(response, 'substituted', true);
                done();
            });
        });

        it('should respond with metadata for base and overlay ID', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response.metadata, 'substitution');
                assert.property(response.metadata.substitution, 'base');
                assert.property(response.metadata.substitution, 'overlay');
                assert.propertyVal(response.metadata.substitution, 'base', base_id);
                assert.propertyVal(response.metadata.substitution, 'overlay', overlay_id);
                done();
            });
        });

        it('should respond with metadata for base and overlay filenames, and new filename at root directory', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response.metadata.substitution, 'substitutionFiles');
                assert.equal(response.metadata.substitution.substitutionFiles.length, 1);
                assert.property(response.metadata.substitution.substitutionFiles[0], 'base');
                assert.property(response.metadata.substitution.substitutionFiles[0], 'overlay');
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'base', "files/BerlinMit.csv");
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'overlay', "data/BerlinOhne.csv");
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'filename', "overlay_overlay_BerlinOhne.csv");
                done();
            });
        });

        it('should respond with correct written erc.yml one overlay', (done) => {
            getErcYml(substituted_id, doc => {
                assert.include(doc.execution.cmd, "overlay_overlay_BerlinOhne.csv:/erc/files/BerlinMit.csv:ro");
                done();
            });
        });

        it('should respond with existence of substituted ERC files', (done) => {
            getFile(substituted_id, 'overlay_overlay_BerlinOhne.csv', (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 200);
                assert.equal(body, '1,2,3');

                request(global.test_host_read + '/api/v1/compendium/' + substituted_id + '/data/files/BerlinMit.csv', (err, res, body) => {
                    if (err) done(err);
                    assert.equal(res.statusCode, 200);
                    assert.include(body, '1990,18186');
                    done();
                });
            });
        });
    });
});


describe('Failing substitution of data with one workspace as base and compendium as overlay', function () {
    var base_id;
    var overlay_id;
    var metadataHandling = "keepBase";

    before(function (done) {
        let req_workspace_base02 = uploadCompendium('./test/workspace/base02', cookie_o2r, 'workspace');
        let req_erc_overlay02 = uploadCompendium('./test/compendium/overlay', cookie_o2r);
        this.timeout(60000);

        // first upload
        request(req_workspace_base02, (err, res, body) => {
            assert.ifError(err);
            base_id = JSON.parse(body).id;

            publishCandidate(base_id, cookie_o2r, (err) => {
                assert.ifError(err);

                // second upload
                request(req_erc_overlay02, (err, res, body) => {
                    assert.ifError(err);
                    overlay_id = JSON.parse(body).id;

                    publishCandidate(overlay_id, cookie_o2r, (err) => {
                        assert.ifError(err);
                        done();
                    });
                });
            });
        });
    });

    describe('POST /api/v1/substitution', () => {
        var substituted_id;
        let base_file = "BerlinMit.csv";
        let overlay_file = "data/BerlinOhne.csv";

        it('should fail with HTTP 400 and valid JSON', (done) => {

            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, metadataHandling, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.isObject(body);
                    done();
                });
            });
        });

        it('should fail with error configuration is missing', (done) => {

            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, metadataHandling, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.include(body, { error: 'missing configuration file in base compendium, please execute a job for the base compendium first' });
                    done();
                });
            });
        });

    });
});
