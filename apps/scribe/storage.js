'use strict';
module.change_code = 1;
var _ = require('lodash');
var app = require('./index');
var ALEXA_DATA_TABLE_NAME = 'USERS';
var dynasty = require('dynasty')({});
var localCredentials = {
    accessKeyId: '', //Use your access key id
    secretAccessKey: 'U7/', //Use your secret access key
    region: 'us-east-1'
};

var localUrl = "http://localhost:4000";

var localDynasty = require('dynasty')(localCredentials);
var dynasty = localDynasty;

function ScribeHelper() {}
var scribeTable = function() {
  return dynasty.table(ALEXA_DATA_TABLE_NAME);
};

ScribeHelper.prototype.createScribeTable = function() {
  return dynasty.describe(ALEXA_DATA_TABLE_NAME)
    .catch(function(error) {
      console.log('here')
      return dynasty.create(ALEXA_DATA_TABLE_NAME, {
        key_schema: {
          hash: ['userId', 'string', 'string', 'string']
        }
      });
    });
};

ScribeHelper.prototype.storeScribeData = function(userId, scribeData) {
  return scribeTable().insert({
    userId: userId,
    name: scribeData['name'],
    dob: scribeData['dob'],
    phirid: scribeData['phirid']
  }).catch(function(error) {
    console.log('store error'+error);
  });
};

ScribeHelper.prototype.readScribeData = function(userId) {
  return scribeTable().find(userId)
    .then(function(result) {
      return result;
    })
    .catch(function(error) {
      console.log('Error while reading : '+error);
    });
};

ScribeHelper.prototype.deleteScribeData = function(userId) {
  return scribeTable().remove(userId)
    .then(function(result) {
      return result;
    })
    .catch(function(error) {
      console.log('Error while reading : '+error);
    });
};

module.exports = ScribeHelper;