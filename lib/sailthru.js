hashlib = require('hashlib');
var http = require('http');
var querystring = require('querystring');


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

Sailthru.prototype.send = function(template, email, vars, options)
{
    var postData = {
        template: template,
        email: email,
//        vars: vars,
        options: options
    };
    
    this.apiPost('send', postData);
};

Sailthru.prototype.apiPost = function(action, data)
{
    data['api_key'] = this._apiKey;
    data['format'] = 'json';
    data['sig'] = Sailthru.generateSignatureHash(data, this._secret);
//    require('sys').log(data['sig']);
    this.request(action, data, 'POST');
};

Sailthru.prototype.request = function(action, data, method, callback)
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

//    require('sys').log(require('sys').inspect(req));
    req.on('response', function(response) {
//        console.log('response');
        response.on('data', function(chunk) {
//            console.log('body: ' + chunk);
        });
        
        response.on
    });
    
//    require('sys').log(query);
    req.end(query, 'utf8');
};

exports.Sailthru = Sailthru;