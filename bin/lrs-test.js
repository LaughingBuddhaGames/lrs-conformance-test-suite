#!/usr/bin/env node

/**
 * Description : This is the command line interface for running the lrs conformance test suite.
 *
 */
(function(process, require, program, exit, packageJson, Q, Joi, fs, path, Mocha)
{
    'use strict';

    function processMessageReporter(p)
    {
        return function(runner)
        {
            runner.on('test', function(test)
            {
                p.postMessage("log", 'Test started: ' + test.title);
            })
            runner.on('test end', function(test)
            {
                p.postMessage("log", 'Test done: ' + test.title);
            })
            runner.on('pass', function(test)
            {
                p.postMessage("log", 'Test passed');
                
            })
            runner.on('fail', function(test, err)
            {
                p.postMessage("log", 'Test fail');
            })
            runner.on('end', function()
            {
                p.postMessage("log", 'All done');
            });
            runner.on('pending', function()
            {
                //p.postMessage("log", 'All done');
            });
            runner.on('start', function()
            {
                p.postMessage("log", 'Starting');
            });
            runner.on('suite', function()
            {
                p.postMessage("log", 'suite');
            });
        }
    }
    function runTests(_options)
    {
        var optionsValidator = Joi.object(
        {
            directory: Joi.string(),
            /* See [RFC-3986](http://tools.ietf.org/html/rfc3986#page-17) */
            endpoint: Joi.string().regex(/^[a-zA-Z][a-zA-Z0-9+\.-]*:.+/, 'URI').required(),
            basicAuth: Joi.any(true, false),
            authUser: Joi.string().when('basicAuth',
            {
                is: 'true',
                then: Joi.required()
            }),
            authPass: Joi.string().when('basicAuth',
            {
                is: 'true',
                then: Joi.required()
            }),
            reporter: Joi.string().regex(/^((dot)|(spec)|(nyan)|(tap)|(List)|(progress)|(min)|(doc))$/).default('nyan'),
            grep: Joi.string()
        }).unknown(false);
        
        var validOptions = Joi.validate(_options, optionsValidator);
        if (validOptions.error)
        {
            process.postMessage("log", "Options not valid " + validOptions.error);
            process.exit();
        }

        var DIRECTORY = 'v1_0_2';
        var options = {
            directory: _options.directory || DIRECTORY,
            endpoint: _options.endpoint,
            basicAuth: _options.basicAuth,
            authUser: _options.authUser,
            authPass: _options.authPass,
            reporter: _options.reporter,
            grep: _options.grep
        };
        
        var mocha = new Mocha(
        {
            uii: 'bdd',
            reporter: processMessageReporter(process),
            timeout: '15000',
            grep: program.grep,
            bail: program.bail
        });
        process.env.LRS_ENDPOINT = options.endpoint;
        process.env.BASIC_AUTH_ENABLED = options.basicAuth;
        process.env.BASIC_AUTH_USER = options.authUser;
        process.env.BASIC_AUTH_PASSWORD = options.authPass;
        var testDirectory = 'test/' + options.directory;
        fs.readdirSync(testDirectory).filter(function(file)
        {
            return file.substr(-3) === '.js';
        }).forEach(function(file)
        {
            mocha.addFile(
                path.join(testDirectory, file)
            );
        });
        mocha.run(function(failures)
            {
                if (failures)
                {}
                else
                {}

                process.postMessage("log", "Test Suite Complete");
                process.exit();
            })
    }

    function hookupIPC()
    {
        process.postMessage = function(action, payload)
        {
            process.send(
            {
                action: action,
                payload: payload
            })
        }
        process.on('message', function(message)
        {
            if (message.action == "ping")
            {
                process.postMessage("log", "pong");
            }
            if (message.action == "runTests")
            {
                process.postMessage("log", "runTests starting");
                runTests(message.payload);
            }
        })
        process.postMessage("ready");
    }
    hookupIPC();
}(process, require, require('commander'), require('exit'), require('../package.json'), require('q'), require('joi'), require('fs'), require('path'), require('mocha')));