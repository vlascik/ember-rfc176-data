#!/usr/bin/env node

const chalk = require("chalk");
const green = chalk.green;
const blue = chalk.blue;
const mapping = require("../globals");
const reserved = require("../reserved");

const modulesToSkip = ["rsvp", "jquery", "@ember/error"]; //todo: remove @ember/error after Ember.Error is changed from any

function normalize(key) {
  let row = mapping[key];

  return {
    before: key,
    row: row,
    group: row[0]
  }
}

function sortByGroup(a, b) {
  return (a.group < b.group) ? -1 :
    ((a.group > b.group) ? 1 :
      0);
}

function tableRow(before, row) {
  let [afterPackage, afterExportName, afterIdentifier] = row;

  // For default exports, assume the identifier remains the same as the global
  // version if an explicit name isn't provided.
  if (!afterIdentifier) {
    afterIdentifier = before;
  }

  // Object, Array, etc.
  if (reserved.includes(afterIdentifier)) {
    afterIdentifier = "Ember" + afterIdentifier;
  }

  return [afterIdentifier, afterPackage, afterExportName];
}

function buildTable(result, row) {
  let group = result[row.group] = result[row.group] || {
    rows: []
  };

  let [afterIdentifier, afterPackage, afterExportName] = tableRow(row.before, row.row);

  return group.rows.push([afterIdentifier, afterPackage, afterExportName, row.before, row.row]), result;
}

function cmp(a, b) {
  return (a > b) ? 1 : (a < b) ? -1 : 0;
}

function sortByPackageAndExport([, , , , a], [, , , , b]) {
  if (a[0] === b[0]) {
    return cmp(a[1] || "", b[1] || "");
  }

  return cmp(a[0], b[0]);
}

function printTable(table) {
  Object.keys(table).map(name => {
    if (modulesToSkip.indexOf(name) > -1) {
      return;
    }
    print("declare module '" + name + "' {");

    let group = table[name];
    let rows = group.rows;

    rows = rows.sort(sortByPackageAndExport);

    print("    import Ember from 'ember';");

    rows.map(([afterIdentifier, afterPackage, afterExportName, before]) => {
      if (afterExportName) {
        print("    export const " + afterExportName + ": typeof Ember." + before + ";");
      } else {
        print("    export default class " + afterIdentifier + " extends Ember." + before + " { }");
      }
    });

    print('}');
    print();
  });
}

function print() {
  console.log.apply(console, arguments);
}

let table = Object.keys(mapping)
  .map(normalize)
  .sort(sortByGroup)
  .reduce(buildTable, {});

printTable(table);
