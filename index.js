const request = require('@nicklason/request-retry');
const cheerio = require('cheerio');
const steamLogin = require('steam-openid-login');

class BackpackTFLogin {
    constructor (cookies) {
        if (Array.isArray(cookies)) {
            this.jar = request.jar();

            cookies.forEach((cookieStr) => {
                this.jar.setCookie(request.cookie(cookieStr), 'https://steamcommunity.com');
            });
        } else {
            this.jar = cookies;
        }
    }

    login (callback) {
        steamLogin('https://backpack.tf/login', this.jar, callback);
    }

    getAPIKey (callback) {
        request({
            method: 'GET',
            url: 'https://backpack.tf/developer/apikey/view',
            jar: this.jar
        }, function (err, response, body) {
            if (err) {
                return callback(err);
            }

            const $ = cheerio.load(body);

            if ($('input[value="Generate my API key"]').length !== 0) {
                return callback(null, null);
            }

            const apiKey = $('input[type=text][readonly]').val();

            if (!apiKey) {
                return callback(new Error('Could not find API key'));
            }

            callback(null, apiKey);
        });
    }

    generateAPIKey (url, comments, callback) {
        const cookies = this.jar.getCookies('https://backpack.tf');

        const userId = cookies.find((cookie) => cookie.key === 'user-id');

        if (userId === undefined) {
            callback(new Error('Not logged in'));
            return;
        }

        request({
            method: 'POST',
            url: 'https://backpack.tf/developer/apikey/view',
            followAllRedirects: true,
            jar: this.jar,
            form: {
                url: url,
                comments: comments,
                'user-id': userId.value
            }
        }, function (err, response, body) {
            if (err) {
                return callback(err);
            }

            const $ = cheerio.load(body);

            const alert = $('div.alert.alert-danger');

            if (alert.length !== 0) {
                const error = alert.contents().last().text().trim();
                return callback(new Error(!error ? 'An error occurred' : error));
            }

            callback(null);
        });
    }

    revokeAPIKey (apiKey, callback) {
        const cookies = this.jar.getCookies('https://backpack.tf');

        const userId = cookies.find((cookie) => cookie.key === 'user-id');

        if (userId === undefined) {
            callback(new Error('Not logged in'));
            return;
        }

        request({
            method: 'POST',
            url: 'https://backpack.tf/developer/apikey/revoke',
            followAllRedirects: true,
            jar: this.jar,
            form: {
                identifier: '',
                'user-id': userId.value,
                confirm_apikey: apiKey
            }
        }, function (err, response, body) {
            if (err) {
                return callback(err);
            }

            const $ = cheerio.load(body);

            const alert = $('div.alert.alert-danger');

            if (alert.length !== 0) {
                const error = alert.contents().last().text().trim();
                return callback(new Error(!error ? 'An error occurred' : error));
            }

            callback(null);
        });
    }
}

module.exports = BackpackTFLogin;
