'use strict';

const fs = require('fs');
const gulp = require('gulp');
const path = require('path');

const GULP_SCRIPTS = path.resolve(__dirname, 'gulp');

fs
  .readdirSync(GULP_SCRIPTS)
  .filter((f) => (/\.js$/i).test(f))
  .map((f) => require(path.resolve(GULP_SCRIPTS, f)));

gulp.task('default', ['watch']);
