/*
Copyright 2010 Angelo R. DiNardi (angelo@dinardi.name)

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

hashlib = require('hashlib');
var http = require('http');
var querystring = require('querystring');
var Sequencer = require('./support/sequencer/lib/sequencer').Sequencer;


function Sailthru(apiKey, secret) {
    this._apiKey = apiKey;
    this._secret = secret;
    this._apiUri = 'api.Sailthru.com';
};

Sailthru.extractParams = function(params)
{
    var flatParams = [];
    for (var x in params)
    {
        if (typeof params[x] == 'object')
        {
            flatParams = flatParams.concat(Sailthru.extractParams(params[x]));
        }
        else
        {
            flatParams.push(params[x]);
        }
    }
    
    return flatParams;
};

Sailthru.generateSignatureString = function(params, secret)
{
    var flatParams = Sailthru.extractParams(params);
    
    flatParams = flatParams.sort();
    
    var stringParams = secret + flatParams.join('');
    
    return stringParams;
};

Sailthru.generateSignatureHash = function(params, secret)
{
    var paramString = Sailthru.generateSignatureString(params, secret);
//    require('sys').log(paramString);
    return hashlib.md5(paramString);
};

Sailthru.prototype.send = function(template, email, vars, options, callback)
{
    var postData = {
        template: template,
        email: email,
        vars: vars,
        options: options
    };
    
    this.apiPost('send', postData, callback);
};

Sailthru.prototype.apiPost = function(action, data, callback)
{
    data['api_key'] = this._apiKey;
    data['format'] = 'json';
    data['sig'] = Sailthru.generateSignatureHash(data, this._secret);

    this.request(action, data, 'POST', callback);
};

Sailthru.prototype.request = function(action, data, method, callback)
{
    var seq = new Sequencer(this,
        function(seq)
        {
            var query = querystring.stringify(data);
            
            var api = http.createClient(80, this._apiUri);
            var req = api.request(method, '/' + action,
                {
                    'Content-Length': query.length,
                    'Host': this._apiUri,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            );
        
            req.on('response', seq.next);
            
            req.end(query, 'utf8');
        },
        
        function(seq, response)
        {
            response.on('data', seq.nextFn());
            response.on('end', seq.next);
        },
        
        function(seq, data)
        {
            seq.params.data += data;
        },
        
        function(seq)
        {
            if (seq.params.cb)
            {
                seq.params.cb(JSON.parse(seq.params.data));
            }
        }
    );
    seq.params = {
        data: '',
        cb: callback
    };
    seq.run();
};

exports.Sailthru = Sailthru;