'use strict';

const changelog = require('gulp-conventional-changelog');
const detectBump = require('conventional-recommended-bump');
const exec = require('child_process').exec;
const fs = require('fs');
const git = require('gulp-git');
const gulp = require('gulp');
const gutil = require('gulp-util');
const rename = require('gulp-rename');
const rimraf = require('gulp-rimraf');
const runSequence = require('run-sequence');

const PRESET = 'angular';
let BUMP = 'patch';
let VERSION;

gulp.task('bump:detect-bump', (callback) => {
  if (process.env.BUMP) {
    setVersion(null, process.env.BUMP);
  }
  else {
    detectBump({ preset: PRESET }, setVersion);
  }

  function setVersion(err, releaseAs) {
    if (err) {
      gutil.log('Error detecting recommended bump: ' + gutil.colors.red(err));
    }
    else {
      BUMP = releaseAs;
    }

    gutil.log('Recommended bump: ' + gutil.colors.green(BUMP));

    callback();
  }
});

gulp.task('bump:clone-package', () => {
  return gulp
    .src('package.json')
    .pipe(rename('_package.json'))
    .pipe(gulp.dest('.'));
});

gulp.task('bump:temp-version', (callback) => {
  exec(`npm --no-git-tag-version version ${BUMP}`, callback);
});

gulp.task('bump:changelog', () => {
  return gulp
    .src('CHANGELOG.md')
    .pipe(changelog({ preset: PRESET, releaseCount: 1 }))
    .pipe(gulp.dest('./'));
});

gulp.task('bump:commit-changelog', () => {
  VERSION = JSON.parse(fs.readFileSync('package.json').toString()).version;

  return gulp
    .src('CHANGELOG.md')
    .pipe(git.add())
    .pipe(git.commit(`docs(CHANGELOG): ${VERSION}`));
});

gulp.task('bump:unclone-package', () => {
  return gulp
    .src('_package.json', { dest: './' })
    .pipe(rename('package.json'))
    .pipe(gulp.dest('.'));
});

gulp.task('bump:unclone-package', () => {
  return gulp
    .src('_package.json')
    .pipe(rename('package.json'))
    .pipe(gulp.dest('.'));
});

gulp.task('bump:clean', () => gulp.src('_package.json').pipe(rimraf()));

gulp.task('bump:version', (callback) => {
  exec(`npm version ${BUMP} -m "chore(release): ${VERSION}"`, callback);
});

gulp.task('bump:publish', (callback) => {
  exec(`npm publish`, callback);
});

gulp.task('bump', ['lint'], (callback) => {
  runSequence(
    'bump:detect-bump',
    'bump:clone-package',
    'bump:temp-version',
    'bump:changelog',
    'bump:commit-changelog',
    'bump:unclone-package',
    'bump:clean',
    /*'bump:version',
    'bump:publish',*/
    callback
  );
});
