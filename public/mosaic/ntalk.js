var onMoveElement = (function() {
    var moveData = {
        move: false,
        elem: null,
        elemWidth: 0,
        maxWidth: 0,
        onMouseUp: null,
        windowWidht: window.innerWidth,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
    };
    window.addEventListener('resize', function() {
        moveData.windowWidht = window.innerWidth;
        moveData.maxWidth = moveData.windowWidht - moveData.elemWidth;
    });
    window.addEventListener('mousemove', function(e) {
        if (moveData.elem && moveData.move) {
            var x = Math.min(Math.max(moveData.left + e.clientX - moveData.x, 0), moveData.maxWidth);
            moveData.elem.style.left = x + 'px';
            // moveData.elem.style.top = moveData.top + e.clientY - moveData.y + 'px';
        }
    });

    window.addEventListener('mouseup', function(e) {
        if (moveData.elem || moveData.move) {
            if (moveData.onMouseUp) {
                moveData.onMouseUp();
                moveData.onMouseUp = null;
            }
            moveData.elem = null;
            moveData.move = false;
        }
    });

    return function(e, moveElem, onMouseUp) {
        var rect = moveElem.getBoundingClientRect();
        moveData.move = true;
        moveData.elem = moveElem;
        moveData.elemWidth = rect.width;
        moveData.maxWidth = moveData.windowWidht - moveData.elemWidth;
        moveData.x = e.clientX;
        // moveData.y = e.clientY;
        moveData.top = rect.top;
        moveData.left = rect.left;
        moveData.onMouseUp = onMouseUp;
    };
})();

(function() {
    var app = {
        accessToken: '',
        host: null,
        divApp: null,
        ifrApp: null,
        open: null,
    };

    function queryOrCreateApp() {
        var appUrl = app.host + '?access_token=' + app.accessToken;

        var linkCss = document.querySelector('#ntalk-css');
        if (!linkCss) {
            linkCss = document.createElement('link');
            linkCss.id = 'ntalk-css';
            linkCss.href = app.host + '/mosaic/ntalk.css';
            linkCss.setAttribute('rel', 'stylesheet');
            document.body.appendChild(linkCss);
        }

        /** @type {HTMLDivElement} divApp  */
        app.divApp = document.querySelector('#ntalk-app');
        var openWindow = null;
        if (!app.divApp) {
            app.divApp = document.createElement('div');
            document.body.appendChild(app.divApp);
            app.divApp.id = 'ntalk-app';
            app.divApp.classList.add('pos-right');
            app.divApp.classList.add('pos-bottom');

            var appBackground = document.createElement('div');
            app.divApp.appendChild(appBackground);
            appBackground.id = 'app-background';
        }

        /** @type {HTMLDivElement} divToolbar  */
        var divToolbar = document.querySelector('#ntalk-toolbar');
        if (!divToolbar) {
            divToolbar = document.createElement('div');
            divToolbar.id = 'ntalk-toolbar';
            app.divApp.appendChild(divToolbar);

            var labelTitle = document.createElement('label');
            labelTitle.innerHTML = 'NTalk';

            labelTitle.addEventListener('mousedown', function(e) {
                app.divApp.classList.add('on-move');
                onMoveElement(e, app.divApp, function() {
                    app.divApp.classList.remove('on-move');
                });
            });

            var iconMinimum = document.createElement('span');
            iconMinimum.classList.add('icon-minimum');
            iconMinimum.innerHTML = ' - ';
            iconMinimum.title = '縮小';
            iconMinimum.addEventListener('click', function() {
                app.divApp.classList.add('minimum');
            });

            var iconMaximum = document.createElement('span');
            iconMaximum.classList.add('icon-maximum');
            iconMaximum.innerHTML = ' □ ';
            iconMaximum.title = '放大';
            iconMaximum.addEventListener('click', function() {
                app.divApp.classList.remove('minimum');
            });

            // var iconOpen = document.createElement('span');
            // iconOpen.classList.add('icon-open');
            // iconOpen.innerHTML = ' ↗ ';
            // iconOpen.title = '另開視窗';
            // iconOpen.addEventListener('click', function() {
            //     iconMinimum.click();
            //     if (app.open) {
            //         app.open.close();
            //     }
            //     app.ifrApp.remove();
            //     app.ifrApp = null;

            //     app.open = window.open(socketUrl);
            //     app.open.onbeforeunload = function() {
            //         console.info('run');
            //         createIframeApp();
            //         iconMaximum.click();
            //         app.open = null;
            //     };
            // });

            divToolbar.appendChild(labelTitle);
            divToolbar.appendChild(iconMinimum);
            divToolbar.appendChild(iconMaximum);
            // divToolbar.appendChild(iconOpen);
        }

        /** @type {HTMLIFrameElement} ifrApp */
        app.ifrApp = document.querySelector('#ntalk-iframe');
        if (!app.ifrApp) {
            app.ifrApp = document.createElement('iframe');
            app.divApp.appendChild(app.ifrApp);
            app.ifrApp.src = appUrl;
            app.ifrApp.id = 'ntalk-iframe';
            app.ifrApp.scrolling = 'no';
        }
    }

    // var divApp = document.querySelector('#ntalk-app');
    var script = document.currentScript;
    app.accessToken = script.getAttribute('access-token');
    if (!app.accessToken) {
        throw new Error('access-token is required');
    }
    app.host =
        script.getAttribute('host') ||
        (function(url) {
            var matchs = url.match(/^https?:\/\/[^/]*/g);
            return (matchs && matchs[0]) || '';
        })(script.src);

    /** @type {HTMLDivElement} divApp  */
    queryOrCreateApp();

    window.addEventListener('message', function(event) {
        try {
            var data = JSON.parse(event.data);
            divApp.setAttribute('num-unreads', Number(data.numUnreads) || 0);
        } catch (err) {}
    });
})();
