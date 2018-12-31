# Ending Scope Creep Without Limiting Functionality

Webpack Dev Server has features that seem almost entirely orthogonal to its primary goal of providing HMR and in-memory bundle serving, which seems to have been a factor that has lead to its bloat and current lack of maintainability. Below I list some of the core features that WebpackDevServer provides which I consider scope creep. After, I show an example of how all those same features could easily be implemented by using a theoretical WebpackDevSecOpsServer API alongside a Node.js API so that these scope-creep features can remain outside the scope of this project, allowing the WebpackDevSecOpsServer API to remain small and focused.

### 1. Proxy Server

Webpack Dev Server allows consumers to [proxy](https://webpack.js.org/configuration/dev-server/#devserver-proxy) certain requests that pass through the server to a different URL. Thus WebpackDevServer is not only an in-memory bundler and HMR provider, but it is also a proxy server (scope creep). Users designate this functionality in the devServer configuration:

```JavaScript
module.exports = {
    ...
    devServer: {
        ...
        proxy: {
            '/api':'http://localhost:3000'
        },
        ...
    },
    ...
};
```

which would route any requests with a request path prefix of `/api` to `http://localhost:3000/api` followed by the rest of the path. Since this encourages users to use WebpackDevServer as a proxy server, which could be public-facing, then it also means that WebpackDevServer must implement options to enable https, filter out requests from unknown hosts, send specific headers in responses, and bind to particular hostname (more scope creep).

```JavaScript
module.exports = {
    ...
    devServer: {
        ...
        https: {
            key: fs.readFileSync('/path/to/server.key'),
            cert: fs.readFileSync('/path/to/server.crt'),
            ca: fs.readFileSync('/path/to/ca.pem')
        },
        pfx: '/path/to/file.pfx',
        pfxPassphrase: 'passphrase',
        allowedHosts: ['host.com', 'subdomain.host.com', 'subdomain2.host.com', 'host2.com'],
        disableHostCheck: false,
        headers: {'X-Custom-Foo': 'bar'},
        host: '0.0.0.0',
        ...
    },
    ...
};
```

### 2. Static File Server

Webpack Dev Server allows users to [specify](https://webpack.js.org/configuration/dev-server/#devserver-contentbase) one or more paths from which static files should be served, and in addition can [prompt full client-side reloads](https://webpack.js.org/configuration/dev-server/#devserver-watchcontentbase) when any one file in the static file path (called `contentBase`) is changed.

```JavaScript
module.exports = {
    ...
    devServer: {
        ...
        contentBase: [path.join(__dirname, 'public'), path.join(__dirname, 'assets')],
        staticOptions: {
            redirect: false
        },
        watchContentBase: true,
        ...
    },
    ...
};
```

### 3. URL Rewriter

Often times the bundle being served by Webpack Dev Server is a single page application (SPA). SPAs often have client-side routing built-in so a change in url does not cause a GET request to the server for a new page load, and instead the page URL is updated dynamically via JavaScript. In these cases the URL changes without a GET request being made, and this is done through browsers' native [History modification API](https://developer.mozilla.org/en-US/docs/Web/API/History_API#Adding_and_modifying_history_entries). This results in cases where a developer is on for example a path called `/account/update` when the HMR client decides to do a full page reload. The server needs to know that `/`, `/account/update` and potentially many other paths need to all load `index.html` and the associated webpack bundle file.

```JavaScript
module.exports = {
    ...
    devServer: {
        ...
        historyApiFallback: {
            rewrites: [
                { from: /^\/$/, to: '/views/landing.html' },
                { from: /^\/subpage/, to: '/views/subpage.html' },
                { from: /./, to: '/views/404.html' }
            ]
        },
        ...
    },
    ...
};
```

This feature could be easily offloaded to the developer consuming the library, and they could accomplish this same task in roughly the same number of lines of code as is in this configuration.

### 4. Generally Extensible Web Server

It is still acknowledged by the webpack dev server authors that the above feature set may not cover all of the customization preferences, so they allow direct manipulation of the Express app that is created internally.

```JavaScript
module.exports = {
    ...
    devServer: {
        ...
        after: function(app, server) { ... },
        before: function(app, server) {
            app.get('/some/path', function(req, res) {
                res.json({ custom: 'response' });
            });
        },
        port: 8080,
        ...
    },
    ...
};
```

### 5. Random other unnecessary scope-creep.

For some reason the maintainers decided to add in [bonjour](https://en.wikipedia.org/wiki/Bonjour_(software)) broadcasting into the core library. This seems like a pretty niche feature that has no business polluting the core logic.

### Solution

In the spirit of maintaining a limited, minimal scope, here is how these same exact features might be implemented in tandem with the WebpackDevSecOpsServer's limited scope.

```TypeScript
/* WIP */
import http from 'http';
import express from 'express';
import httpProxy from 'http-proxy'; // This npm module already provides proxy support, so use that!
import webpack from 'webpack';
import {config, BUNDLE_NAMES} from './webpack.config'; // BUNDLE_NAMES is some sort of runtime enum.
import {WebpackDevSecOpsServer} from 'webpack-dev-sec-ops-server';
const compiler = webpack(config);
const devSecOps = new WebpackDevSecOpsServer(compiler);
const app = express();
// Proxy
const apiProxy = httpProxy.createProxyServer();
app.get("/api/*", function(req, res) {
    apiProxy.web(req, res, {target: "http://localhost:3000"})
});
// Serve Static Files
// Reload when static files change
// Serve bundles
```

Because they are implemented outside of the core library, the solutions are more customizable, and also the core library is more maintainable since there are less features to implement. More maintainable = quicker iterations = more releases = better library.