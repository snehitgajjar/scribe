'use strict';
module.change_code = 1;
var Alexa = require('alexa-app');
var app = new Alexa.app('scribe');
var DatabaseHelper = require('./storage');
var databaseHelper = new DatabaseHelper();

var APP_ID = "amzn1.ask.skill.7ab4388d-0c78-4b48-b4cf-9207c0895cbe"; //replace with "amzn1.echo-sdk-ams.app.[your-unique-value-here]";

var Client = require('node-rest-client').Client;
 
// Extend AlexaSkill
app.pre = function(request, response, type) {
   databaseHelper.createScribeTable();
};

app.launch(function(req, res) {
  

  readUser(req, res,req.userId, dbCallBack);
    return false;
  });

  function dbCallBack(res, result){

    if(result == 'false'){
      var prompt = 'Welcome to Scribe. Please select a patient.';
      var reprompt = 'Please select a patient.';

      res.say(prompt).reprompt(reprompt).shouldEndSession(false).send();
    }else{
      var prompt = 'Welcome to Scribe. Patient ' + result['name'] + " selected. Ready for commands.";

      res.session("phirid",result['phirid']);
      res.say(prompt).reprompt(prompt).shouldEndSession(false).send();
    }
  };

function readUser(request, response, userId, callback){

    databaseHelper.readScribeData(userId).
    then(function(result) {
      if(result === undefined){
        callback(response,'false');
      }else{
        var data = {};
      
        data['name'] = result['name'];
        data['dob'] = result['dob'];
        data['phirid'] = result['phirid'];
        callback(response, data); 
      }
       
    }).catch(function(err) {
        // Will get an error here about not including the hashKey!
      console.log('Error while reading : '+err);
    });

    return false;
};

app.intent('SelectPatientIntent', {
        "slots":{"PatientFirstName":"AMAZON.US_FIRST_NAME","PatientLastName":"LIST_OF_PATIENT_NAMES"}, 
        "utterances":[ "select patient {-|PatientFirstName} {-|PatientLastName}" ]
},
  function(req,res) {

        var client = new Client();
        var patientId;
        // set content-type header and data as json in args parameter 
        var args = {
            parameters: {name: req.slot('PatientFirstName') + ' ' + req.slot('PatientLastName')},
            headers: { 'Accept': 'application/json+fhir' }
        };

        var callback = function(data,response) {
          patientId = JSON.parse(data.toString('ascii')).entry[0].resource.id;
          var prompt = "Please confirm date of birth for " +  req.slot('PatientFirstName');
          res.session("phirid",patientId.toString());
          res.shouldEndSession(false);
          res.say(prompt).reprompt(prompt).send();
        };

        client.get("https://fhir-open.sandboxcerner.com/dstu2/d075cf8b-3261-481d-97e5-ba6c48d3b41f/Patient", args, callback);
        
        res.session("PatientName",req.slot('PatientFirstName') + ' ' + req.slot('PatientLastName'));
        return false;
  }
);

app.intent('ConfirmDOBIntent', {
        "slots":{"DateOfBirth":"AMAZON.DATE"}, 
        "utterances":[ "date of birth {-|DateOfBirth}",  "the patients date of birth is {-|DateOfBirth}"]
},
  function(req,res) {
        var client = new Client();

        if(req.session("phirid") === undefined){
          res.say('No patient selected. Select patient.').shouldEndSession(false);
          return;
        }
        var patientId = req.session("phirid");
        var dateOfBirth;
        // set content-type header and data as json in args parameter 
        var args = {
            parameters: {'_id': patientId},
            headers: { 'Accept': 'application/json+fhir' }
        };

        var callback = function(data,response) {
          dateOfBirth = JSON.parse(data.toString('ascii')).entry[0].resource.birthDate;
          patientId = JSON.parse(data.toString('ascii')).entry[0].resource.id;
          res.shouldEndSession(false);

          if (Date.parse(dateOfBirth) == Date.parse(req.slot('DateOfBirth'))) {

            var data = {};
            data['name'] = req.session("PatientName");
            data['dob'] = dateOfBirth.toString();
            data['phirid'] = patientId.toString();

            saveUser(req.userId, data); 

            var prompt = "Date of birth " + dateOfBirth.toString() + " confirmed. Ready for commands.";
            var reprompt = "Ready for commands";
            res.say(prompt).reprompt(reprompt).send();            
          } else {
            var prompt = "Date of birth does not match. Please confirm date of birth or select new patient.";
            res.say(prompt).reprompt(prompt).send(); 
          }

        };

        client.get("https://fhir-open.sandboxcerner.com/dstu2/d075cf8b-3261-481d-97e5-ba6c48d3b41f/Patient", args, callback);

        return false;
  }
);

