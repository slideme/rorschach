'use strict';

const config = require('./config');
const gulp = require('gulp');
const gutil = require('gulp-util');

gulp.task('watch', function setupWatches() {
  gulp.watch(config.paths.json, logEventAndStart('lint:json'));
  gulp.watch(config.paths.js, logEventAndStart('lint:js'));

  function logEventAndStart() {
    const args = [].slice.call(arguments, 0);

    return function onChange(event) {
      gutil.log('File ' + gutil.colors.green(event.path) + ' ' + event.type);
      gulp.start.apply(gulp, args);
    };
  }
});
