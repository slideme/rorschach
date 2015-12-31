'use strict';

const config = require('./config');
const gulp = require('gulp');
const jscs = require('gulp-jscs');
const eslint = require('gulp-eslint');
const jsonlint = require('gulp-jsonlint');
const runSequence = require('run-sequence');

gulp.task('jscs', () => {
  return gulp
    .src(config.paths.js)
    .pipe(jscs())
    .pipe(jscs.reporter())
    .pipe(jscs.reporter('fail'));
});

gulp.task('eslint', () => {
  return gulp
    .src(config.paths.js)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('jsonlint', () => {
  return gulp
    .src(config.paths.json)
    .pipe(jsonlint())
    .pipe(jsonlint.reporter())
    .pipe(jsonlint.failAfterError());
});

gulp.task('lint:json', (callback) => {
  runSequence('jsonlint', callback);
});

gulp.task('lint:js', (callback) => {
  runSequence('jscs', 'eslint', callback);
});

gulp.task('lint', ['eslint', 'jscs', 'jsonlint']);