app.intent('HasFluVaccine', {
  'utterances': ['does the patient have the flu vaccine']
},
  function(req, res) {
    var client = new Client();
    var recieved_vaccine;
   
    if(req.session("phirid") === undefined){
      res.say('No patient selected. Select patient.').shouldEndSession(false);
      return;
    }

    var args = {
      parameters: { patient: req.session("phirid") },
      headers: { 'Accept': 'application/json+fhir'}
    };

    var callback = function(data,response) {
      // If flu vaccine exists return true else false
      res.shouldEndSession(false);
      var j = JSON.parse(data.toString('ascii'));
      if (j.entry == undefined){
        res.say("The patient has no immunizations").send();
      }
      else{
        for (var i = 0; i < j.entry.length; i++ ){
          for (var n = 0; n < j.entry[i].resource.vaccineCode.coding.length; n++){
            if (j.entry[i].resource.vaccineCode.coding[n].code == 88 && !j.entry[i].resource.wasNotGiven) {
              res.say("The patient was given the flu vaccine on " + j.entry[i].resource.date.split("T")[0]).send();
              return;
            }
          }
        }
        res.say("The patient was not given the flu vaccine").send();
      }
    }

    client.get("https://fhir-open.sandboxcerner.com/dstu2/d075cf8b-3261-481d-97e5-ba6c48d3b41f/Immunization", args, callback);

    return false;
  }
);

app.intent('GetPatientTemperature', {
  'utterances': ["whats the patients latest temperature", "what is the patients latest temperature"]
},
  function(req,res) {
    var client = new Client();
    if(req.session("phirid") === undefined){
      res.say('No patient selected. Select patient.').shouldEndSession(false);
      return;
    }
    var args = {
      parameters: { patient: req.session("phirid") },
      headers: { 'Accept': 'application/json+fhir'}
    };

    var callback = function(data,response) {
      var j = JSON.parse(data.toString('ascii'));
      var time;
      var temp = 0;
      res.shouldEndSession(false);
      if (j.entry == undefined) {
        res.say("The patient does not have observations").send();
        return;
      };
      for (var i = 0; i < j.entry.length; i++){
        if (j.entry[i].resource.code.text.toLowerCase().includes("temperature")){
          if (j.entry[i].resource.effectiveDateTime > time || time == undefined){
            time = j.entry[i].resource.effectiveDateTime;
            temp = j.entry[i].resource.valueQuantity.value;
          }
        }
      }
      if (temp == undefined){
        res.say("The patient has no temperature history").send();
      }
      else{
        res.say("The patients last temperature was " + temp + " degrees celsius").send();
      }
    }

    client.get("https://fhir-open.sandboxcerner.com/dstu2/d075cf8b-3261-481d-97e5-ba6c48d3b41f/Observation", args, callback);
    return false;
  }
);

app.intent('GetPatientBloodPressure', { 
  'utterances': ["what is the patients latest blood pressure"]
},
  function(req,res) {
    console.log("1");
    var client = new Client();
    console.log("session status: "+req.session("phirid"));
    if(req.session("phirid") === undefined){
      res.say('No patient selected. Select patient.').shouldEndSession(false);
      return;
    }
    var args = {
      parameters: { patient: req.session("phirid") },
      headers: { 'Accept': 'application/json+fhir'}
    };

    var callback = function(data,response) {
      console.log("In Callback");
      var j = JSON.parse(data.toString('ascii'));
      var time;
      var systolic;
      var diastolic;
      res.shouldEndSession(false);
      if (j.entry == undefined) {
        res.say("The patient does not have observations").send();
        return;
      };
      for (var i = 0; i < j.entry.length; i++){
        if (j.entry[i].resource.code.text.toLowerCase().includes("blood pressure")){
          if (j.entry[i].resource.effectiveDateTime > time || time == undefined){
            time = j.entry[i].resource.effectiveDateTime;
            for (var n = 0; n < j.entry[i].resource.component.length; n++){
              if (j.entry[i].resource.component[n].code.text.toLowerCase().includes("systolic")){
                systolic = j.entry[i].resource.component[n].valueQuantity.value;
              }
              else if (j.entry[i].resource.component[n].code.text.toLowerCase().includes("diastolic")) {
                diastolic = j.entry[i].resource.component[n].valueQuantity.value;
              }
            }
          }
        }
      }
      if (systolic == undefined || diastolic == undefined){
        res.say("The patient has no temperature history").send();
      }
      else{
        res.say("The patients latest bloood pressure was " + systolic + " over " + diastolic).send();
      }
    }

    client.get("https://fhir-open.sandboxcerner.com/dstu2/d075cf8b-3261-481d-97e5-ba6c48d3b41f/Observation", args, callback);
    return false;
  }
);

