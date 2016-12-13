# Scribe
## What it is?

   Scribe allows natural language voice recognition to physician. Using physician can pull and store patient information without
   any keyboard interaction.

## Why scribe?

   Everyone has had one experience from physician appointment that while physician talks to you about
   past visits or medical history they don't look at you at all. Physicians keep typing all the time while interacting with patient 
   which doesn't feel inclusive to patient.

   Using scribe physician can talk to device like Amazon Echo/Dot, Google Home to pull or store patient data as he/she talking to human.

   There are much more needs to be done in order to store audio interaction between patient and physician.

## How to get it working?

1. Go to project directory (`cd scribe`)
2. Do `npm install alexa-app-server --save` to install dependency for server.
3. Execute command `node server` to start a server.
4. Go to browser and execute this url `http://localhost:8080/alexa/helloworld` to test app.


## Example using Amazon Dot(Alexa)

```
Doctor : Hi Alexa, open scribe.

Alexa : Welcome to scribe, Adam. Please select patient.

Doctor : Select James Patterson.

Alexa : Patient James Patterson selected. Please confim date of birth.

Doctor : Patients date of birth is November ninteenth ninteen ninty one.

Alexa : Date of birth  November ninteenth ninteen ninty one confirmed. Ready for commands.

Doctor : Does patient have flu vaccine?

Alexa : Last time, patient took flu vaccine on January first two thousand fifteen.

Doctor : What is patient current blood pressure?

Alexa : Patient's current blood pressure is xyz and average of year is abc.

```