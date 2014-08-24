var gulp = require('gulp'),
    isProduction = false,
    $ = require('gulp-load-plugins')();


var assets = (function () {
    
    /**
     * First, load all the targets assets folders from the package.json. If you'd like to develop your own package, simply
     * add it as a property into the "onePackages" object in the package.json. Its key should be the "slug" to use
     * (its compiled `/assets` folder is accessible publicly "/assets/mypackagename"), and its value should be the
     * path to the package root.
     */
    var assetFolders = require('./package.json').onePackages;
    
    function makePath(key) {
        return assetFolders[key] + '/assets';
    }
    
    return {
        /**
         * A helper function to loop through tasks. We do want to make each package its own individual task, because globals
         * may get polluted in either LESS or Browserify resulting in some unexpected and hard-to-diagnose behaviour! With
         * this helper, all assets whose name does not begin with an underscore are compiled.
         */
        each: function (pattern, task) {
            for (var key in assetFolders) {
                (task || function (stream) {
                    return stream;
                })(gulp.src(makePath(key) + pattern)
                    .pipe($.filter('**/*', '!**/_*')))
                    .pipe(gulp.dest('public/assets/' + key));
            }
        },
        /**
         * Another helper function that returns globs for asset folders with a given suffix. 
         */
        globs: function (suffix) {
            suffix = suffix || '';

            var targets = [];
            for (var key in assetFolders) {
                targets.push(makePath(key) + suffix);
            }
            
            return targets;
        }
    }
})();

/**
 * We'll start by compiling all CSS where the name does not begin with an underscore.
 */
gulp.task('css', function () {
    assets.each('/**/*.less', function (stream) {
        return stream
            .pipe($.less())
            .pipe($.autoprefixer('last 3 versions'))
            .pipe($.if(isProduction, $.minifyCss()));
    });
});

/**
 * We'll compile all Javascript and pass it through Browserify. You should not run into conflicts if you just write
 * your js normally and run it, but Browserify is there if you need it. It's really great ;) and we include Angular
 * shims by default. If there are more you want, just open a PR...
 */
gulp.task('js', function () {
    assets.each('/**/*.js', function (stream) {
        return stream
            .pipe($.browserify({
                insertGlobals: true,
                debug: !gulp.env.production,
                nobuiltins: 'querystring',
                shim: {
                    angular: {
                        exports: 'angular',
                        path: 'bower_components/angular/angular.js'
                    },
                    'angular-route': {
                        path: 'bower_components/angular-route/angular-route.js',
                        exports: 'ngRoute',
                        depends: {
                            angular: 'angular'
                        }
                    },
                    'angular-animate': {
                        path: 'bower_components/angular-animate/angular-animate.js',
                        exports: 'ngAnimate',
                        depends: {
                            angular: 'angular'
                        }
                    }
                }
            }))
            .pipe($.if(isProduction, $.uglify()));
    });
});
/**
 * HTML and EJS will be minified and copied. Useful for Angular templates.
 */
gulp.task('html', function () {
    assets.each('/**/*.{ejs,html}', function (stream) {
        return stream.pipe($.if(isProduction, $.htmlmin({collapseWhitespace: true})))
    });
});

/**
 * Compress all images...
 */
gulp.task('images', function () {
    assets.each('/**/*.{jpg,jpeg,svg,png,gif}', function (stream) {
        return stream
            .pipe($.if(isProduction, $.imagemin({
                progressive: true
            })))
    });
});

/**
 * And copy the loose ends.
 */
gulp.task('misc', function () {
    assets.each('/**/*.{ico,eot,woff,ttf}');
});

/**
 * This task may be used directly, and it runs jshint on all package's JS.
 */
gulp.task('lint', function () {
    gulp.src(assets.globs('**/*.js'))
        .pipe($.jshint())
        .pipe($.jshint.reporter(require('jshint-stylish')));
});

/**
 * Sets us to production!
 */
gulp.task('setProduction', function () {
    isProduction = true;
});

/**
 * Task that minifies and compiles all assets.
 */
gulp.task('dist', ['setProduction', 'default']);

/**
 * Task that compiles all assets.
 */
gulp.task('default', ['html', 'js', 'css', 'images', 'misc']);