/*app.intent('SayDOBIntent', {
  'utterances': ['What is the patients date of birth']
},
  function(req,res) {

        var client = new Client();
        var dateOfBirth;
        // set content-type header and data as json in args parameter 
        var args = {
            parameters: { _id: 1380008 },
            headers: { 'Accept': 'application/json+fhir' }
        };

        var callback = function(data,response) {
          console.log(JSON.parse(data.toString('ascii')).entry[0].resource.birthDate)
          dateOfBirth = JSON.parse(data.toString('ascii')).entry[0].resource.birthDate
          res.say("The patients date of birth is " + dateOfBirth.toString()).send();
        };

        client.get("https://fhir-open.sandboxcerner.com/dstu2/d075cf8b-3261-481d-97e5-ba6c48d3b41f/Patient", args, callback);

        return false;
  }
);*/

var deleteUser = function(userId,res) {
  databaseHelper.deleteScribeData(userId)
    .then(function(result) {
      res.say('Patient deleted.').send();
      return result;
    }).catch(function(error) {
      console.log(error);
    });

    return false;
};


app.intent('SelectNewPatientIntent', {
  'utterances': ['close patient']
},
  function(req,res) {
    deleteUser(req.userId, res);
    res.clearSession();

    var prompt = 'Patient closed. Please select a patient.';
    var reprompt = 'Please select a patient.';
    res.say(prompt).reprompt(reprompt).shouldEndSession(false).send();
  }
);

app.intent('SayPatientAllergies', {
  'utterances': ['What are the patients allergies']
},
  function(req,res) {

        var client = new Client();
        // set content-type header and data as json in args parameter

        if(req.session("phirid") === undefined){
          res.say('No patient selected. Select patient.').shouldEndSession(false);
          return;
        }

        var args = {
            parameters: { patient: req.session("phirid"), 'status': 'active'},
            headers: { 'Accept': 'application/json+fhir' }
        };

        console.log(args);
        var callback = function(data,response) {

          var results = JSON.parse(data.toString('ascii'));
          res.shouldEndSession(false);

          if (results.entry == undefined) {
            res.say("Patient has no known allergies").send();
          } else {
            var allergyList = "";
            for (var i = 0; i < results.entry.length; i++) {
                if (i == results.entry.length-2) {
                  allergyList = allergyList + results.entry[i].resource.substance.text + ", and ";
                } else {
                  allergyList = allergyList + results.entry[i].resource.substance.text + ", ";
                }
            }
            console.log(allergyList);
            res.say("The patients allergies are " + allergyList).send();
          }
        };

        client.get("https://fhir-open.sandboxcerner.com/dstu2/d075cf8b-3261-481d-97e5-ba6c48d3b41f/AllergyIntolerance", args, callback);

        return false;
  }
);


app.intent('AMAZON.CancelIntent', {
  'utterances': []
  },
  function(req,res) {
    res.say("Okay");
  }
);

app.intent('AMAZON.StopIntent', {
  'utterances': []
  },
  function(req,res) {
    res.say("Okay");
  }
);

//////////////database///////////////
// app.intent('saveUserIntent', {
//   'utterances': ['{save} {|a|the|my} cake']
// },
//   function(req,res) {
//     var createOut = databaseHelper.createScribeTable();
//     console.log('createOut' + createOut);

//     var data = {};
//     data['name'] = 'snehit';
//     data['dob'] = '11/12/21';
//     data['phirid'] = 'jh44554';
//     saveUser('1234567', data);
//     res.say('Your cake progress has been saved!');
//   }
// );


var saveUser = function(userId, scribeHelperData) {
  databaseHelper.storeScribeData(userId, scribeHelperData)
    .then(function(result) {
      return result;
    }).catch(function(error) {
      console.log(error);
    });
};

// app.intent('getData', {
//     'utterances': ['{load|resume} {|a|the} {|last} cake']
//   },
//   function(req, res) {    
//      readUser(req, res,'1234567', test);
//      return false;
//   }
// );



module.exports = app;


